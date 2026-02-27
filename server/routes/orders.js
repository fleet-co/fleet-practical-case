const express = require("express");

function createOrdersRouter(db) {
  const router = express.Router();

  router.get("/api/orders", (req, res) => {
    const search = req.query.search || "";
    let sql = `
      SELECT
        o.id,
        o.total_amount,
        o.item_count,
        o.created_at
      FROM orders o
      WHERE 1 = 1
    `;
    const params = [];

    if (search) {
      sql += " AND (CAST(o.total_amount AS TEXT) LIKE ? OR CAST(o.item_count AS TEXT) LIKE ?)";
      params.push(`%${search.toLowerCase()}%`);
      params.push(`%${search.toLowerCase()}%`);
    }

    sql += " GROUP BY o.id ORDER BY o.id DESC";

    db.all(sql, params, (err, rows) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Failed to fetch orders", detail: err.message });
      }
      return res.json(rows);
    });
  });

  router.post("/api/orders", (req, res) => {
    const payload = req.body || {};
    const totalAmount = Number(payload.totalAmount);
    const itemCount = Number(payload.itemCount);
    const items = Array.isArray(payload.items) ? payload.items : [];

    if (!totalAmount || !itemCount) {
      return res
        .status(400)
        .json({ message: "Both total amount and item count are required" });
    }

    const normalizedItems = items
      .map((item) => {
        const unitPrice = Number(item.unitPrice || 0);
        const quantity = Number(item.quantity || 0);
        const lineTotal = Number(item.lineTotal || unitPrice * quantity);

        return {
          productId: item.productId ? Number(item.productId) : null,
          productVariantId: item.productVariantId ? Number(item.productVariantId) : null,
          productName: (item.productName || "").toString().trim(),
          configuration: (item.configuration || "").toString().trim(),
          sku: (item.sku || "").toString().trim(),
          unitPrice,
          quantity,
          lineTotal,
        };
      })
      .filter((item) => item.quantity > 0 && item.unitPrice >= 0);

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      db.run(
        "INSERT INTO orders (total_amount, item_count) VALUES (?, ?)",
        [totalAmount, itemCount],
        function onInsert(orderErr) {
          if (orderErr) {
            db.run("ROLLBACK");
            return res
              .status(500)
              .json({ message: "Failed to create order", detail: orderErr.message });
          }

          const orderId = this.lastID;

          if (normalizedItems.length === 0) {
            return db.run("COMMIT", (commitErr) => {
              if (commitErr) {
                return res.status(500).json({
                  message: "Order created but commit failed",
                  detail: commitErr.message,
                });
              }

              return db.get(
                "SELECT id, total_amount, item_count, created_at FROM orders WHERE id = ?",
                [orderId],
                (fetchErr, row) => {
                  if (fetchErr) {
                    return res
                      .status(500)
                      .json({ message: "Order created but failed to fetch it" });
                  }
                  return res.status(201).json(row);
                },
              );
            });
          }

          let remainingInserts = normalizedItems.length;
          let hasFailed = false;

          const failWithRollback = (statusCode, message, detail) => {
            if (hasFailed) {
              return;
            }

            hasFailed = true;
            return db.run("ROLLBACK", () => {
              if (detail) {
                return res.status(statusCode).json({ message, detail });
              }
              return res.status(statusCode).json({ message });
            });
          };

          const insertOrderItem = (item) => {
            db.run(
              `
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
              `,
              [
                orderId,
                item.productId,
                item.productVariantId,
                item.productName,
                item.configuration,
                item.sku,
                item.unitPrice,
                item.quantity,
                item.lineTotal,
              ],
              (itemErr) => {
                if (hasFailed) {
                  return;
                }

                if (itemErr) {
                  return failWithRollback(500, "Failed to create order items", itemErr.message);
                }

                remainingInserts -= 1;

                if (remainingInserts !== 0) {
                  return;
                }

                return db.run("COMMIT", (commitErr) => {
                  if (commitErr) {
                    return res.status(500).json({
                      message: "Order created but commit failed",
                      detail: commitErr.message,
                    });
                  }

                  return db.get(
                    "SELECT id, total_amount, item_count, created_at FROM orders WHERE id = ?",
                    [orderId],
                    (fetchErr, row) => {
                      if (fetchErr) {
                        return res
                          .status(500)
                          .json({ message: "Order created but failed to fetch it" });
                      }

                      return res.status(201).json(row);
                    },
                  );
                });
              },
            );
          };

          normalizedItems.forEach((item) => {
            if (!item.productVariantId) {
              insertOrderItem(item);
              return;
            }

            db.run(
              "UPDATE product_variants SET stock = stock - ? WHERE id = ? AND stock >= ?",
              [item.quantity, item.productVariantId, item.quantity],
              function onStockUpdate(stockErr) {
                if (hasFailed) {
                  return;
                }

                if (stockErr) {
                  return failWithRollback(500, "Failed to update product stock", stockErr.message);
                }

                if (this.changes === 0) {
                  return failWithRollback(409, "Insufficient stock for one or more products");
                }

                return insertOrderItem(item);
              },
            );
          });
        },
      );
    });
  });

  router.get("/api/orders/:id", (req, res) => {
    const orderId = Number(req.params.id);
    if (!orderId) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    return db.get(
      "SELECT id, total_amount, item_count, created_at FROM orders WHERE id = ?",
      [orderId],
      (orderErr, orderRow) => {
        if (orderErr) {
          return res
            .status(500)
            .json({ message: "Failed to fetch order", detail: orderErr.message });
        }

        if (!orderRow) {
          return res.status(404).json({ message: "Order not found" });
        }

        const sql = `
          SELECT
            oi.id,
            oi.order_id,
            oi.product_id,
            oi.product_variant_id,
            COALESCE(p.name, oi.product_name) AS product_name,
            COALESCE(pv.configuration, oi.configuration) AS configuration,
            COALESCE(pv.sku, oi.sku) AS sku,
            oi.unit_price,
            oi.quantity,
            oi.line_total,
            oi.created_at,
            p.status AS product_status,
            p.base_price,
            pv.price_delta,
            pv.stock
          FROM order_items oi
          LEFT JOIN products p ON p.id = oi.product_id
          LEFT JOIN product_variants pv ON pv.id = oi.product_variant_id
          WHERE oi.order_id = ?
          ORDER BY oi.id ASC
        `;

        return db.all(sql, [orderId], (itemsErr, rows) => {
          if (itemsErr) {
            return res.status(500).json({
              message: "Failed to fetch order details",
              detail: itemsErr.message,
            });
          }

          return res.json({
            order: orderRow,
            items: Array.isArray(rows) ? rows : [],
          });
        });
      },
    );
  });

  return router;
}

module.exports = createOrdersRouter;
