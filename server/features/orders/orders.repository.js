const { dbAll, dbGet, dbRun } = require("../../db");

const findAllOrdersQuery = async () => {
  return dbAll(`
    SELECT id, total, status, created_at
    FROM orders
    ORDER BY id DESC`);
};

const findOrderByIdQuery = async (id) => {
  return dbGet(
    `SELECT id, total, status, created_at FROM orders WHERE id = ?`,
    [id],
  );
};

const findOrderItemsQuery = async (orderId) => {
  return dbAll(
    `SELECT id, order_id, product_id, product_name, unit_price, quantity
     FROM order_items WHERE order_id = ?`,
    [orderId],
  );
};

const insertOrderQuery = async (total) => {
  const { lastID } = await dbRun(
    `INSERT INTO orders (total) VALUES (?)`,
    [total],
  );
  return findOrderByIdQuery(lastID);
};

const insertOrderItemQuery = async ({ orderId, productId, productName, unitPrice, quantity }) => {
  await dbRun(
    `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
     VALUES (?, ?, ?, ?, ?)`,
    [orderId, productId, productName, unitPrice, quantity],
  );
};

module.exports = {
  findAllOrdersQuery,
  findOrderByIdQuery,
  findOrderItemsQuery,
  insertOrderQuery,
  insertOrderItemQuery,
};
