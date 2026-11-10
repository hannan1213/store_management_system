"""Integration tests for the Store Management System."""

import json
import os
import tempfile
import unittest

from app import create_app
from app.db import query, query_one


class StoreTestCase(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.app = create_app(
            {
                "TESTING": True,
                "SECRET_KEY": "test-secret",
                "DATABASE": os.path.join(self._tmp.name, "test.sqlite3"),
            }
        )
        self.client = self.app.test_client()

    def tearDown(self):
        self._tmp.cleanup()

    def db_one(self, sql, args=()):
        with self.app.app_context():
            return query_one(sql, args)

    def db_all(self, sql, args=()):
        with self.app.app_context():
            return query(sql, args)

    # Pages ------------------------------------------------------------------
    def test_dashboard_renders(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Dashboard", response.data)

    def test_every_page_renders(self):
        paths = [
            "/products/",
            "/products/new",
            "/products/1/edit",
            "/categories/",
            "/categories/new",
            "/suppliers/",
            "/customers/",
            "/sales/",
            "/sales/new",
            "/sales/1",
            "/reports/",
        ]
        for path in paths:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 200)

    def test_seeded_products_exist(self):
        response = self.client.get("/products/")
        self.assertIn(b"Mineral Water", response.data)

    # Products ---------------------------------------------------------------
    def test_create_product(self):
        response = self.client.post(
            "/products/new",
            data={
                "sku": "TST-001",
                "name": "Test Widget",
                "category_id": "1",
                "supplier_id": "1",
                "unit": "pcs",
                "cost_price": "100",
                "sell_price": "150",
                "stock_qty": "20",
                "reorder_level": "5",
                "description": "Created by the test suite",
            },
            follow_redirects=True,
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Product created", response.data)
        product = self.db_one("SELECT * FROM products WHERE sku = 'TST-001'")
        self.assertIsNotNone(product)
        self.assertEqual(product["stock_qty"], 20)
        self.assertEqual(product["sell_price"], 150)

    def test_create_product_requires_valid_prices(self):
        response = self.client.post(
            "/products/new",
            data={"sku": "TST-002", "name": "Bad Product", "sell_price": "0"},
            follow_redirects=True,
        )
        self.assertIn(b"Selling price must be greater than zero", response.data)
        self.assertIsNone(self.db_one("SELECT * FROM products WHERE sku = 'TST-002'"))

    def test_restock_increases_stock(self):
        response = self.client.post("/products/3/restock", data={"qty": "10"}, follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        product = self.db_one("SELECT stock_qty FROM products WHERE id = 3")
        self.assertEqual(product["stock_qty"], 14)

    def test_duplicate_sku_is_rejected(self):
        response = self.client.post(
            "/products/new",
            data={"sku": "BEV-001", "name": "Duplicate", "sell_price": "10", "stock_qty": "1"},
            follow_redirects=True,
        )
        self.assertIn(b"UNIQUE", response.data)

    # Sales ------------------------------------------------------------------
    def test_create_sale_reduces_stock_and_totals_correctly(self):
        before = self.db_one("SELECT stock_qty FROM products WHERE id = 1")["stock_qty"]
        payload = json.dumps([{"product_id": 1, "qty": 2, "unit_price": 480}])

        response = self.client.post(
            "/sales/new",
            data={
                "items": payload,
                "customer_id": "2",
                "payment_method": "Cash",
                "discount": "60",
                "tax_rate": "5",
                "notes": "test sale",
            },
            follow_redirects=True,
        )
        self.assertEqual(response.status_code, 200)

        sale = self.db_one("SELECT * FROM sales ORDER BY id DESC LIMIT 1")
        self.assertEqual(sale["subtotal"], 960)
        self.assertEqual(sale["tax_amount"], 45)
        self.assertEqual(sale["total"], 945)

        after = self.db_one("SELECT stock_qty FROM products WHERE id = 1")["stock_qty"]
        self.assertEqual(after, before - 2)

        movement = self.db_one(
            "SELECT * FROM stock_movements WHERE reference = ?", (sale["invoice_no"],)
        )
        self.assertEqual(movement["change_qty"], -2)

    def test_sale_rejects_quantity_above_stock(self):
        payload = json.dumps([{"product_id": 3, "qty": 999, "unit_price": 120}])
        before = self.db_one("SELECT stock_qty FROM products WHERE id = 3")["stock_qty"]

        response = self.client.post("/sales/new", data={"items": payload}, follow_redirects=True)
        self.assertIn(b"in stock", response.data)

        after = self.db_one("SELECT stock_qty FROM products WHERE id = 3")["stock_qty"]
        self.assertEqual(before, after)

    def test_sale_requires_items(self):
        response = self.client.post("/sales/new", data={"items": "[]"}, follow_redirects=True)
        self.assertIn(b"Add at least one product", response.data)

    # Generic CRUD -----------------------------------------------------------
    def test_category_crud_lifecycle(self):
        created = self.client.post(
            "/categories/new", data={"name": "Frozen", "description": "Freezer goods"},
            follow_redirects=True,
        )
        self.assertIn(b"Category added", created.data)

        category = self.db_one("SELECT * FROM categories WHERE name = 'Frozen'")
        self.assertIsNotNone(category)

        updated = self.client.post(
            f"/categories/{category['id']}/edit",
            data={"name": "Frozen Foods", "description": "Chilled and frozen"},
            follow_redirects=True,
        )
        self.assertIn(b"Category updated", updated.data)

        deleted = self.client.post(
            f"/categories/{category['id']}/delete", follow_redirects=True
        )
        self.assertIn(b"Category deleted", deleted.data)
        self.assertIsNone(self.db_one("SELECT * FROM categories WHERE id = ?", (category["id"],)))

    def test_customer_creation_requires_name(self):
        response = self.client.post("/customers/new", data={"name": ""}, follow_redirects=True)
        self.assertIn(b"Full name is required", response.data)

    # Reports ----------------------------------------------------------------
    def test_reports_page_contains_chart(self):
        response = self.client.get("/reports/")
        self.assertIn(b"Revenue", response.data)
        self.assertIn(b"Stock health", response.data)


if __name__ == "__main__":
    unittest.main()
