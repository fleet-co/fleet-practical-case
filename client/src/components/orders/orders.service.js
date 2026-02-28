export async function fetchOrders() {
  const response = await fetch("/api/orders");
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Could not load orders");
  }

  const sortedOrders = Object.entries(
    Object.groupBy(json, (order) => order.order_id)
  ).sort(([, a], [, b]) =>
    new Date(b[0].order_date.replace(" ", "T")) -
    new Date(a[0].order_date.replace(" ", "T"))
  );

  return sortedOrders;
}
