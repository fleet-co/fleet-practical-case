const db = require("../db");

exports.getOrders = (req, res) => {
  const sql = `
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
};

exports.createOrder = (req, res) => {
  const payload = req.body || {};

  if (!req.is("application/json")) {
    return res.status(400).json({
      message: "Content-Type must be application/json",
    });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return res.status(400).json({
      message: "Payload must be a JSON object",
    });
  }

  const orderModel = {
    total_amount: Object.values(payload).reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    ),
    item_count: Object.values(payload).reduce(
      (sum, item) => sum + item.quantity,
      0
    ),
  };

  const orderItems = Object.values(payload).map((item) => ({
    product_id: item.product_id,
    product_variant_id: item.id,
    product_name: item.name,
    configuration: item.configuration,
    sku: item.sku,
    unit_price: item.price,
    quantity: item.quantity,
    line_total: item.price * item.quantity,
  }));

  const updateProductStock = Object.values(payload).map((item) => ({
    product_variant_id: item.id,
    quantity: item.quantity,
  }));

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    db.run(
      "INSERT INTO orders (total_amount, item_count) VALUES (?, ?)",
      [orderModel.total_amount, orderModel.item_count],
      function (err) {
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

          const stockStmt = db.prepare(`
            UPDATE product_variants
            SET stock = stock - ?
            WHERE id = ?
          `);

          for (const update of updateProductStock) {
            stockStmt.run(update.quantity, update.product_variant_id);
          }

          stockStmt.finalize((stockErr) => {
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
};