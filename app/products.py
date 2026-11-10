"""Product catalogue, stock levels and restocking."""

from flask import Blueprint, flash, redirect, render_template, request, url_for

from .db import delete, execute, insert, query, query_one, update
from .crud import _read_form

bp = Blueprint("products", __name__, url_prefix="/products")


def product_fields() -> list[dict]:
    categories = [((row["id"]), row["name"]) for row in query("SELECT id, name FROM categories ORDER BY name")]
    suppliers = [(row["id"], row["name"]) for row in query("SELECT id, name FROM suppliers ORDER BY name")]
    return [
        {"key": "sku", "label": "SKU", "type": "text", "required": True},
        {"key": "name", "label": "Product name", "type": "text", "required": True},
        {"key": "category_id", "label": "Category", "type": "select", "options": categories},
        {"key": "supplier_id", "label": "Supplier", "type": "select", "options": suppliers},
        {"key": "unit", "label": "Unit", "type": "text"},
        {"key": "cost_price", "label": "Cost price", "type": "number", "step": "0.01"},
        {"key": "sell_price", "label": "Selling price", "type": "number", "step": "0.01"},
        {"key": "stock_qty", "label": "Stock quantity", "type": "number", "integer": True},
        {"key": "reorder_level", "label": "Reorder level", "type": "number", "integer": True},
        {"key": "description", "label": "Description", "type": "textarea"},
    ]


def _number(field: dict, raw: str):
    if raw in (None, ""):
        return 0
    value = float(raw)
    return int(value) if field.get("integer") else value


def _read_product_form() -> tuple[dict, list[str]]:
    fields = product_fields()
    data, errors = _read_form(fields)

    for field in fields:
        key = field["key"]
        if key not in data or data[key] is not None:
            continue
        if field["type"] == "number":
            try:
                data[key] = _number(field, request.form.get(key))
            except ValueError:
                errors.append(f"{field['label']} must be a number.")
        elif field["type"] == "select":
            data[key] = None
        elif key in ("unit",):
            data[key] = "pcs"

    if not data.get("sell_price"):
        errors.append("Selling price must be greater than zero.")
    return data, errors


@bp.route("/")
def index():
    term = request.args.get("q", "").strip()
    category_id = request.args.get("category", type=int)
    low_only = request.args.get("low") == "1"

    sql = """
        SELECT p.*, c.name AS category_name, s.name AS supplier_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN suppliers s ON s.id = p.supplier_id
        WHERE 1 = 1
    """
    args: list = []
    if term:
        sql += " AND (p.name LIKE ? OR p.sku LIKE ?)"
        args += [f"%{term}%", f"%{term}%"]
    if category_id:
        sql += " AND p.category_id = ?"
        args.append(category_id)
    if low_only:
        sql += " AND p.stock_qty <= p.reorder_level"
    sql += " ORDER BY p.name COLLATE NOCASE"

    products = query(sql, args)
    summary = query_one(
        """
        SELECT COUNT(*) AS total,
               COALESCE(SUM(stock_qty * cost_price), 0) AS inventory_value,
               COALESCE(SUM(CASE WHEN stock_qty <= reorder_level THEN 1 ELSE 0 END), 0) AS low_stock
        FROM products
        """
    )
    categories = query("SELECT id, name FROM categories ORDER BY name")

    return render_template(
        "products/list.html",
        products=products,
        summary=summary,
        categories=categories,
        q=term,
        category_id=category_id,
        low_only=low_only,
    )


@bp.route("/new", methods=("GET", "POST"))
def create():
    fields = product_fields()
    if request.method == "POST":
        data, errors = _read_product_form()
        if not errors:
            try:
                insert("products", data)
                flash("Product created.", "success")
                return redirect(url_for("products.index"))
            except Exception as exc:
                errors.append(f"Could not save product: {exc}")
        for message in errors:
            flash(message, "error")
        return render_template("crud/form.html", name="products", title="Products",
                               singular="Product", fields=fields, item=None)

    return render_template("crud/form.html", name="products", title="Products",
                           singular="Product", fields=fields, item=None)


@bp.route("/<int:product_id>/edit", methods=("GET", "POST"))
def edit(product_id: int):
    fields = product_fields()
    product = query_one("SELECT * FROM products WHERE id = ?", (product_id,))
    if product is None:
        flash("Product not found.", "error")
        return redirect(url_for("products.index"))

    if request.method == "POST":
        data, errors = _read_product_form()
        if not errors:
            try:
                update("products", product_id, data)
                flash("Product updated.", "success")
                return redirect(url_for("products.index"))
            except Exception as exc:
                errors.append(f"Could not save product: {exc}")
        for message in errors:
            flash(message, "error")
        return render_template("crud/form.html", name="products", title="Products",
                               singular="Product", fields=fields, item=product)

    return render_template("crud/form.html", name="products", title="Products",
                           singular="Product", fields=fields, item=product)


@bp.route("/<int:product_id>/restock", methods=("POST",))
def restock(product_id: int):
    product = query_one("SELECT * FROM products WHERE id = ?", (product_id,))
    if product is None:
        flash("Product not found.", "error")
        return redirect(url_for("products.index"))

    try:
        qty = int(request.form.get("qty", "0"))
    except ValueError:
        qty = 0

    if qty <= 0:
        flash("Restock quantity must be a positive whole number.", "error")
        return redirect(url_for("products.index"))

    execute("UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?", (qty, product_id))
    execute(
        "INSERT INTO stock_movements (product_id, change_qty, reason, reference) VALUES (?, ?, ?, ?)",
        (product_id, qty, "Restock", "Manual adjustment"),
    )
    flash(f"Added {qty} {product['unit']} to {product['name']}.", "success")
    return redirect(url_for("products.index"))


@bp.route("/<int:product_id>/delete", methods=("POST",))
def remove(product_id: int):
    used = query_one("SELECT COUNT(*) AS total FROM sale_items WHERE product_id = ?", (product_id,))
    if used and used["total"]:
        flash("Cannot delete a product that appears on existing sales.", "error")
        return redirect(url_for("products.index"))

    delete("products", product_id)
    flash("Product deleted.", "success")
    return redirect(url_for("products.index"))
