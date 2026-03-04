const request = require("supertest");
const { createTestApp, seed, get } = require("../testDb");

/**
 * Integration tests for the device API endpoints.
 *
 * Each test runs against an isolated in-memory SQLite database created once
 * per suite (beforeAll) and re-seeded before every test (beforeEach) so that
 * mutations in one test never affect another. The EMPLOYEES fixture is included
 * alongside DEVICES to exercise owner validation on POST/PUT and the owner_name
 * join on responses.
 */

// Two employees used as owners in the device fixture
const EMPLOYEES = [
  { id: 1, name: "Alice Martin", role: "Engineer" },
  { id: 2, name: "Bob Chen", role: "Designer" },
];

// Mix of owned and unowned devices across multiple types for filter coverage
const DEVICES = [
  { id: 1, name: "MacBook Pro 14", type: "Laptop", ownerId: 1 },
  { id: 2, name: "Dell XPS 15", type: "Laptop", ownerId: null },
  { id: 3, name: "LG 27 4K", type: "Display", ownerId: 2 },
  { id: 4, name: "iPhone 15 Pro", type: "Mobile", ownerId: null },
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
// GET /api/devices
// ---------------------------------------------------------------------------
describe("GET /api/devices", () => {
  test("returns all devices", async () => {
    const res = await request(app).get("/api/devices");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
  });

  test("filters by type query param", async () => {
    const res = await request(app).get("/api/devices?type=Laptop");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    res.body.forEach((d) => expect(d.type).toBe("Laptop"));
  });

  test("filters by ownerId query param", async () => {
    const res = await request(app).get("/api/devices?ownerId=1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("MacBook Pro 14");
  });

  test("filters by search query param — matches name", async () => {
    const res = await request(app).get("/api/devices?search=macbook");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("MacBook Pro 14");
  });

  test("filters by search query param — matches type", async () => {
    const res = await request(app).get("/api/devices?search=display");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("LG 27 4K");
  });

  test("returns empty array when no devices match filter", async () => {
    const res = await request(app).get("/api/devices?type=Tablet");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// POST /api/devices
// ---------------------------------------------------------------------------
describe("POST /api/devices", () => {
  test("creates an unassigned device and returns 201", async () => {
    const res = await request(app)
      .post("/api/devices")
      .send({ name: "Magic Keyboard", type: "Peripheral" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Magic Keyboard");
    expect(res.body.type).toBe("Peripheral");
    expect(res.body.owner_id).toBeNull();
  });

  test("creates a device assigned to a valid employee, returns owner_name", async () => {
    const res = await request(app)
      .post("/api/devices")
      .send({ name: "AirPods Pro", type: "Peripheral", ownerId: 1 });
    expect(res.status).toBe(201);
    expect(res.body.owner_id).toBe(1);
    expect(res.body.owner_name).toBe("Alice Martin");
  });

  test("returns 400 when ownerId references a non-existent employee", async () => {
    const res = await request(app)
      .post("/api/devices")
      .send({ name: "Mystery Device", type: "Laptop", ownerId: 999 });
    expect(res.status).toBe(400);
  });

  test("returns 400 when name is missing", async () => {
    const res = await request(app).post("/api/devices").send({ type: "Laptop" });
    expect(res.status).toBe(400);
  });

  test("returns 400 when type is missing", async () => {
    const res = await request(app).post("/api/devices").send({ name: "No Type" });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/devices/:id
// ---------------------------------------------------------------------------
describe("PUT /api/devices/:id", () => {
  test("updates name, type, and owner", async () => {
    const res = await request(app)
      .put("/api/devices/2")
      .send({ name: "Dell XPS 17", type: "Laptop", ownerId: 1 });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Dell XPS 17");
    expect(res.body.owner_id).toBe(1);
    expect(res.body.owner_name).toBe("Alice Martin");
  });

  // Device id=1 is currently owned by Alice — sending ownerId: null should clear the assignment.
  test("unassigns a device when ownerId is null", async () => {
    const res = await request(app)
      .put("/api/devices/1")
      .send({ name: "MacBook Pro 14", type: "Laptop", ownerId: null });
    expect(res.status).toBe(200);
    expect(res.body.owner_id).toBeNull();
  });

  test("returns 404 for a non-existent device id", async () => {
    const res = await request(app)
      .put("/api/devices/999")
      .send({ name: "Ghost", type: "Laptop" });
    expect(res.status).toBe(404);
  });

  test("returns 400 when name is missing", async () => {
    const res = await request(app).put("/api/devices/1").send({ type: "Laptop" });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/devices/:id
// ---------------------------------------------------------------------------
describe("DELETE /api/devices/:id", () => {
  test("deletes the device and returns { success: true }", async () => {
    const res = await request(app).delete("/api/devices/1");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("deleted device no longer appears in GET", async () => {
    await request(app).delete("/api/devices/1");
    const res = await request(app).get("/api/devices");
    expect(res.body.some((d) => d.id === 1)).toBe(false);
  });

  test("returns 404 for a non-existent id", async () => {
    const res = await request(app).delete("/api/devices/999");
    expect(res.status).toBe(404);
  });

  test("returns 400 for a non-numeric id", async () => {
    const res = await request(app).delete("/api/devices/abc");
    expect(res.status).toBe(400);
  });
});
