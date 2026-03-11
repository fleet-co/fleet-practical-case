import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function fetchOrders() {
  const response = await fetch("/api/orders");
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Could not load orders");
  }
  return Array.isArray(json) ? json : [];
}

async function createOrder(payload) {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Could not create order");
  }
  return json;
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
