"""Reporting: daily revenue, category mix, best sellers and stock health."""

from datetime import date, timedelta

from flask import Blueprint, render_template

from .db import query, query_one

bp = Blueprint("reports", __name__, url_prefix="/reports")


@bp.route("/")
def index():
    days = 14
    start = date.today() - timedelta(days=days - 1)

    rows = query(
        """
        SELECT date(sale_date) AS day, SUM(total) AS revenue, COUNT(*) AS orders
        FROM sales
        WHERE date(sale_date) >= ?
        GROUP BY date(sale_date)
        """,
        (start.isoformat(),),
    )
    by_day = {row["day"]: row for row in rows}

    daily = []
    peak = 0.0
    for offset in range(days):
        day = start + timedelta(days=offset)
        row = by_day.get(day.isoformat())
        revenue = float(row["revenue"]) if row else 0.0
        peak = max(peak, revenue)
        daily.append(
            {
                "day": day,
                "label": day.strftime("%d %b"),
                "revenue": revenue,
                "orders": row["orders"] if row else 0,
            }
        )
    for entry in daily:
        entry["height"] = round((entry["revenue"] / peak) * 100, 1) if peak else 0.0

    category_mix = query(
        """
        SELECT COALESCE(c.name, 'Uncategorised') AS category,
               SUM(si.qty) AS units,
               SUM(si.line_total) AS revenue
        FROM sale_items si
        LEFT JOIN products p ON p.id = si.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        GROUP BY c.id
        ORDER BY revenue DESC
        """
    )
    category_peak = max((float(row["revenue"]) for row in category_mix), default=0.0)
    categories = [
        {
            "category": row["category"],
            "units": row["units"],
            "revenue": float(row["revenue"]),
            "share": round(float(row["revenue"]) / category_peak * 100, 1) if category_peak else 0.0,
        }
        for row in category_mix
    ]

    best_sellers = query(
        """
        SELECT product_name, sku, SUM(qty) AS units, SUM(line_total) AS revenue
        FROM sale_items
        GROUP BY product_name, sku
        ORDER BY units DESC
        LIMIT 10
        """
    )

    low_stock = query(
        """
        SELECT p.*, COALESCE(c.name, 'Uncategorised') AS category_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.stock_qty <= p.reorder_level
        ORDER BY p.stock_qty ASC, p.name
        """
    )

    summary = query_one(
        """
        SELECT (SELECT COALESCE(SUM(total), 0) FROM sales)                          AS lifetime_revenue,
               (SELECT COUNT(*) FROM sales)                                          AS orders,
               (SELECT COALESCE(SUM(stock_qty * cost_price), 0) FROM products)        AS inventory_cost,
               (SELECT COALESCE(SUM(stock_qty * sell_price), 0) FROM products)        AS inventory_retail
        """
    )

    return render_template(
        "reports.html",
        daily=daily,
        peak=peak,
        categories=categories,
        best_sellers=best_sellers,
        low_stock=low_stock,
        summary=summary,
    )
