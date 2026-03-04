const request = require("supertest");
const { createTestApp, seed, get, all } = require("../testDb");

/**
 * Integration tests for the order API endpoints.
 *
 * Each test runs against an isolated in-memory SQLite database created once
 * per suite (beforeAll) and re-seeded before every test (beforeEach) so that
 * mutations in one test never affect another. Pre-seeded orders allow GET and
 * DELETE tests to run without depending on POST. The VARIANTS fixture includes
 * a low-stock entry (stock=1) specifically to verify that the CHECK constraint
 * causes a full transaction rollback when an order would push stock negative.
 */

const PRODUCTS = [
  { id: 1, name: "MacBook Pro", status: "active", base_price: 1500 },
  { id: 2, name: "LG Display", status: "active", base_price: 400 },
];

// Variant id=4 has stock=1 — used to trigger the CHECK (stock >= 0) rollback test
const VARIANTS = [
  { id: 1, product_id: 1, configuration: "M3 Pro / 18GB", sku: "MBP-M3P-18", price_delta: 200, stock: 5 },
  { id: 2, product_id: 1, configuration: "M3 Max / 36GB", sku: "MBP-M3M-36", price_delta: 800, stock: 3 },
  { id: 3, product_id: 2, configuration: "27 inch / 4K", sku: "LG27-4K", price_delta: 0, stock: 10 },
  { id: 4, product_id: 2, configuration: "32 inch / 4K", sku: "LG32-4K", price_delta: 100, stock: 1 },
];

const ORDERS = [
  { id: 1, total_amount: 1700, item_count: 1 },
  { id: 2, total_amount: 2700, item_count: 2 },
];

const ORDER_ITEMS = [
  {
    id: 1, order_id: 1, product_id: 1, product_variant_id: 1,
    product_name: "MacBook Pro", configuration: "M3 Pro / 18GB",
    sku: "MBP-M3P-18", unit_price: 1700, quantity: 1, line_total: 1700,
  },
  {
    id: 2, order_id: 2, product_id: 1, product_variant_id: 2,
    product_name: "MacBook Pro", configuration: "M3 Max / 36GB",
    sku: "MBP-M3M-36", unit_price: 2300, quantity: 1, line_total: 2300,
  },
  {
    id: 3, order_id: 2, product_id: 2, product_variant_id: 3,
    product_name: "LG Display", configuration: "27 inch / 4K",
    sku: "LG27-4K", unit_price: 400, quantity: 1, line_total: 400,
  },
];

let app, db;

beforeAll(async () => {
  ({ app, db } = await createTestApp());
});

beforeEach(async () => {
  await seed(db, {
    products: PRODUCTS,
    variants: VARIANTS,
    orders: ORDERS,
    orderItems: ORDER_ITEMS,
  });
});

afterAll(() => new Promise((resolve) => db.close(resolve)));

// ---------------------------------------------------------------------------
// GET /api/orders
// ---------------------------------------------------------------------------
describe("GET /api/orders", () => {
  test("returns all orders", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test("returns orders newest-first (descending by id)", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.body[0].id).toBe(2);
    expect(res.body[1].id).toBe(1);
  });

  test("each order has id, created_at, item_count, total_amount", async () => {
    const res = await request(app).get("/api/orders");
    const order = res.body[0];
    expect(order).toHaveProperty("id");
    expect(order).toHaveProperty("created_at");
    expect(order).toHaveProperty("item_count");
    expect(order).toHaveProperty("total_amount");
  });
});

