const express = require("express");
const ordersService = require("./orders.service");

function createOrdersRouter(db) {
  const router = express.Router();

  router.get("/orders", async (req, res) => {
    try {
      const rows = await ordersService.listOrders(db);
      res.json(rows);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to fetch orders", detail: err.message });
    }
  });

  router.post("/orders", async (req, res) => {
    try {
      const order = await ordersService.createOrder(db, req.body);
      res.status(201).json(order);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      if (statusCode === 400) {
        res.status(400).json({ message: err.message });
      } else {
        res
          .status(500)
          .json({ message: "Failed to create order", detail: err.message });
      }
    }
  });

  return router;
}

module.exports = createOrdersRouter;
