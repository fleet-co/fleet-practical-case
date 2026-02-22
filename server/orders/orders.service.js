const ordersRepository = require("./orders.repository");

function listOrders(db) {
  return ordersRepository.listOrders(db);
}

async function createOrder(db, payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];

  if (items.length === 0) {
    const err = new Error("At least one item is required");
    err.statusCode = 400;
    throw err;
  }

  const normalized = items.map((item) => ({
    productId: Number(item.productId),
    quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
  }));

  const invalid = normalized.find(
    (item) => !item.productId || item.quantity < 1
  );
  if (invalid) {
    const err = new Error(
      "Each item must have a valid productId and quantity >= 1"
    );
    err.statusCode = 400;
    throw err;
  }

  const productIds = [...new Set(normalized.map((i) => i.productId))];
  const priceById = await ordersRepository.getProductPrices(db, productIds);

  const missing = normalized.find((item) => !(item.productId in priceById));
  if (missing) {
    const err = new Error(`Product not found: ${missing.productId}`);
    err.statusCode = 400;
    throw err;
  }

  const orderId = await ordersRepository.insertOrder(db);

  const lines = normalized.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: priceById[item.productId],
  }));

  try {
    await ordersRepository.insertOrderLines(db, orderId, lines);
  } catch (err) {
    await ordersRepository.deleteOrder(db, orderId);
    throw err;
  }

  const order = await ordersRepository.getOrderById(db, orderId);
  return order;
}

module.exports = { listOrders, createOrder };
