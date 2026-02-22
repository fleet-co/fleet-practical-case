import { useCallback, useEffect, useState } from "react";

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/products");
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.message || "Could not load products");
      }
      setProducts(Array.isArray(json) ? json : []);
    } catch (err) {
      setError(err.message || "Products fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { products, loading, error, refetch };
}
