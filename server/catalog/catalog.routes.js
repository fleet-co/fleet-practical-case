const express = require("express");
const catalogService = require("./catalog.service");

function createCatalogRouter(db) {
  const router = express.Router();

  router.get("/products", async (req, res) => {
    try {
      const rows = await catalogService.getProducts(db);
      res.json(rows);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to fetch products", detail: err.message });
    }
  });

  return router;
}

module.exports = createCatalogRouter;
