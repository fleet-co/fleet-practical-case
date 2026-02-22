import { useCallback, useEffect, useState } from "react";

export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/orders");
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.message || "Could not load orders");
      }
      setOrders(Array.isArray(json) ? json : []);
    } catch (err) {
      setError(err.message || "Orders fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createOrder = useCallback(
    async (cart) => {
      if (!cart || cart.length === 0) return;
      setCreating(true);
      setError(null);
      try {
        const items = cart.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        }));
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.message || "Could not create order");
        }
        await refetch();
      } catch (err) {
        setError(err.message || "Order failed");
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [refetch]
  );

  return { orders, loading, error, refetch, createOrder, creating };
}
