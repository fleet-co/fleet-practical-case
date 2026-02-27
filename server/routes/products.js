const express = require("express");

function createProductsRouter(db) {
  const router = express.Router();

  router.get("/api/products", (req, res) => {
    const search = req.query.search || "";
    let sql = `
      SELECT
        p.id,
        pv.id AS variant_id,
        p.name,
        p.status,
        p.base_price,
        p.created_at,
        pv.configuration,
        pv.sku,
        pv.stock,
        pv.price_delta
      FROM product_variants pv
      INNER JOIN products p ON pv.product_id = p.id
      WHERE p.status = 'active'
    `;
    const params = [];

    if (search) {
      sql += " AND (LOWER(p.name) LIKE ? OR CAST((COALESCE(p.base_price, 0) + COALESCE(pv.price_delta, 0)) AS TEXT) LIKE ? OR LOWER(pv.configuration) LIKE ?)";
      params.push(`%${search.toLowerCase()}%`);
      params.push(`%${search.toLowerCase()}%`);
      params.push(`%${search.toLowerCase()}%`);
    }

    sql += " ORDER BY p.id DESC, pv.id DESC";

    db.all(sql, params, (err, rows) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Failed to fetch products", detail: err.message });
      }

      let normalizedRows = rows;
      if (normalizedRows) {
        normalizedRows = normalizedRows.map((row) => ({
          ...row,
          price: Number(row.base_price || 0) + Number(row.price_delta || 0),
          stock: Number(row.stock || 0),
        }));
      }

      return res.json(normalizedRows);
    });
  });

  return router;
}

module.exports = createProductsRouter;
