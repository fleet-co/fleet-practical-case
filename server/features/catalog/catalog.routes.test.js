const request = require("supertest");
const app = require("../../index");
const { db } = require("../../db");

afterAll(() => new Promise((resolve) => db.close(resolve)));

describe("Catalog API", () => {
  const ctx = {};

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/products")
      .send({ name: "Keyboard", description: "Mech", price: 89, category: "Peripherals", stock: 10 });
    ctx.productId = res.body.id;
  });

  it("POST /api/products — creates a product", () => {
    expect(ctx.productId).toBeDefined();
  });

  it("POST /api/products — rejects missing name", async () => {
    const res = await request(app)
      .post("/api/products")
      .send({ price: 10, category: "X" });
    expect(res.status).toBe(400);
  });

  it("POST /api/products — rejects invalid price", async () => {
    const res = await request(app)
      .post("/api/products")
      .send({ name: "Bad", category: "X", price: -5 });
    expect(res.status).toBe(400);
  });

  it("GET /api/products — lists products", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(res.body.some((p) => p.id === ctx.productId)).toBe(true);
  });

  it("GET /api/products/:id — gets a single product", async () => {
    const res = await request(app).get(`/api/products/${ctx.productId}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Keyboard");
  });

  it("PUT /api/products/:id — updates a product", async () => {
    const res = await request(app)
      .put(`/api/products/${ctx.productId}`)
      .send({ name: "Keyboard V2", description: "Updated", price: 99, category: "Peripherals", stock: 5 });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Keyboard V2");
  });

  it("GET /api/products/categories — lists categories", async () => {
    const res = await request(app).get("/api/products/categories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("DELETE /api/products/:id — deletes a product", async () => {
    const res = await request(app).delete(`/api/products/${ctx.productId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
