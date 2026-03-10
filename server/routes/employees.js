const express = require("express");
const db = require("../db");
const router = express.Router();

router.get("/", (req, res) => {
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

router.get("/:id", (req, res) => {
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

router.post("/", (req, res) => {
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

router.put("/:id", (req, res) => {
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

router.delete("/:id", (req, res) => {
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

module.exports = router;
