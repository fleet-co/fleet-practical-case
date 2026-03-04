const sqlite3 = require("sqlite3").verbose();
const { createApp } = require("./app");

// Promisified db.run — resolves with `this` (for lastID / changes).
function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Promisified db.get.
function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Promisified db.all.
function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Creates an in-memory SQLite database, applies the schema via createApp,
// and waits for the schema to be fully applied before resolving.
// The returned app is ready for supertest; db is available for seeding.
async function createTestApp() {
  const db = await new Promise((resolve, reject) => {
    const d = new sqlite3.Database(":memory:", (err) => {
      if (err) reject(err);
      else resolve(d);
    });
  });

  const app = createApp(db);

  // createApp queues the schema via db.serialize. Any operation queued after
  // that block will execute after the schema is applied, since sqlite3
  // processes all operations on a connection in FIFO order.
  await run(db, "SELECT 1");

  return { app, db };
}

// Clears all tables (in dependency order respecting FK constraints) and
// inserts the given fixtures with explicit IDs so tests get predictable data.
async function seed(db, fixtures = {}) {
  const {
    employees = [],
    devices = [],
    products = [],
    variants = [],
    orders = [],
    orderItems = [],
  } = fixtures;

  await run(db, "DELETE FROM order_items");
  await run(db, "DELETE FROM orders");
  await run(db, "DELETE FROM product_variants");
  await run(db, "DELETE FROM products");
  await run(db, "DELETE FROM devices");
  await run(db, "DELETE FROM employees");

  for (const e of employees) {
    await run(db, "INSERT INTO employees (id, name, role) VALUES (?, ?, ?)", [
      e.id, e.name, e.role,
    ]);
  }
  for (const d of devices) {
    await run(
      db,
      "INSERT INTO devices (id, name, type, owner_id) VALUES (?, ?, ?, ?)",
      [d.id, d.name, d.type, d.ownerId ?? null],
    );
  }
  for (const p of products) {
    await run(
      db,
      "INSERT INTO products (id, name, status, base_price) VALUES (?, ?, ?, ?)",
      [p.id, p.name, p.status ?? "active", p.base_price ?? 0],
    );
  }
  for (const v of variants) {
    await run(
      db,
      "INSERT INTO product_variants (id, product_id, configuration, sku, price_delta, stock) VALUES (?, ?, ?, ?, ?, ?)",
      [v.id, v.product_id, v.configuration, v.sku, v.price_delta ?? 0, v.stock ?? 0],
    );
  }
  for (const o of orders) {
    await run(
      db,
      "INSERT INTO orders (id, total_amount, item_count) VALUES (?, ?, ?)",
      [o.id, o.total_amount, o.item_count],
    );
  }
  for (const oi of orderItems) {
    await run(
      db,
      `INSERT INTO order_items
        (id, order_id, product_id, product_variant_id, product_name, configuration, sku, unit_price, quantity, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        oi.id, oi.order_id, oi.product_id, oi.product_variant_id,
        oi.product_name, oi.configuration, oi.sku,
        oi.unit_price, oi.quantity, oi.line_total,
      ],
    );
  }
}

module.exports = { createTestApp, seed, run, get, all };
