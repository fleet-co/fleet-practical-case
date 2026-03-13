const { dbAll, dbGet, dbRun } = require("../../db");

const findAllCartItemsQuery = async () => {
  return dbAll(`
    SELECT ci.id, ci.product_id, ci.quantity, ci.created_at,
           p.name AS product_name, p.price AS unit_price, p.stock
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    ORDER BY ci.created_at ASC`);
};

const findCartItemByProductQuery = async (productId) => {
  return dbGet(
    `SELECT id, product_id, quantity FROM cart_items WHERE product_id = ?`,
    [productId],
  );
};

const upsertCartItemQuery = async (productId, quantity) => {
  const existing = await findCartItemByProductQuery(productId);

  if (existing) {
    const newQty = existing.quantity + quantity;
    await dbRun(
      `UPDATE cart_items SET quantity = ? WHERE id = ?`,
      [newQty, existing.id],
    );
  } else {
    await dbRun(
      `INSERT INTO cart_items (product_id, quantity) VALUES (?, ?)`,
      [productId, quantity],
    );
  }

  return findAllCartItemsQuery();
};

const updateCartItemQuantityQuery = async (id, quantity) => {
  const { changes } = await dbRun(
    `UPDATE cart_items SET quantity = ? WHERE id = ?`,
    [quantity, id],
  );
  return changes > 0;
};

const deleteCartItemQuery = async (id) => {
  const { changes } = await dbRun(
    `DELETE FROM cart_items WHERE id = ?`,
    [id],
  );
  return changes > 0;
};

const clearCartQuery = async () => {
  await dbRun(`DELETE FROM cart_items`);
};

module.exports = {
  findAllCartItemsQuery,
  findCartItemByProductQuery,
  upsertCartItemQuery,
  updateCartItemQuantityQuery,
  deleteCartItemQuery,
  clearCartQuery,
};
