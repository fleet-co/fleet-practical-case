const { dbAll, dbGet, dbRun } = require("../../db");

const findAllProductsQuery = async ({ category, search } = {}) => {
  let sql = `
    SELECT id, name, description, price, category, stock, created_at
    FROM products
    WHERE 1 = 1`;
  const params = [];

  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  if (search) {
    sql += " AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)";
    const term = `%${search.toLowerCase()}%`;
    params.push(term, term);
  }

  sql += " ORDER BY id DESC";
  return dbAll(sql, params);
};

const findProductByIdQuery = async (id) => {
  return dbGet(
    `SELECT id, name, description, price, category, stock, created_at
     FROM products WHERE id = ?`,
    [id],
  );
};

const insertProductQuery = async ({ name, description, price, category, stock }) => {
  const { lastID } = await dbRun(
    `INSERT INTO products (name, description, price, category, stock)
     VALUES (?, ?, ?, ?, ?)`,
    [name, description, price, category, stock],
  );
  return findProductByIdQuery(lastID);
};

const updateProductQuery = async (id, { name, description, price, category, stock }) => {
  const { changes } = await dbRun(
    `UPDATE products SET name = ?, description = ?, price = ?, category = ?, stock = ?
     WHERE id = ?`,
    [name, description, price, category, stock, id],
  );
  if (changes === 0) return undefined;
  return findProductByIdQuery(id);
};

const deleteProductQuery = async (id) => {
  const { changes } = await dbRun(`DELETE FROM products WHERE id = ?`, [id]);
  return changes > 0;
};

const findProductCategoriesQuery = async () => {
  const rows = await dbAll(
    `SELECT DISTINCT category FROM products ORDER BY category`,
  );
  return rows.map((r) => r.category);
};

module.exports = {
  findAllProductsQuery,
  findProductByIdQuery,
  insertProductQuery,
  updateProductQuery,
  deleteProductQuery,
  findProductCategoriesQuery,
};
