const request = require("supertest");
const app = require("../../index");
const { db } = require("../../db");

afterAll(() => new Promise((resolve) => db.close(resolve)));

describe("Employees API", () => {
  const ctx = {};

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/employees")
      .send({ name: "Test User", role: "QA" });
    ctx.employeeId = res.body.id;
  });

  it("POST /api/employees — creates an employee", () => {
    expect(ctx.employeeId).toBeDefined();
  });

  it("POST /api/employees — rejects missing fields", async () => {
    const res = await request(app)
      .post("/api/employees")
      .send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("GET /api/employees — lists employees", async () => {
    const res = await request(app).get("/api/employees");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((e) => e.id === ctx.employeeId)).toBe(true);
  });

  it("GET /api/employees/:id — gets a single employee", async () => {
    const res = await request(app).get(`/api/employees/${ctx.employeeId}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Test User");
  });

  it("GET /api/employees/:id — returns 404 for unknown id", async () => {
    const res = await request(app).get("/api/employees/99999");
    expect(res.status).toBe(404);
  });

  it("PUT /api/employees/:id — updates an employee", async () => {
    const res = await request(app)
      .put(`/api/employees/${ctx.employeeId}`)
      .send({ name: "Updated User", role: "Dev" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated User");
  });

  it("GET /api/employees/roles — lists distinct roles", async () => {
    const res = await request(app).get("/api/employees/roles");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("DELETE /api/employees/:id — deletes an employee", async () => {
    const res = await request(app).delete(`/api/employees/${ctx.employeeId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("DELETE /api/employees/:id — returns 404 after deletion", async () => {
    const res = await request(app).delete(`/api/employees/${ctx.employeeId}`);
    expect(res.status).toBe(404);
  });
});
