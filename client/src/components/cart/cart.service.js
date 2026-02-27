export async function createOrder(orderData) {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderData),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to create order");
  }
  return json;
}