// ---------------------------------------------------------------------------
// GET /api/orders/:id
// ---------------------------------------------------------------------------
describe("GET /api/orders/:id", () => {
  test("returns the order with its items array", async () => {
    const res = await request(app).get("/api/orders/1");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items).toHaveLength(1);
  });

  test("item contains all snapshot fields", async () => {
    const res = await request(app).get("/api/orders/1");
    const item = res.body.items[0];
    expect(item.product_name).toBe("MacBook Pro");
    expect(item.configuration).toBe("M3 Pro / 18GB");
    expect(item.sku).toBe("MBP-M3P-18");
    expect(item.unit_price).toBe(1700);
    expect(item.quantity).toBe(1);
    expect(item.line_total).toBe(1700);
  });

  test("multi-item order returns all line items", async () => {
    const res = await request(app).get("/api/orders/2");
    expect(res.body.items).toHaveLength(2);
  });

  test("returns 404 for a non-existent order id", async () => {
    const res = await request(app).get("/api/orders/999");
    expect(res.status).toBe(404);
  });

  test("returns 400 for a non-numeric id", async () => {
    const res = await request(app).get("/api/orders/abc");
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/orders
// ---------------------------------------------------------------------------
describe("POST /api/orders", () => {
  test("creates an order and returns 201 with the new order and items", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ items: [{ variantId: 1, quantity: 2 }] });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items).toHaveLength(1);
  });

  // variant 1: effective_price = 1500 + 200 = 1700; total = 1700 × 2 = 3400.
  test("computes total_amount correctly (sum of unit_price × quantity)", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ items: [{ variantId: 1, quantity: 2 }] });
    expect(res.body.total_amount).toBe(3400);
  });

  test("computes item_count correctly (sum of quantities)", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ items: [{ variantId: 1, quantity: 2 }, { variantId: 3, quantity: 3 }] });
    expect(res.body.item_count).toBe(5);
  });

  test("decrements stock for the ordered variant", async () => {
    const before = await get(db, "SELECT stock FROM product_variants WHERE id = 1");
    await request(app).post("/api/orders").send({ items: [{ variantId: 1, quantity: 2 }] });
    const after = await get(db, "SELECT stock FROM product_variants WHERE id = 1");
    expect(after.stock).toBe(before.stock - 2);
  });

  test("decrements stock for multiple variants in one order", async () => {
    const before1 = await get(db, "SELECT stock FROM product_variants WHERE id = 1");
    const before3 = await get(db, "SELECT stock FROM product_variants WHERE id = 3");

    await request(app)
      .post("/api/orders")
      .send({ items: [{ variantId: 1, quantity: 1 }, { variantId: 3, quantity: 2 }] });

    const after1 = await get(db, "SELECT stock FROM product_variants WHERE id = 1");
    const after3 = await get(db, "SELECT stock FROM product_variants WHERE id = 3");
    expect(after1.stock).toBe(before1.stock - 1);
    expect(after3.stock).toBe(before3.stock - 2);
  });

  // Creates an order, then renames the product — the stored product_name must remain unchanged.
  test("snapshots product_name at order time — later rename does not affect stored item", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ items: [{ variantId: 1, quantity: 1 }] });
    const orderId = res.body.id;

    await get(db, "UPDATE products SET name = 'Renamed Pro' WHERE id = 1");

    const orderRes = await request(app).get(`/api/orders/${orderId}`);
    expect(orderRes.body.items[0].product_name).toBe("MacBook Pro");
  });

  test("returns 400 when items array is empty", async () => {
    const res = await request(app).post("/api/orders").send({ items: [] });
    expect(res.status).toBe(400);
  });

  test("returns 400 when items field is missing", async () => {
    const res = await request(app).post("/api/orders").send({});
    expect(res.status).toBe(400);
  });

  test("returns 400 when variantId is not a valid number", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ items: [{ variantId: "abc", quantity: 1 }] });
    expect(res.status).toBe(400);
  });

  test("returns 400 when quantity is zero", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ items: [{ variantId: 1, quantity: 0 }] });
    expect(res.status).toBe(400);
  });

  test("returns 400 when quantity is negative", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ items: [{ variantId: 1, quantity: -1 }] });
    expect(res.status).toBe(400);
  });

  test("returns 400 when quantity is a float", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ items: [{ variantId: 1, quantity: 1.5 }] });
    expect(res.status).toBe(400);
  });

  test("returns 400 when variantId does not exist", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ items: [{ variantId: 999, quantity: 1 }] });
    expect(res.status).toBe(400);
  });

  // Variant id=4 has stock=1 — ordering 5 would push stock to -4, violating CHECK (stock >= 0).
  // The entire transaction must roll back: no order row and no stock change.
  test("rolls back the transaction when stock would go negative — no order is created and stock is unchanged", async () => {
    const ordersBefore = await all(db, "SELECT id FROM orders");
    const stockBefore = await get(db, "SELECT stock FROM product_variants WHERE id = 4");

    const res = await request(app)
      .post("/api/orders")
      .send({ items: [{ variantId: 4, quantity: 5 }] });

    expect(res.status).toBe(500);

    const ordersAfter = await all(db, "SELECT id FROM orders");
    expect(ordersAfter).toHaveLength(ordersBefore.length);

    const stockAfter = await get(db, "SELECT stock FROM product_variants WHERE id = 4");
    expect(stockAfter.stock).toBe(stockBefore.stock);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/orders/:id
// ---------------------------------------------------------------------------
describe("DELETE /api/orders/:id", () => {
  test("deletes the order and returns { success: true }", async () => {
    const res = await request(app).delete("/api/orders/1");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("deleted order no longer appears in GET /api/orders", async () => {
    await request(app).delete("/api/orders/1");
    const res = await request(app).get("/api/orders");
    expect(res.body.some((o) => o.id === 1)).toBe(false);
  });

  // The ON DELETE CASCADE on order_items removes all line items automatically.
  test("cascades — associated order_items are also deleted", async () => {
    await request(app).delete("/api/orders/1");
    const items = await all(db, "SELECT id FROM order_items WHERE order_id = 1");
    expect(items).toHaveLength(0);
  });

  test("returns 404 for a non-existent order id", async () => {
    const res = await request(app).delete("/api/orders/999");
    expect(res.status).toBe(404);
  });

  test("returns 400 for a non-numeric id", async () => {
    const res = await request(app).delete("/api/orders/abc");
    expect(res.status).toBe(400);
  });
});
