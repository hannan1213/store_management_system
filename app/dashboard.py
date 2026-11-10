"""Dashboard summary page."""

from flask import Blueprint, render_template

from .db import query, query_one

bp = Blueprint("dashboard", __name__)


@bp.route("/")
def index():
    stats = query_one(
        """
        SELECT
            (SELECT COUNT(*) FROM products)                                   AS product_count,
            (SELECT COUNT(*) FROM customers)                                  AS customer_count,
            (SELECT COUNT(*) FROM products
               WHERE stock_qty <= reorder_level)                              AS low_stock_count,
            (SELECT COUNT(*) FROM products WHERE stock_qty = 0)               AS out_of_stock_count,
            (SELECT COALESCE(SUM(stock_qty * cost_price), 0) FROM products)   AS inventory_value,
            (SELECT COALESCE(SUM(total), 0) FROM sales
               WHERE date(sale_date) = date('now', 'localtime'))              AS revenue_today,
            (SELECT COALESCE(SUM(total), 0) FROM sales
               WHERE strftime('%Y-%m', sale_date) = strftime('%Y-%m', 'now'))  AS revenue_month,
            (SELECT COUNT(*) FROM sales)                                      AS sale_count
        """
    )

    recent_sales = query(
        """
        SELECT s.id, s.invoice_no, s.sale_date, s.total, s.payment_method,
               COALESCE(c.name, 'Walk-in') AS customer_name
        FROM sales s
        LEFT JOIN customers c ON c.id = s.customer_id
        ORDER BY s.sale_date DESC, s.id DESC
        LIMIT 8
        """
    )

    low_stock = query(
        """
        SELECT p.id, p.sku, p.name, p.stock_qty, p.reorder_level, p.unit,
               COALESCE(c.name, 'Uncategorised') AS category_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.stock_qty <= p.reorder_level
        ORDER BY (p.stock_qty * 1.0) / MAX(p.reorder_level, 1), p.name
        LIMIT 8
        """
    )

    top_products = query(
        """
        SELECT product_name, SUM(qty) AS units, SUM(line_total) AS revenue
        FROM sale_items
        GROUP BY product_name
        ORDER BY units DESC
        LIMIT 5
        """
    )

    return render_template(
        "dashboard.html",
        stats=stats,
        recent_sales=recent_sales,
        low_stock=low_stock,
        top_products=top_products,
    )
