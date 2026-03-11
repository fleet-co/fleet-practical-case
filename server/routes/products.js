const express = require("express");
const db = require("../db");
const router = express.Router();

router.get("/", (req, res) => {
  const category = req.query.category || "";
  const search = req.query.search || "";
  let sql = "SELECT * FROM products WHERE 1 = 1";
  const params = [];

  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }

  if (search) {
    sql += " AND (name LIKE ? OR description LIKE ?)";
    params.push(`%${search}%`);
    params.push(`%${search}%`);
  }

  sql += " ORDER BY id DESC";

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Failed to fetch products", detail: err.message });
    }
    res.json(rows);
  });
});

router.get("/:id", (req, res) => {
  const productId = Number(req.params.id);
  if (!productId) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  db.get("SELECT * FROM products WHERE id = ?", [productId], (err, row) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Failed to fetch product", detail: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.json(row);
  });
});

router.post("/", (req, res) => {
  const payload = req.body || {};
  const name = (payload.name || "").toString().trim();
  const description = (payload.description || "").toString().trim();
  const price = Number(payload.price);
  const category = (payload.category || "").toString().trim();
  const stock = Number(payload.stock) || 0;

  if (!name || !category || isNaN(price) || price < 0) {
    return res
      .status(400)
      .json({ message: "Name, category, and a valid price are required" });
  }

  db.get(
    "INSERT INTO products (name, description, price, category, stock) VALUES (?, ?, ?, ?, ?) RETURNING *",
    [name, description, price, category, stock],
    (err, row) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Failed to create product", detail: err.message });
      }
      res.status(201).json(row);
    },
  );
});

router.put("/:id", (req, res) => {
  const productId = Number(req.params.id);
  const payload = req.body || {};
  const name = (payload.name || "").toString().trim();
  const description = (payload.description || "").toString().trim();
  const price = Number(payload.price);
  const category = (payload.category || "").toString().trim();
  const stock = Number(payload.stock) || 0;

  if (!productId) {
    return res.status(400).json({ message: "Invalid product id" });
  }
  if (!name || !category || isNaN(price) || price < 0) {
    return res
      .status(400)
      .json({ message: "Name, category, and a valid price are required" });
  }

  db.get(
    "UPDATE products SET name = ?, description = ?, price = ?, category = ?, stock = ? WHERE id = ? RETURNING *",
    [name, description, price, category, stock, productId],
    (err, row) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Failed to update product", detail: err.message });
      }
      if (!row) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(row);
    },
  );
});

router.delete("/:id", (req, res) => {
  const productId = Number(req.params.id);
  if (!productId) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  db.run(
    "DELETE FROM products WHERE id = ?",
    [productId],
    function onDelete(err) {
      if (err) {
        return res
          .status(500)
          .json({ message: "Failed to delete product", detail: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json({ success: true });
    },
  );
});

module.exports = router;
