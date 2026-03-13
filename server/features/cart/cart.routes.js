const { Router } = require("express");
const { findProductByIdQuery } = require("../catalog/catalog.repository");
const {
  findAllCartItemsQuery,
  upsertCartItemQuery,
  updateCartItemQuantityQuery,
  deleteCartItemQuery,
  clearCartQuery,
} = require("./cart.repository");

const router = Router();

const getCart = async (_req, res) => {
  const items = await findAllCartItemsQuery();
  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  res.json({ items, total });
};

const addToCart = async (req, res) => {
  const productId = Number(req.body.productId);
  const quantity = Number(req.body.quantity) || 1;

  if (!productId) {
    return res.status(400).json({ message: "productId is required" });
  }
  if (quantity < 1) {
    return res.status(400).json({ message: "Quantity must be at least 1" });
  }

  const product = await findProductByIdQuery(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const items = await upsertCartItemQuery(productId, quantity);
  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  res.json({ items, total });
};

const updateCartItem = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid cart item id" });

  const quantity = Number(req.body.quantity);
  if (!quantity || quantity < 1) {
    return res.status(400).json({ message: "Quantity must be at least 1" });
  }

  const updated = await updateCartItemQuantityQuery(id, quantity);
  if (!updated) return res.status(404).json({ message: "Cart item not found" });

  const items = await findAllCartItemsQuery();
  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  res.json({ items, total });
};

const removeCartItem = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid cart item id" });

  const deleted = await deleteCartItemQuery(id);
  if (!deleted) return res.status(404).json({ message: "Cart item not found" });

  const items = await findAllCartItemsQuery();
  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  res.json({ items, total });
};

const clearCart = async (_req, res) => {
  await clearCartQuery();
  res.json({ items: [], total: 0 });
};

router.get("/", getCart);
router.post("/", addToCart);
router.put("/:id", updateCartItem);
router.delete("/:id", removeCartItem);
router.delete("/", clearCart);

module.exports = router;
