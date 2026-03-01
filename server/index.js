const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3001;

const productsRoutes = require("./routes/products.routes");
const ordersRoutes = require("./routes/orders.routes");
const db = require("./db");

app.use(cors());
app.use(express.json());

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
    WHERE owner_id IS NOT NULL
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

app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
