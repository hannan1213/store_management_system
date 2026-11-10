# Store Management System

A small, self-hosted store back office built with **Flask** and **SQLite**. It tracks your
catalogue, stock levels, suppliers, customers and sales, and turns them into a live
dashboard and reports — no external services, no build step.

![Python](https://img.shields.io/badge/python-3.11%2B-blue)
![Flask](https://img.shields.io/badge/flask-3.1-black)
![SQLite](https://img.shields.io/badge/database-SQLite-003b57)

## Features

- **Dashboard** — revenue today and this month, inventory value, reorder alerts,
  recent invoices and best sellers.
- **Products** — searchable catalogue with SKU, cost/sell price, category, supplier,
  stock on hand and reorder level. One-click restocking writes a stock movement.
- **Sales** — multi-line invoices with per-line price overrides, discount, tax rate and
  payment method. Saving a sale validates stock, deducts inventory and records the
  movement inside a single transaction.
- **Customers, suppliers, categories** — full create/edit/delete with search.
- **Reports** — 14-day revenue chart, revenue by category, top 10 products, stock health
  with suggested order quantities.
- **Demo data** — a seeded catalogue, suppliers and sample invoices so the app is useful
  the moment it starts.

## Quick start (Windows)

```powershell
.\run.ps1
```

The script creates a `.venv`, installs dependencies and starts the server.
If PowerShell blocks the script, run it with:

```powershell
powershell -ExecutionPolicy Bypass -File .\run.ps1
```

## Quick start (any OS)

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

Then open <http://127.0.0.1:5000>.

The SQLite database lives in `instance/store.sqlite3` and is created (and seeded) on the
first run. Delete that file to start from scratch. It is git-ignored on purpose, so real
store data never lands in the repository.

## Project layout

```
app/
  __init__.py        Application factory, template filters
  db.py              SQLite connection plus query/insert helpers
  crud.py            Reusable list/form/delete blueprint for lookup tables
  dashboard.py       Summary page queries
  products.py        Catalogue, stock and restocking
  sales.py           Invoice creation, stock deduction, invoice detail
  reports.py         Aggregations for the reports page
  schema.sql         Tables and indexes
  seed.sql           Demo data for the first run
  templates/         Jinja templates (shared shell + per-section pages)
  static/            Stylesheet and sale-builder JavaScript
tests/test_app.py    Integration tests (unittest)
.github/workflows/   CI running the test suite on Python 3.11–3.13
```

## Data model

| Table | Purpose |
| --- | --- |
| `categories` | Product grouping |
| `suppliers` | Vendor contact details |
| `products` | SKU, pricing, stock qty, reorder level |
| `customers` | Buyer contact details |
| `sales` | Invoice header: subtotal, discount, tax, total, payment method |
| `sale_items` | Invoice lines with a snapshot of product name, SKU and price |
| `stock_movements` | Audit trail of every stock change (sales and restocks) |

Prices and totals are stored in the store's currency as plain numbers.

## Routes

| Route | Description |
| --- | --- |
| `/` | Dashboard |
| `/products/` | Catalogue, filters (`q`, `category`, `low`) |
| `/products/new`, `/products/<id>/edit` | Product form |
| `POST /products/<id>/restock` | Add stock |
| `/categories/`, `/suppliers/`, `/customers/` | CRUD lists |
| `/sales/` | Invoice list |
| `/sales/new` | Create an invoice (JavaScript required for the line-item builder) |
| `/sales/<id>` | Invoice detail with stock impact |
| `/reports/` | Revenue and stock reports |

## Tests

```bash
python -m unittest discover -s tests -v
```

The suite covers page rendering, product validation, duplicate SKUs, restocking, sale
totals, stock deduction, overselling protection and the CRUD lifecycle. Each test runs
against a throwaway database in a temporary directory.

## Notes and limitations

- Single-user and unauthenticated: run it on localhost or behind your own auth proxy.
- The invoice builder needs JavaScript; everything else is plain server-rendered HTML.
- No migrations tool — `schema.sql` is applied idempotently at startup. Add Alembic if the
  schema starts to evolve.
