const express = require("express");
const db = require("../db");
const router = express.Router();

router.get("/", (req, res) => {
  db.all("SELECT * FROM orders ORDER BY id DESC", [], (err, orders) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Failed to fetch orders", detail: err.message });
    }

    db.all(
      `SELECT ol.*, p.name AS product_name
       FROM order_lines ol
       JOIN products p ON p.id = ol.product_id`,
      [],
      (lineErr, lines) => {
        if (lineErr) {
          return res
            .status(500)
            .json({ message: "Failed to fetch order lines", detail: lineErr.message });
        }

        const linesByOrder = {};
        for (const line of lines) {
          if (!linesByOrder[line.order_id]) linesByOrder[line.order_id] = [];
          linesByOrder[line.order_id].push(line);
        }

        const result = orders.map((o) => ({
          ...o,
          lines: linesByOrder[o.id] || [],
        }));

        res.json(result);
      },
    );
  });
});

router.post("/", (req, res) => {
  const { lines } = req.body || {};

  if (!Array.isArray(lines) || lines.length === 0) {
    return res
      .status(400)
      .json({ message: "Order must have at least one line" });
  }

  for (const line of lines) {
    if (!line.product_id || !line.quantity || line.quantity < 1 || !line.unit_price) {
      return res
        .status(400)
        .json({ message: "Each line needs product_id, quantity >= 1, and unit_price" });
    }
  }

  const productIds = lines.map((l) => l.product_id);
  const placeholders = productIds.map(() => "?").join(",");

  db.all(
    `SELECT id, name, stock FROM products WHERE id IN (${placeholders})`,
    productIds,
    (stockErr, products) => {
      if (stockErr) {
        return res
          .status(500)
          .json({ message: "Failed to check stock", detail: stockErr.message });
      }

      const productMap = {};
      for (const p of products) productMap[p.id] = p;

      for (const line of lines) {
        const product = productMap[line.product_id];
        if (!product) {
          return res
            .status(400)
            .json({ message: `Product ${line.product_id} not found` });
        }
        if (line.quantity > product.stock) {
          return res.status(400).json({
            message: `Insufficient stock for "${product.name}": requested ${line.quantity}, available ${product.stock}`,
          });
        }
      }

      const total = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);

      db.run("BEGIN TRANSACTION", (beginErr) => {
        if (beginErr) {
          return res
            .status(500)
            .json({ message: "Failed to start transaction", detail: beginErr.message });
        }

        const stockStmt = db.prepare(
          "UPDATE products SET stock = stock - ? WHERE id = ?",
        );
        for (const line of lines) {
          stockStmt.run(line.quantity, line.product_id);
        }
        stockStmt.finalize();

        db.get(
          "INSERT INTO orders (total) VALUES (?) RETURNING *",
          [total],
          (orderErr, order) => {
            if (orderErr) {
              return db.run("ROLLBACK", () =>
                res
                  .status(500)
                  .json({ message: "Failed to create order", detail: orderErr.message }),
              );
            }

            const lineStmt = db.prepare(
              "INSERT INTO order_lines (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
            );
            for (const line of lines) {
              lineStmt.run(order.id, line.product_id, line.quantity, line.unit_price);
            }
            lineStmt.finalize((finalizeErr) => {
              if (finalizeErr) {
                return db.run("ROLLBACK", () =>
                  res.status(500).json({
                    message: "Failed to insert order lines",
                    detail: finalizeErr.message,
                  }),
                );
              }

              db.run("COMMIT", (commitErr) => {
                if (commitErr) {
                  return db.run("ROLLBACK", () =>
                    res.status(500).json({
                      message: "Failed to commit transaction",
                      detail: commitErr.message,
                    }),
                  );
                }

                db.all(
                  `SELECT ol.*, p.name AS product_name
                   FROM order_lines ol
                   JOIN products p ON p.id = ol.product_id
                   WHERE ol.order_id = ?`,
                  [order.id],
                  (lineErr, orderLines) => {
                    if (lineErr) {
                      return res
                        .status(500)
                        .json({ message: "Order created but lines fetch failed" });
                    }
                    res.status(201).json({ ...order, lines: orderLines });
                  },
                );
              });
            });
          },
        );
      });
    },
  );
});

module.exports = router;
