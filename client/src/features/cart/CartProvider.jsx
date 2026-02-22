import { createContext, useEffect, useState } from "react";

export const CART_STORAGE_KEY = "fleet_cart";

export const CartContext = createContext(null);

function getInitialCart() {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (_) {}
  return [];
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(getInitialCart);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  function addToCart(product, quantity = 1) {
    const q = Math.max(1, Math.floor(Number(quantity) || 1));
    setCart((prev) => {
      const existing = prev.findIndex((line) => line.productId === product.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = {
          ...next[existing],
          quantity: next[existing].quantity + q,
        };
        return next;
      }
      return [
        ...prev,
        {
          productId: product.id,
          quantity: q,
          name: product.name,
          price: product.price,
        },
      ];
    });
  }

  function updateQuantity(productId, quantity) {
    const q = Math.max(1, Math.floor(Number(quantity) || 1));
    setCart((prev) =>
      prev.map((line) =>
        line.productId === productId ? { ...line, quantity: q } : line
      )
    );
  }

  function removeLine(productId) {
    setCart((prev) => prev.filter((line) => line.productId !== productId));
  }

  function clearCart() {
    setCart([]);
  }

  const value = {
    cart,
    addToCart,
    updateQuantity,
    removeLine,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
