function listOrders(db) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, created_at,
        (SELECT SUM(op.quantity * op.unit_price)
         FROM order_product op
         WHERE op.order_id = orders.id) AS total
       FROM orders ORDER BY created_at DESC`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function getProductPrices(db, productIds) {
  if (productIds.length === 0) return Promise.resolve({});
  const placeholders = productIds.map(() => "?").join(",");
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, price FROM products WHERE id IN (${placeholders})`,
      productIds,
      (err, rows) => {
        if (err) reject(err);
        else {
          const priceById = {};
          (rows || []).forEach((p) => {
            priceById[p.id] = p.price;
          });
          resolve(priceById);
        }
      }
    );
  });
}

function insertOrder(db) {
  return new Promise((resolve, reject) => {
    db.run("INSERT INTO orders DEFAULT VALUES", function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

function insertOrderLines(db, orderId, lines) {
  const opRows = lines.flatMap((line) => [
    orderId,
    line.productId,
    line.quantity,
    line.unitPrice,
  ]);
  const opPlaceholders = lines.map(() => "(?, ?, ?, ?)").join(", ");
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO order_product (order_id, product_id, quantity, unit_price) VALUES ${opPlaceholders}`,
      opRows,
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function getOrderById(db, orderId) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT id, created_at FROM orders WHERE id = ?",
      [orderId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

function deleteOrder(db, orderId) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM orders WHERE id = ?", [orderId], function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  listOrders,
  getProductPrices,
  insertOrder,
  insertOrderLines,
  getOrderById,
  deleteOrder,
};
