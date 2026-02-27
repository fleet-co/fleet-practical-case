export async function fetchOrders() {
  const response = await fetch("/api/orders");
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Could not load orders");
  }
  const groupedOrders = Object.groupBy(json, (order) => order.order_id);
  return groupedOrders;
}
