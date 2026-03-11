import { useState, useCallback, useMemo } from "react";

const CART_KEY = "cart";

function loadCart() {
  try {
    const stored = localStorage.getItem(CART_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCart(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {}
}

export function useCart() {
  const [items, setItemsRaw] = useState(loadCart);

  const setItems = useCallback((updater) => {
    setItemsRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveCart(next);
      return next;
    });
  }, []);

  const addItem = useCallback((product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1, stock: product.stock }
            : i,
        );
      }
      if (product.stock <= 0) return prev;
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          unit_price: product.price,
          stock: product.stock,
          quantity: 1,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((i) => {
        if (i.product_id !== productId) return i;
        if (quantity > i.stock) return i;
        return { ...i, quantity };
      }),
    );
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
    [items],
  );

  return { items, addItem, updateQuantity, removeItem, clear, total };
}
