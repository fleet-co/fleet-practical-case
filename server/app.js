const express = require("express");
const cors = require("cors");

/**
 * Creates and configures the Express application.
 *
 * Accepts a SQLite database connection as its only argument so the same route
 * logic can be used in both production (fleet.sqlite) and tests (in-memory DB)
 * without any mocking. On startup the function runs all CREATE TABLE IF NOT EXISTS
 * statements inside a serialize block to ensure the schema is ready before any
 * request is handled. Every route follows the same pattern: validate inputs, run
 * the minimum number of database queries, and return a consistent JSON shape —
 * either the created/updated resource or { success: true } for deletes.
 *
 * @param {import("sqlite3").Database} db - An open SQLite3 database connection.
 * @returns {import("express").Application}
 */
function createApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Run all schema migrations inside serialize so they execute in order
  // and complete before the first request can reach any route handler
  db.serialize(() => {
    // SQLite does not enforce foreign key constraints by default — this enables them for this connection
    db.run("PRAGMA foreign_keys = ON");

    db.run(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        owner_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES employees(id) ON DELETE SET NULL
      )
    `);

    // Legacy flat catalog — kept for data preservation, no longer used by the API
    db.run(`
      CREATE TABLE IF NOT EXISTS catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity >= 0),
        net_unit_price REAL NOT NULL DEFAULT 0 CHECK (net_unit_price >= 0)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        base_price REAL NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        configuration TEXT NOT NULL,
        sku TEXT NOT NULL UNIQUE,
        price_delta REAL NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total_amount REAL NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
        item_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_variant_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        configuration TEXT NOT NULL,
        sku TEXT NOT NULL,
        unit_price REAL NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        line_total REAL NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);
  });

  app.get("/api/health", (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  /**
   * GET /api/employees
   * Returns all employees with a device_count aggregate, optionally filtered
   * by role (exact match) and/or a search term (case-insensitive name or role).
   */
  app.get("/api/employees", (req, res) => {
    const role = req.query.role || "";
    const search = req.query.search || "";
    let sql = `
      SELECT
        e.id,
        e.name,
        e.role,
        e.created_at,
        COUNT(d.id) AS device_count
      FROM employees e
      LEFT JOIN devices d ON d.owner_id = e.id
      WHERE 1 = 1
    `;
    const params = [];

    if (role) {
      sql += " AND e.role = ?";
      params.push(role);
    }

    if (search) {
      sql += " AND (LOWER(e.name) LIKE ? OR LOWER(e.role) LIKE ?)";
      params.push(`%${search.toLowerCase()}%`);
      params.push(`%${search.toLowerCase()}%`);
    }

    sql += " GROUP BY e.id ORDER BY e.id DESC";

    db.all(sql, params, (err, rows) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Failed to fetch employees", detail: err.message });
      }
      res.json(rows);
    });
  });

  /**
   * GET /api/employees/:id
   * Returns a single employee by ID. Responds 404 if not found.
   */
  app.get("/api/employees/:id", (req, res) => {
    const employeeId = Number(req.params.id);
    if (!employeeId) {
      return res.status(400).json({ message: "Invalid employee id" });
    }

    db.get(
      "SELECT id, name, role, created_at FROM employees WHERE id = ?",
      [employeeId],
      (err, row) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Failed to fetch employee", detail: err.message });
        }
        if (!row) {
          return res.status(404).json({ message: "Employee not found" });
        }
        return res.json(row);
      },
    );
  });

  /**
   * POST /api/employees
   * Creates a new employee. Requires name and role in the request body.
   * Responds 201 with the created record fetched back from the database.
   */
  app.post("/api/employees", (req, res) => {
    const payload = req.body || {};
    const name = (payload.name || "").toString().trim();
    const role = (payload.role || "").toString().trim();

    if (!name || !role) {
      return res.status(400).json({ message: "Both name and role are required" });
    }

    db.run(
      "INSERT INTO employees (name, role) VALUES (?, ?)",
      [name, role],
      function onInsert(err) {
        if (err) {
          return res
            .status(500)
            .json({ message: "Failed to create employee", detail: err.message });
        }

        // Re-fetch the created row so the response includes generated fields (id, created_at)
        db.get(
          "SELECT id, name, role, created_at FROM employees WHERE id = ?",
          [this.lastID],
          (fetchErr, row) => {
            if (fetchErr) {
              return res
                .status(500)
                .json({ message: "Created employee but failed to fetch it" });
            }
            res.status(201).json(row);
          },
        );
      },
    );
  });

  /**
   * PUT /api/employees/:id
   * Updates name and role for an existing employee. Responds 404 if not found.
   * Re-fetches and returns the updated record after a successful write.
   */
  app.put("/api/employees/:id", (req, res) => {
    const employeeId = Number(req.params.id);
    const payload = req.body || {};
    const name = (payload.name || "").toString().trim();
    const role = (payload.role || "").toString().trim();

    if (!employeeId) {
      return res.status(400).json({ message: "Invalid employee id" });
    }
    if (!name || !role) {
      return res.status(400).json({ message: "Both name and role are required" });
    }

    db.run(
      "UPDATE employees SET name = ?, role = ? WHERE id = ?",
      [name, role, employeeId],
      function onUpdate(err) {
        if (err) {
          return res
            .status(500)
            .json({ message: "Failed to update employee", detail: err.message });
        }

        // this.changes === 0 means no row matched the WHERE clause
        if (this.changes === 0) {
          return res.status(404).json({ message: "Employee not found" });
        }

        db.get(
          "SELECT id, name, role, created_at FROM employees WHERE id = ?",
          [employeeId],
          (fetchErr, row) => {
            if (fetchErr) {
              return res
                .status(500)
                .json({ message: "Employee updated but fetch failed" });
            }
            res.json(row);
          },
        );
      },
    );
  });

  /**
   * DELETE /api/employees/:id
   * Deletes an employee. Devices owned by that employee are unassigned first
   * (owner_id set to NULL) because the FK is ON DELETE SET NULL — the explicit
   * UPDATE here makes the intent clear and handles any edge cases. Responds 404
   * if the employee does not exist.
   */
  app.delete("/api/employees/:id", (req, res) => {
    const employeeId = Number(req.params.id);
    if (!employeeId) {
      return res.status(400).json({ message: "Invalid employee id" });
    }

    db.serialize(() => {
      // Unassign devices before deleting so no device is left with a dangling owner_id
      db.run(
        "UPDATE devices SET owner_id = NULL WHERE owner_id = ?",
        [employeeId],
        (unassignErr) => {
          if (unassignErr) {
            return res
              .status(500)
              .json({ message: "Failed to unassign employee devices" });
          }

          db.run(
            "DELETE FROM employees WHERE id = ?",
            [employeeId],
            function onDelete(err) {
              if (err) {
                return res.status(500).json({
                  message: "Failed to delete employee",
                  detail: err.message,
                });
              }

              if (this.changes === 0) {
                return res.status(404).json({ message: "Employee not found" });
              }

              res.json({ success: true });
            },
          );
        },
      );
    });
  });

  /**
   * GET /api/devices
   * Returns all devices, optionally filtered by type (exact), ownerId (exact),
   * and/or a search term (case-insensitive name or type match).
   */
  app.get("/api/devices", (req, res) => {
    const type = req.query.type || "";
    const ownerId = req.query.ownerId || "";
    const search = req.query.search || "";

    let sql = `
      SELECT
        d.id,
        d.name,
        d.type,
        d.owner_id,
        d.created_at
      FROM devices d
      WHERE 1 = 1
    `;
    const params = [];

    if (type) {
      sql += " AND d.type = ?";
      params.push(type);
    }

    if (ownerId) {
      sql += " AND d.owner_id = ?";
      params.push(ownerId);
    }

    if (search) {
      sql += " AND (LOWER(d.name) LIKE ? OR LOWER(d.type) LIKE ?)";
      params.push(`%${search.toLowerCase()}%`);
      params.push(`%${search.toLowerCase()}%`);
    }

    sql += " ORDER BY d.id DESC";

    db.all(sql, params, (err, rows) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Failed to fetch devices", detail: err.message });
      }
      res.json(rows);
    });
  });

  /**
   * POST /api/devices
   * Creates a new device. If ownerId is provided, it is validated against the
   * employees table before inserting. The response includes the joined owner_name.
   */
  app.post("/api/devices", (req, res) => {
    const payload = req.body || {};
    const name = (payload.name || "").toString().trim();
    const type = (payload.type || "").toString().trim();
    const ownerId = payload.ownerId ? Number(payload.ownerId) : null;

    if (!name || !type) {
      return res.status(400).json({ message: "Both name and type are required" });
    }

    const insertRecord = () => {
      db.run(
        "INSERT INTO devices (name, type, owner_id) VALUES (?, ?, ?)",
        [name, type, ownerId],
        function onInsert(err) {
          if (err) {
            return res
              .status(500)
              .json({ message: "Failed to create device", detail: err.message });
          }

          // Re-fetch with a join so the response includes owner_name alongside owner_id
          db.get(
            `
            SELECT
              d.id,
              d.name,
              d.type,
              d.owner_id,
              d.created_at,
              e.name AS owner_name
            FROM devices d
            LEFT JOIN employees e ON e.id = d.owner_id
            WHERE d.id = ?
            `,
            [this.lastID],
            (fetchErr, row) => {
              if (fetchErr) {
                return res
                  .status(500)
                  .json({ message: "Created device but failed to fetch it" });
              }
              res.status(201).json(row);
            },
          );
        },
      );
    };

    if (!ownerId) {
      return insertRecord();
    }

    // Validate that the referenced employee exists before inserting
    db.get(
      "SELECT id FROM employees WHERE id = ?",
      [ownerId],
      (ownerErr, ownerRow) => {
        if (ownerErr) {
          return res.status(500).json({
            message: "Failed to validate owner",
            detail: ownerErr.message,
          });
        }
        if (!ownerRow) {
          return res
            .status(400)
            .json({ message: "Owner employee does not exist" });
        }
        insertRecord();
      },
    );
  });

  /**
   * PUT /api/devices/:id
   * Updates name, type, and owner for an existing device. If ownerId is provided,
   * it is validated against the employees table before updating. Responds 404 if
   * the device does not exist. The response includes the joined owner_name.
   */
  app.put("/api/devices/:id", (req, res) => {
    const deviceId = Number(req.params.id);
    const payload = req.body || {};
    const name = (payload.name || "").toString().trim();
    const type = (payload.type || "").toString().trim();
    const ownerId = payload.ownerId ? Number(payload.ownerId) : null;

    if (!deviceId) {
      return res.status(400).json({ message: "Invalid device id" });
    }
    if (!name || !type) {
      return res.status(400).json({ message: "Both name and type are required" });
    }

    const updateRecord = () => {
      db.run(
        "UPDATE devices SET name = ?, type = ?, owner_id = ? WHERE id = ?",
        [name, type, ownerId, deviceId],
        function onUpdate(err) {
          if (err) {
            return res
              .status(500)
              .json({ message: "Failed to update device", detail: err.message });
          }

          if (this.changes === 0) {
            return res.status(404).json({ message: "Device not found" });
          }

          // Re-fetch with a join so the response includes owner_name alongside owner_id
          db.get(
            `
            SELECT
              d.id,
              d.name,
              d.type,
              d.owner_id,
              d.created_at,
              e.name AS owner_name
            FROM devices d
            LEFT JOIN employees e ON e.id = d.owner_id
            WHERE d.id = ?
            `,
            [deviceId],
            (fetchErr, row) => {
              if (fetchErr) {
                return res
                  .status(500)
                  .json({ message: "Device updated but fetch failed" });
              }
              res.json(row);
            },
          );
        },
      );
    };

    if (!ownerId) {
      return updateRecord();
    }

    // Validate that the referenced employee exists before updating
    db.get(
      "SELECT id FROM employees WHERE id = ?",
      [ownerId],
      (ownerErr, ownerRow) => {
        if (ownerErr) {
          return res.status(500).json({
            message: "Failed to validate owner",
            detail: ownerErr.message,
          });
        }
        if (!ownerRow) {
          return res
            .status(400)
            .json({ message: "Owner employee does not exist" });
        }
        updateRecord();
      },
    );
  });

  /**
   * DELETE /api/devices/:id
   * Deletes a device. Responds 404 if not found, { success: true } otherwise.
   */
  app.delete("/api/devices/:id", (req, res) => {
    const deviceId = Number(req.params.id);
    if (!deviceId) {
      return res.status(400).json({ message: "Invalid device id" });
    }

    db.run(
      "DELETE FROM devices WHERE id = ?",
      [deviceId],
      function onDelete(err) {
        if (err) {
          return res
            .status(500)
            .json({ message: "Failed to delete device", detail: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ message: "Device not found" });
        }
        res.json({ success: true });
      },
    );
  });

  /**
   * GET /api/catalog
   * Returns all product variants as a flat browsable catalog. Each row is one
   * orderable variant with its parent product info joined in. The effective_price
   * is computed as base_price + price_delta. Filterable by product status (defaults
   * to "active") and a search term (name, configuration, or SKU).
   */
  app.get("/api/catalog", (req, res) => {
    const status = req.query.status || "active";
    const search = req.query.search || "";

    let sql = `
      SELECT
        pv.id,
        p.id          AS product_id,
        p.name,
        p.status,
        pv.configuration,
        pv.sku,
        pv.stock,
        (p.base_price + pv.price_delta) AS effective_price
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE 1 = 1
    `;
    const params = [];

    if (status) {
      sql += " AND p.status = ?";
      params.push(status);
    }

    if (search) {
      sql += " AND (LOWER(p.name) LIKE ? OR LOWER(pv.configuration) LIKE ? OR LOWER(pv.sku) LIKE ?)";
      params.push(`%${search.toLowerCase()}%`);
      params.push(`%${search.toLowerCase()}%`);
      params.push(`%${search.toLowerCase()}%`);
    }

    sql += " ORDER BY p.id ASC, pv.id ASC";

    db.all(sql, params, (err, rows) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Failed to fetch catalog", detail: err.message });
      }
      res.json(rows);
    });
  });

  /**
   * GET /api/catalog/:id
   * Returns a single variant by its ID in the same shape as the list endpoint.
   * Responds 404 if the variant does not exist.
   */
  app.get("/api/catalog/:id", (req, res) => {
    const variantId = Number(req.params.id);
    if (!variantId) {
      return res.status(400).json({ message: "Invalid catalog id" });
    }

    db.get(
      `SELECT
        pv.id,
        p.id          AS product_id,
        p.name,
        p.status,
        pv.configuration,
        pv.sku,
        pv.stock,
        (p.base_price + pv.price_delta) AS effective_price
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = ?`,
      [variantId],
      (err, row) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Failed to fetch catalog item", detail: err.message });
        }
        if (!row) {
          return res.status(404).json({ message: "Catalog item not found" });
        }
        res.json(row);
      },
    );
  });

  /**
   * GET /api/orders
   * Returns all orders newest-first. total_amount and item_count are stored
   * directly on the orders row (denormalized at insert time) so no join is needed.
   */
  app.get("/api/orders", (req, res) => {
    db.all(
      `SELECT
        id,
        created_at,
        item_count,
        total_amount
      FROM orders
      ORDER BY id DESC`,
      [],
      (err, rows) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Failed to fetch orders", detail: err.message });
        }
        res.json(rows);
      },
    );
  });

  /**
   * GET /api/orders/:id
   * Returns a single order with its full line items. All product fields are read
   * from the snapshot columns on order_items — no join to products is needed,
   * ensuring past orders are unaffected by subsequent catalog changes.
   */
  app.get("/api/orders/:id", (req, res) => {
    const orderId = Number(req.params.id);
    if (!orderId) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    db.get(
      "SELECT id, created_at, total_amount, item_count FROM orders WHERE id = ?",
      [orderId],
      (err, order) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Failed to fetch order", detail: err.message });
        }
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }

        // Fetch line items separately — they are linked by order_id FK
        db.all(
          `SELECT
            oi.id,
            oi.product_id,
            oi.product_variant_id,
            oi.product_name,
            oi.configuration,
            oi.sku,
            oi.unit_price,
            oi.quantity,
            oi.line_total
          FROM order_items oi
          WHERE oi.order_id = ?`,
          [orderId],
          (itemsErr, items) => {
            if (itemsErr) {
              return res.status(500).json({
                message: "Failed to fetch order items",
                detail: itemsErr.message,
              });
            }
            res.json({ ...order, items });
          },
        );
      },
    );
  });

  /**
   * POST /api/orders
   * Creates an order from a list of { variantId, quantity } items. The handler:
   * 1. Validates the shape of each line item before touching the database.
   * 2. Fetches all referenced variants in a single query and indexes them by ID.
   * 3. Computes total_amount and item_count up front for denormalized storage.
   * 4. Runs the insert inside a transaction — order row, order_items rows, and
   *    stock decrements — so a failure at any step never leaves a partial order.
   * Product name, configuration, SKU, and unit price are snapshotted from the
   * variant at request time so past orders survive future catalog changes.
   */
  app.post("/api/orders", (req, res) => {
    const payload = req.body || {};
    const items = Array.isArray(payload.items) ? payload.items : [];

    if (items.length === 0) {
      return res
        .status(400)
        .json({ message: "Order must contain at least one item" });
    }

    // Validate shape of each line item before touching the database
    for (const item of items) {
      const variantId = Number(item.variantId);
      const quantity = Number(item.quantity);
      if (!variantId || !Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          message: "Each item requires a valid variantId and a positive integer quantity",
        });
      }
    }

    const variantIds = items.map((item) => Number(item.variantId));
    const inPlaceholders = variantIds.map(() => "?").join(", ");

    // Fetch all referenced variants with their product info in one query
    db.all(
      `SELECT
        pv.id          AS variant_id,
        pv.product_id,
        p.name         AS product_name,
        pv.configuration,
        pv.sku,
        pv.stock,
        (p.base_price + pv.price_delta) AS unit_price
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id IN (${inPlaceholders})`,
      variantIds,
      (err, variantRows) => {
        if (err) {
          return res.status(500).json({
            message: "Failed to validate catalog items",
            detail: err.message,
          });
        }

        // Index by variant_id for O(1) lookup when building insert values
        const variantMap = {};
        variantRows.forEach((row) => {
          variantMap[row.variant_id] = row;
        });

        for (const item of items) {
          const variantId = Number(item.variantId);
          if (!variantMap[variantId]) {
            return res.status(400).json({
              message: `Catalog item ${variantId} not found`,
            });
          }
        }

        // Compute order-level aggregates up front so they can be stored on the order row
        const totalAmount = items.reduce((sum, item) => {
          const v = variantMap[Number(item.variantId)];
          return sum + v.unit_price * Number(item.quantity);
        }, 0);
        const itemCount = items.reduce((sum, item) => sum + Number(item.quantity), 0);

        db.run("BEGIN TRANSACTION", (beginErr) => {
          if (beginErr) {
            return res
              .status(500)
              .json({ message: "Failed to begin transaction" });
          }

          db.run(
            "INSERT INTO orders (total_amount, item_count) VALUES (?, ?)",
            [totalAmount, itemCount],
            function onInsertOrder(err) {
              if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({
                  message: "Failed to create order",
                  detail: err.message,
                });
              }

              const orderId = this.lastID;

              // Build a single multi-row INSERT to keep the transaction short
              const rowPlaceholders = items.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
              const rowValues = items.flatMap((item) => {
                const variantId = Number(item.variantId);
                const v = variantMap[variantId];
                const qty = Number(item.quantity);
                return [
                  orderId,
                  v.product_id,
                  variantId,
                  v.product_name,       // snapshot
                  v.configuration,      // snapshot
                  v.sku,                // snapshot
                  v.unit_price,         // snapshot
                  qty,
                  v.unit_price * qty,   // line_total
                ];
              });

              db.run(
                `INSERT INTO order_items
                  (order_id, product_id, product_variant_id, product_name, configuration, sku, unit_price, quantity, line_total)
                 VALUES ${rowPlaceholders}`,
                rowValues,
                (itemErr) => {
                  if (itemErr) {
                    db.run("ROLLBACK");
                    return res.status(500).json({
                      message: "Failed to insert order items",
                      detail: itemErr.message,
                    });
                  }

                  // Decrement stock for each ordered variant in a single UPDATE
                  const stockCases = items
                    .map(() => "WHEN ? THEN stock - ?")
                    .join(" ");
                  const stockValues = items.flatMap((item) => [
                    Number(item.variantId),
                    Number(item.quantity),
                  ]);
                  const stockIds = items.map(() => "?").join(", ");

                  db.run(
                    `UPDATE product_variants
                     SET stock = CASE id ${stockCases} END
                     WHERE id IN (${stockIds})`,
                    [...stockValues, ...variantIds],
                    (stockErr) => {
                      if (stockErr) {
                        db.run("ROLLBACK");
                        return res.status(500).json({
                          message: "Failed to update stock",
                          detail: stockErr.message,
                        });
                      }

                      db.run("COMMIT", (commitErr) => {
                        if (commitErr) {
                          db.run("ROLLBACK");
                          return res
                            .status(500)
                            .json({ message: "Failed to commit order" });
                        }

                        // Re-fetch using the same shape as GET /api/orders/:id
                        db.get(
                          "SELECT id, created_at, total_amount, item_count FROM orders WHERE id = ?",
                          [orderId],
                          (fetchErr, order) => {
                            if (fetchErr) {
                              return res.status(500).json({
                                message: "Order created but failed to fetch it",
                              });
                            }

                            db.all(
                              `SELECT
                                oi.id,
                                oi.product_id,
                                oi.product_variant_id,
                                oi.product_name,
                                oi.configuration,
                                oi.sku,
                                oi.unit_price,
                                oi.quantity,
                                oi.line_total
                              FROM order_items oi
                              WHERE oi.order_id = ?`,
                              [orderId],
                              (itemsFetchErr, orderItems) => {
                                if (itemsFetchErr) {
                                  return res.status(500).json({
                                    message: "Order created but failed to fetch items",
                                  });
                                }
                                res.status(201).json({ ...order, items: orderItems });
                              },
                            );
                          },
                        );
                      });
                    },
                  );
                },
              );
            },
          );
        });
      },
    );
  });

  /**
   * DELETE /api/orders/:id
   * Deletes an order. The ON DELETE CASCADE on order_items means the database
   * automatically removes all associated line items in the same operation.
   */
  app.delete("/api/orders/:id", (req, res) => {
    const orderId = Number(req.params.id);
    if (!orderId) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    db.run(
      "DELETE FROM orders WHERE id = ?",
      [orderId],
      function onDelete(err) {
        if (err) {
          return res
            .status(500)
            .json({ message: "Failed to delete order", detail: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ message: "Order not found" });
        }
        res.json({ success: true });
      },
    );
  });

  return app;
}

module.exports = { createApp };
