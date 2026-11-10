-- Demo data for first run.

INSERT INTO categories (name, description) VALUES
    ('Beverages',  'Soft drinks, juices and water'),
    ('Snacks',     'Chips, biscuits and candy'),
    ('Household',  'Cleaning and kitchen supplies'),
    ('Stationery', 'Office and school supplies');

INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES
    ('Prime Distributors', 'Ayesha Khan', '+92 300 1234567', 'sales@primedist.com',  'Lahore'),
    ('Global Foods',       'Bilal Ahmed', '+92 321 7654321', 'orders@globalfoods.pk', 'Karachi'),
    ('CleanPro Supplies',  'Sana Malik',  '+92 333 5551212', 'info@cleanpro.pk',      'Islamabad');

INSERT INTO products (sku, name, description, category_id, supplier_id, unit, cost_price, sell_price, stock_qty, reorder_level) VALUES
    ('BEV-001', 'Mineral Water 1.5L',      'Pack of 12 bottles',       1, 1, 'pack',  360.00, 480.00, 42, 10),
    ('BEV-002', 'Orange Juice 1L',         'Chilled, 100% juice',      1, 2, 'pcs',   190.00, 260.00, 18,  6),
    ('SNK-001', 'Potato Chips Salted',     'Family size 120g',         2, 2, 'pcs',    90.00, 120.00,  4, 10),
    ('SNK-002', 'Chocolate Biscuits',      'Pack of 6',                2, 2, 'pack',  140.00, 195.00, 25,  8),
    ('HH-001',  'Dishwash Liquid 500ml',   'Lemon scented',            3, 3, 'pcs',   240.00, 320.00, 30,  8),
    ('HH-002',  'Laundry Detergent 2kg',   'Machine and hand wash',    3, 3, 'pcs',   690.00, 850.00, 12,  4),
    ('STN-001', 'A4 Notebook 100 pages',   'Ruled, hard cover',        4, 1, 'pcs',   110.00, 150.00, 60, 15),
    ('STN-002', 'Ball Pen Blue (box)',     'Box of 12 pens',           4, 1, 'box',    95.00, 140.00,  2,  6);

INSERT INTO customers (name, phone, email, address) VALUES
    ('Walk-in Customer', NULL, NULL, NULL),
    ('Hamza Traders',    '+92 300 9988776', 'hamza@traders.pk', 'Faisalabad'),
    ('Nadia Store',      '+92 345 1122334', 'nadia@store.pk',   'Multan'),
    ('Ali Raza',         '+92 311 4455667', 'ali.raza@mail.pk', 'Rawalpindi');

INSERT INTO sales (invoice_no, customer_id, sale_date, subtotal, discount, tax_rate, tax_amount, total, payment_method, notes) VALUES
    ('INV-2026-0001', 1, datetime('now', '-3 days'), 1560.00, 60.00, 5.0,  75.00, 1575.00, 'Cash',          'Counter sale'),
    ('INV-2026-0002', 2, datetime('now', '-2 days'), 1500.00,  0.00, 0.0,   0.00, 1500.00, 'Card',          'Bulk stationery order'),
    ('INV-2026-0003', 3, datetime('now', '-1 day'),  2550.00, 50.00, 5.0, 125.00, 2625.00, 'Bank Transfer', 'Monthly household restock');

INSERT INTO sale_items (sale_id, product_id, product_name, sku, qty, unit_price, line_total) VALUES
    (1, 1, 'Mineral Water 1.5L',    'BEV-001',  2, 480.00,  960.00),
    (1, 3, 'Potato Chips Salted',   'SNK-001',  5, 120.00,  600.00),
    (2, 7, 'A4 Notebook 100 pages', 'STN-001', 10, 150.00, 1500.00),
    (3, 6, 'Laundry Detergent 2kg', 'HH-002',   3, 850.00, 2550.00);

INSERT INTO stock_movements (product_id, change_qty, reason, reference) VALUES
    (1, -2, 'Sale', 'INV-2026-0001'),
    (3, -5, 'Sale', 'INV-2026-0001'),
    (7, -10, 'Sale', 'INV-2026-0002'),
    (6, -3, 'Sale', 'INV-2026-0003');
