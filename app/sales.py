"""Sales, invoices and stock deduction."""

import json
from datetime import datetime

from flask import Blueprint, flash, redirect, render_template, request, url_for

from .db import get_db, query, query_one

bp = Blueprint("sales", __name__, url_prefix="/sales")

PAYMENT_METHODS = ["Cash", "Card", "Mobile Money", "Bank Transfer"]


@bp.route("/")
def index():
    term = request.args.get("q", "").strip()
    sql = """
        SELECT s.*, COALESCE(c.name, 'Walk-in') AS customer_name,
               (SELECT COALESCE(SUM(qty), 0) FROM sale_items WHERE sale_id = s.id) AS units
        FROM sales s
        LEFT JOIN customers c ON c.id = s.customer_id
    """
    args: list = []
    if term:
        sql += " WHERE s.invoice_no LIKE ? OR c.name LIKE ?"
        args += [f"%{term}%", f"%{term}%"]
    sql += " ORDER BY s.sale_date DESC, s.id DESC"

    totals = query_one(
        """
        SELECT COUNT(*) AS count,
               COALESCE(SUM(total), 0) AS revenue,
               COALESCE(AVG(total), 0) AS average
        FROM sales
        """
    )
    return render_template("sales/list.html", sales=query(sql, args), totals=totals, q=term)


@bp.route("/new", methods=("GET", "POST"))
def create():
    # Plain dicts keep the payload JSON-serialisable for the product picker.
    products = [
        dict(row)
        for row in query(
            "SELECT id, sku, name, sell_price, stock_qty, unit FROM products ORDER BY name COLLATE NOCASE"
        )
    ]
    customers = query("SELECT id, name FROM customers ORDER BY name COLLATE NOCASE")

    if request.method == "POST":
        errors: list[str] = []
        try:
            raw_items = json.loads(request.form.get("items") or "[]")
        except json.JSONDecodeError:
            raw_items = []
            errors.append("The sale items could not be read. Please try again.")

        if not raw_items:
            errors.append("Add at least one product to the sale.")

        cleaned: list[dict] = []
        for raw in raw_items:
            try:
                product = query_one("SELECT * FROM products WHERE id = ?", (int(raw["product_id"]),))
                qty = int(raw["qty"])
                unit_price = float(raw["unit_price"])
            except (KeyError, TypeError, ValueError):
                errors.append("A sale line has invalid product, quantity or price.")
                continue
            if product is None:
                errors.append("A selected product no longer exists.")
                continue
            if qty <= 0:
                errors.append(f"Quantity for {product['name']} must be greater than zero.")
                continue
            if unit_price < 0:
                errors.append(f"Price for {product['name']} cannot be negative.")
                continue
            if qty > product["stock_qty"]:
                errors.append(
                    f"Only {product['stock_qty']} {product['unit']} of {product['name']} in stock."
                )
                continue
            cleaned.append(
                {
                    "product": product,
                    "qty": qty,
                    "unit_price": unit_price,
                    "line_total": round(qty * unit_price, 2),
                }
            )

        try:
            discount = max(float(request.form.get("discount") or 0), 0)
            tax_rate = max(float(request.form.get("tax_rate") or 0), 0)
        except ValueError:
            discount = tax_rate = 0
            errors.append("Discount and tax must be numbers.")

        subtotal = round(sum(line["line_total"] for line in cleaned), 2)
        if discount > subtotal:
            errors.append("Discount cannot be greater than the subtotal.")
        taxable = max(subtotal - discount, 0)
        tax_amount = round(taxable * tax_rate / 100, 2)
        total = round(taxable + tax_amount, 2)

        if errors:
            for message in errors:
                flash(message, "error")
            return render_template(
                "sales/form.html",
                products=products,
                customers=customers,
                payment_methods=PAYMENT_METHODS,
                form=request.form,
            )

        customer_id = request.form.get("customer_id", type=int) or None
        payment_method = request.form.get("payment_method") or "Cash"
        notes = (request.form.get("notes") or "").strip() or None

        connection = get_db()
        try:
            next_id = connection.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM sales").fetchone()[0]
            invoice_no = f"INV-{datetime.now():%Y%m%d}-{next_id:04d}"
            cursor = connection.execute(
                """
                INSERT INTO sales (invoice_no, customer_id, sale_date, subtotal, discount,
                                   tax_rate, tax_amount, total, payment_method, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (invoice_no, customer_id, datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                 subtotal, discount, tax_rate, tax_amount, total, payment_method, notes),
            )
            sale_id = cursor.lastrowid

            for line in cleaned:
                product = line["product"]
                connection.execute(
                    """
                    INSERT INTO sale_items (sale_id, product_id, product_name, sku,
                                            qty, unit_price, line_total)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (sale_id, product["id"], product["name"], product["sku"],
                     line["qty"], line["unit_price"], line["line_total"]),
                )
                connection.execute(
                    "UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?",
                    (line["qty"], product["id"]),
                )
                connection.execute(
                    """
                    INSERT INTO stock_movements (product_id, change_qty, reason, reference)
                    VALUES (?, ?, 'Sale', ?)
                    """,
                    (product["id"], -line["qty"], invoice_no),
                )
            connection.commit()
        except Exception as exc:
            connection.rollback()
            flash(f"Could not record the sale: {exc}", "error")
            return render_template(
                "sales/form.html",
                products=products,
                customers=customers,
                payment_methods=PAYMENT_METHODS,
                form=request.form,
            )

        flash(f"Sale {invoice_no} recorded.", "success")
        return redirect(url_for("sales.detail", sale_id=sale_id))

    return render_template(
        "sales/form.html",
        products=products,
        customers=customers,
        payment_methods=PAYMENT_METHODS,
        form=None,
    )


@bp.route("/<int:sale_id>")
def detail(sale_id: int):
    sale = query_one(
        """
        SELECT s.*, COALESCE(c.name, 'Walk-in') AS customer_name,
               c.phone AS customer_phone, c.email AS customer_email
        FROM sales s
        LEFT JOIN customers c ON c.id = s.customer_id
        WHERE s.id = ?
        """,
        (sale_id,),
    )
    if sale is None:
        flash("Sale not found.", "error")
        return redirect(url_for("sales.index"))

    items = query("SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id", (sale_id,))
    movements = query(
        "SELECT * FROM stock_movements WHERE reference = ? ORDER BY id", (sale["invoice_no"],)
    )
    return render_template("sales/detail.html", sale=sale, items=items, movements=movements)
