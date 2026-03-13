const request = require("supertest");
const app = require("../../index");
const { db } = require("../../db");

afterAll(() => new Promise((resolve) => db.close(resolve)));

describe("Devices API", () => {
  const ctx = {};

  beforeAll(async () => {
    const emp = await request(app)
      .post("/api/employees")
      .send({ name: "Device Owner", role: "Tester" });
    ctx.employeeId = emp.body.id;

    const res = await request(app)
      .post("/api/devices")
      .send({ name: "MacBook Pro", type: "Laptop", ownerId: ctx.employeeId });
    ctx.deviceId = res.body.id;
  });

  it("POST /api/devices — creates a device", () => {
    expect(ctx.deviceId).toBeDefined();
  });

  it("POST /api/devices — rejects missing fields", async () => {
    const res = await request(app)
      .post("/api/devices")
      .send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("POST /api/devices — rejects invalid owner", async () => {
    const res = await request(app)
      .post("/api/devices")
      .send({ name: "Phone", type: "Mobile", ownerId: 99999 });
    expect(res.status).toBe(400);
  });

  it("GET /api/devices — lists devices", async () => {
    const res = await request(app).get("/api/devices");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((d) => d.id === ctx.deviceId)).toBe(true);
  });

  it("PUT /api/devices/:id — updates a device", async () => {
    const res = await request(app)
      .put(`/api/devices/${ctx.deviceId}`)
      .send({ name: "MacBook Air", type: "Laptop", ownerId: ctx.employeeId });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("MacBook Air");
  });

  it("DELETE /api/devices/:id — deletes a device", async () => {
    const res = await request(app).delete(`/api/devices/${ctx.deviceId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("DELETE /api/devices/:id — returns 404 after deletion", async () => {
    const res = await request(app).delete(`/api/devices/${ctx.deviceId}`);
    expect(res.status).toBe(404);
  });
});
