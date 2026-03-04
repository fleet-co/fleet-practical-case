const request = require("supertest");
const { createTestApp, seed } = require("../testDb");

const PRODUCTS = [
  { id: 1, name: "MacBook Pro", status: "active", base_price: 1500 },
  { id: 2, name: "LG Display", status: "active", base_price: 400 },
  { id: 3, name: "Legacy Item", status: "inactive", base_price: 100 },
];

const VARIANTS = [
  { id: 1, product_id: 1, configuration: "M3 Pro / 18GB", sku: "MBP-M3P-18", price_delta: 200, stock: 5 },
  { id: 2, product_id: 1, configuration: "M3 Max / 36GB", sku: "MBP-M3M-36", price_delta: 800, stock: 3 },
  { id: 3, product_id: 2, configuration: "27 inch / 4K", sku: "LG27-4K", price_delta: 0, stock: 10 },
  { id: 4, product_id: 3, configuration: "Standard", sku: "LEG-STD", price_delta: 0, stock: 0 },
];

let app, db;

beforeAll(async () => {
  ({ app, db } = await createTestApp());
});

beforeEach(async () => {
  await seed(db, { products: PRODUCTS, variants: VARIANTS });
});

afterAll(() => new Promise((resolve) => db.close(resolve)));

// ---------------------------------------------------------------------------
// GET /api/catalog
// ---------------------------------------------------------------------------
describe("GET /api/catalog", () => {
  test("returns only active product variants by default", async () => {
    const res = await request(app).get("/api/catalog");
    expect(res.status).toBe(200);
    // 3 active variants (product 1 has 2, product 2 has 1; product 3 is inactive)
    expect(res.body).toHaveLength(3);
    res.body.forEach((item) => expect(item.status).toBe("active"));
  });

  test("inactive products are excluded from the default listing", async () => {
    const res = await request(app).get("/api/catalog");
    expect(res.body.some((item) => item.sku === "LEG-STD")).toBe(false);
  });

  test("?status=inactive returns only inactive variants", async () => {
    const res = await request(app).get("/api/catalog?status=inactive");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].sku).toBe("LEG-STD");
  });

  test("effective_price equals base_price + price_delta", async () => {
    const res = await request(app).get("/api/catalog");
    const mbpM3Pro = res.body.find((item) => item.sku === "MBP-M3P-18");
    expect(mbpM3Pro.effective_price).toBe(1500 + 200); // 1700
    const mbpM3Max = res.body.find((item) => item.sku === "MBP-M3M-36");
    expect(mbpM3Max.effective_price).toBe(1500 + 800); // 2300
    const lg = res.body.find((item) => item.sku === "LG27-4K");
    expect(lg.effective_price).toBe(400 + 0); // 400
  });

  test("filters by search — matches product name (case-insensitive)", async () => {
    const res = await request(app).get("/api/catalog?search=macbook");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    res.body.forEach((item) => expect(item.name).toBe("MacBook Pro"));
  });

  test("filters by search — matches configuration", async () => {
    const res = await request(app).get("/api/catalog?search=18gb");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].sku).toBe("MBP-M3P-18");
  });

  test("filters by search — matches SKU", async () => {
    const res = await request(app).get("/api/catalog?search=LG27");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].sku).toBe("LG27-4K");
  });

  test("returns expected fields on each row", async () => {
    const res = await request(app).get("/api/catalog");
    const item = res.body[0];
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("product_id");
    expect(item).toHaveProperty("name");
    expect(item).toHaveProperty("configuration");
    expect(item).toHaveProperty("sku");
    expect(item).toHaveProperty("stock");
    expect(item).toHaveProperty("effective_price");
  });
});

// ---------------------------------------------------------------------------
// GET /api/catalog/:id
// ---------------------------------------------------------------------------
describe("GET /api/catalog/:id", () => {
  test("returns the correct variant", async () => {
    const res = await request(app).get("/api/catalog/1");
    expect(res.status).toBe(200);
    expect(res.body.sku).toBe("MBP-M3P-18");
    expect(res.body.configuration).toBe("M3 Pro / 18GB");
  });

  test("effective_price is correct for the returned variant", async () => {
    const res = await request(app).get("/api/catalog/2");
    expect(res.body.effective_price).toBe(1500 + 800);
  });

  test("returns 404 for a non-existent variant id", async () => {
    const res = await request(app).get("/api/catalog/999");
    expect(res.status).toBe(404);
  });

  test("returns 400 for a non-numeric id", async () => {
    const res = await request(app).get("/api/catalog/abc");
    expect(res.status).toBe(400);
  });
});
