const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, "fleet.sqlite");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Could not open sqlite database", err);
  } else {
    console.log("Connected to sqlite database at", dbPath);
  }
});

db.serialize(() => {
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

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT,
      base_price TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      sku TEXT NOT NULL,
      configuration TEXT,
      price_delta REAL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_amount REAL NOT NULL,
      item_count INTEGER NOT NULL,
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
      quantity INTEGER NOT NULL,
      line_total REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_variant_id) REFERENCES product_variants(id)
    )
  `);
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

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

app.delete("/api/employees/:id", (req, res) => {
  const employeeId = Number(req.params.id);
  if (!employeeId) {
    return res.status(400).json({ message: "Invalid employee id" });
  }

  db.serialize(() => {
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

app.get("/api/products", (req, res) => {
  let sql = `
    SELECT
      pv.id,
      p.id AS product_id,
      p.name,
      (p.base_price + pv.price_delta) AS price,
      p.created_at,
      pv.sku,
      pv.configuration,
      pv.stock
    FROM products p
    JOIN product_variants pv ON pv.product_id = p.id
    WHERE p.status = 'active'
    AND pv.stock > 0
    ORDER BY pv.id DESC;
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Failed to fetch products", detail: err.message });
    }
    res.json(rows);
  });

});

app.get("/api/orders", (req, res) => {
  let sql = `
    SELECT
    o.id as order_id,
    o.total_amount as total_price,
    o.created_at as order_date,
    oi.product_name,
    oi.configuration,
    oi.sku,
    oi.unit_price,
    oi.quantity,
    oi.line_total
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    ORDER BY o.created_at DESC;
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Failed to fetch orders", detail: err.message });
    }
    res.json(rows);
  });
});

app.post("/api/orders", (req, res) => {
  const payload = req.body || {};

  if (!req.is("application/json")) {
    return res.status(400).json({
      message: "Content-Type must be application/json",
    });
  }

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({
      message: "Payload must be a JSON object",
    });
  }

  const orderModel = {
    total_amount: Object.entries(payload).reduce((sum, [_key, item]) => sum + item.quantity * item.price, 0),
    item_count: Object.entries(payload).reduce((sum, [_key, item]) => sum + item.quantity, 0),
  }

  const orderItems = Object.entries(payload).map(([key, item]) => ({
    product_id: item.product_id,
    product_variant_id: item.id,
    product_name: item.name,
    configuration: item.configuration,
    sku: item.sku,
    unit_price: item.price,
    quantity: item.quantity,
    line_total: item.price * item.quantity,
  }));

  const updateProductStock = Object.entries(payload).map(([key, item]) => ({
    product_variant_id: item.id,
    quantity: item.quantity,
  }));

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    db.run(
      "INSERT INTO orders (total_amount, item_count) VALUES (?, ?)",
      [orderModel.total_amount, orderModel.item_count],
      function onInsert(err) {
        if (err) {
          db.run("ROLLBACK");
          return res.status(500).json({
            message: "Failed to create order",
            detail: err.message,
          });
        }

        const orderId = this.lastID;

        const stmt = db.prepare(`
        INSERT INTO order_items (
          order_id,
          product_id,
          product_variant_id,
          product_name,
          configuration,
          sku,
          unit_price,
          quantity,
          line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

        for (const item of orderItems) {
          stmt.run(
            orderId,
            item.product_id,
            item.product_variant_id,
            item.product_name,
            item.configuration,
            item.sku,
            item.unit_price,
            item.quantity,
            item.line_total
          );
        }

        stmt.finalize((finalizeErr) => {
          if (finalizeErr) {
            db.run("ROLLBACK");
            return res.status(500).json({
              message: "Failed to save order items",
              detail: finalizeErr.message,
            });
          }

          const stockUpdateStmt = db.prepare(`
          UPDATE product_variants
          SET stock = stock - ?
          WHERE id = ?
        `);

          for (const update of updateProductStock) {
            stockUpdateStmt.run(
              update.quantity,
              update.product_variant_id
            );
          }

          stockUpdateStmt.finalize((stockErr) => {
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
                return res.status(500).json({
                  message: "Commit failed",
                  detail: commitErr.message,
                });
              }

              res.status(201).json({ order_id: orderId });
            });
          });
        });
      }
    );
  });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
