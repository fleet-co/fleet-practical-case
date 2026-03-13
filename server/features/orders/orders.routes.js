const { Router } = require("express");
const { findAllCartItemsQuery, clearCartQuery } = require("../cart/cart.repository");
const {
  findAllOrdersQuery,
  findOrderByIdQuery,
  findOrderItemsQuery,
  insertOrderQuery,
  insertOrderItemQuery,
} = require("./orders.repository");

const router = Router();

const listOrders = async (_req, res) => {
  const orders = await findAllOrdersQuery();
  res.json(orders);
};

const getOrder = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid order id" });

  const order = await findOrderByIdQuery(id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  const items = await findOrderItemsQuery(id);
  res.json({ ...order, items });
};

const createOrderFromCart = async (_req, res) => {
  const cartItems = await findAllCartItemsQuery();

  if (cartItems.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  const total = cartItems.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0,
  );

  const order = await insertOrderQuery(total);

  for (const item of cartItems) {
    await insertOrderItemQuery({
      orderId: order.id,
      productId: item.product_id,
      productName: item.product_name,
      unitPrice: item.unit_price,
      quantity: item.quantity,
    });
  }

  await clearCartQuery();

  const items = await findOrderItemsQuery(order.id);
  res.status(201).json({ ...order, items });
};

router.get("/", listOrders);
router.get("/:id", getOrder);
router.post("/", createOrderFromCart);

module.exports = router;
