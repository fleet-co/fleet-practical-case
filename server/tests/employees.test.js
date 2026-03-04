const request = require("supertest");
const { createTestApp, seed, get, all } = require("../testDb");

/**
 * Integration tests for the employee API endpoints.
 *
 * Each test runs against an isolated in-memory SQLite database created once
 * per suite (beforeAll) and re-seeded before every test (beforeEach) so that
 * mutations in one test never affect another. The DEVICES fixture is included
 * alongside EMPLOYEES to exercise the device_count join and the owner-unassign
 * behaviour on DELETE.
 */

// Fixtures — two Engineers and one Designer to exercise role-based filtering
const EMPLOYEES = [
  { id: 1, name: "Alice Martin", role: "Engineer" },
  { id: 2, name: "Bob Chen", role: "Designer" },
  { id: 3, name: "Carol Dupont", role: "Engineer" },
];

// Alice owns two devices, Bob owns none — used to verify device_count aggregation
const DEVICES = [
  { id: 1, name: "MacBook Pro", type: "Laptop", ownerId: 1 },
  { id: 2, name: "LG Display", type: "Display", ownerId: 1 },
  { id: 3, name: "Dell XPS", type: "Laptop", ownerId: null },
];

let app, db;

beforeAll(async () => {
  ({ app, db } = await createTestApp());
});

beforeEach(async () => {
  await seed(db, { employees: EMPLOYEES, devices: DEVICES });
});

afterAll(() => new Promise((resolve) => db.close(resolve)));

// ---------------------------------------------------------------------------
// GET /api/employees
// ---------------------------------------------------------------------------
describe("GET /api/employees", () => {
  test("returns all employees", async () => {
    const res = await request(app).get("/api/employees");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  // Alice (id=1) owns 2 devices; Bob (id=2) owns none.
  test("includes device_count for each employee", async () => {
    const res = await request(app).get("/api/employees");
    const alice = res.body.find((e) => e.id === 1);
    expect(alice.device_count).toBe(2);
    const bob = res.body.find((e) => e.id === 2);
    expect(bob.device_count).toBe(0);
  });

  test("filters by role query param", async () => {
    const res = await request(app).get("/api/employees?role=Engineer");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    res.body.forEach((e) => expect(e.role).toBe("Engineer"));
  });

  test("filters by search query param — matches name", async () => {
    const res = await request(app).get("/api/employees?search=alice");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Alice Martin");
  });

  test("filters by search query param — matches role", async () => {
    const res = await request(app).get("/api/employees?search=designer");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Bob Chen");
  });

  test("returns empty array when no employees match filter", async () => {
    const res = await request(app).get("/api/employees?role=NonExistentRole");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// GET /api/employees/:id
// ---------------------------------------------------------------------------
describe("GET /api/employees/:id", () => {
  test("returns the correct employee", async () => {
    const res = await request(app).get("/api/employees/1");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Alice Martin");
    expect(res.body.role).toBe("Engineer");
  });

  test("returns 404 for a non-existent id", async () => {
    const res = await request(app).get("/api/employees/999");
    expect(res.status).toBe(404);
  });

  test("returns 400 for a non-numeric id", async () => {
    const res = await request(app).get("/api/employees/abc");
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/employees
// ---------------------------------------------------------------------------
describe("POST /api/employees", () => {
  test("creates an employee and returns 201 with the new record", async () => {
    const res = await request(app)
      .post("/api/employees")
      .send({ name: "Dan Lee", role: "PM" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Dan Lee");
    expect(res.body.role).toBe("PM");
    expect(res.body.id).toBeDefined();
  });

  test("the created employee appears in subsequent GET", async () => {
    await request(app).post("/api/employees").send({ name: "Eve Park", role: "QA" });
    const res = await request(app).get("/api/employees");
    expect(res.body.some((e) => e.name === "Eve Park")).toBe(true);
  });

  test("returns 400 when name is missing", async () => {
    const res = await request(app).post("/api/employees").send({ role: "PM" });
    expect(res.status).toBe(400);
  });

  test("returns 400 when role is missing", async () => {
    const res = await request(app).post("/api/employees").send({ name: "Dan Lee" });
    expect(res.status).toBe(400);
  });

  test("returns 400 when body is empty", async () => {
    const res = await request(app).post("/api/employees").send({});
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/employees/:id
// ---------------------------------------------------------------------------
describe("PUT /api/employees/:id", () => {
  test("updates name and role, returns the updated record", async () => {
    const res = await request(app)
      .put("/api/employees/1")
      .send({ name: "Alice Leblanc", role: "Senior Engineer" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Alice Leblanc");
    expect(res.body.role).toBe("Senior Engineer");
  });

  test("update is persisted — subsequent GET reflects the change", async () => {
    await request(app).put("/api/employees/1").send({ name: "Alice Updated", role: "Lead" });
    const res = await request(app).get("/api/employees/1");
    expect(res.body.name).toBe("Alice Updated");
  });

  test("returns 404 for a non-existent id", async () => {
    const res = await request(app)
      .put("/api/employees/999")
      .send({ name: "Ghost", role: "None" });
    expect(res.status).toBe(404);
  });

  test("returns 400 when name is missing", async () => {
    const res = await request(app).put("/api/employees/1").send({ role: "Engineer" });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/employees/:id
// ---------------------------------------------------------------------------
describe("DELETE /api/employees/:id", () => {
  test("deletes the employee and returns { success: true }", async () => {
    const res = await request(app).delete("/api/employees/2");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("deleted employee no longer appears in GET", async () => {
    await request(app).delete("/api/employees/2");
    const res = await request(app).get("/api/employees");
    expect(res.body.some((e) => e.id === 2)).toBe(false);
  });

  // Alice (id=1) owns devices 1 and 2 — both should have owner_id set to NULL after deletion.
  test("unassigns the deleted employee's devices (owner_id set to NULL)", async () => {
    await request(app).delete("/api/employees/1");
    const device1 = await get(db, "SELECT owner_id FROM devices WHERE id = 1");
    const device2 = await get(db, "SELECT owner_id FROM devices WHERE id = 2");
    expect(device1.owner_id).toBeNull();
    expect(device2.owner_id).toBeNull();
  });

  test("returns 404 for a non-existent id", async () => {
    const res = await request(app).delete("/api/employees/999");
    expect(res.status).toBe(404);
  });

  test("returns 400 for a non-numeric id", async () => {
    const res = await request(app).delete("/api/employees/abc");
    expect(res.status).toBe(400);
  });
});
