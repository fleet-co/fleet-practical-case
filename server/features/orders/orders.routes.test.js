const request = require("supertest");
const app = require("../../index");
const { db } = require("../../db");

afterAll(() => new Promise((resolve) => db.close(resolve)));

describe("Cart & Orders API", () => {
  const ctx = {};

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/products")
      .send({ name: "Test Item", description: "For order test", price: 25, category: "Test", stock: 50 });
    ctx.productId = res.body.id;
  });

  it("GET /api/cart — returns empty cart initially", async () => {
    const res = await request(app).get("/api/cart");
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it("POST /api/cart — adds item to cart", async () => {
    const res = await request(app)
      .post("/api/cart")
      .send({ productId: ctx.productId, quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].quantity).toBe(2);
    expect(res.body.total).toBe(50);
  });

  it("POST /api/cart — rejects missing productId", async () => {
    const res = await request(app)
      .post("/api/cart")
      .send({ quantity: 1 });
    expect(res.status).toBe(400);
  });

  it("PUT /api/cart/:id — updates quantity", async () => {
    const cart = await request(app).get("/api/cart");
    const itemId = cart.body.items[0].id;

    const res = await request(app)
      .put(`/api/cart/${itemId}`)
      .send({ quantity: 3 });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(75);
  });

  it("POST /api/orders — creates order from cart", async () => {
    const res = await request(app).post("/api/orders");
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(75);
    expect(res.body.items.length).toBe(1);
    expect(res.body.status).toBe("pending");
  });

  it("POST /api/orders — rejects when cart is empty", async () => {
    const res = await request(app).post("/api/orders");
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Cart is empty");
  });

  it("GET /api/orders — lists orders", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/orders/:id — gets order with items", async () => {
    const orders = await request(app).get("/api/orders");
    const orderId = orders.body[0].id;

    const res = await request(app).get(`/api/orders/${orderId}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });
});
