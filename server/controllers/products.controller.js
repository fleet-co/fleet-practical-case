const db = require("../db");

exports.getProducts = (req, res) => {
  const sql = `
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
};