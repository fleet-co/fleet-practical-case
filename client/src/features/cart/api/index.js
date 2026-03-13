import { apiFetch } from "../../../lib/fetch";

const BASE = "/cart";

export const cartApi = {
  get: async () => apiFetch(BASE),

  addItem: async (productId, quantity = 1) =>
    apiFetch(BASE, {
      method: "POST",
      body: JSON.stringify({ productId, quantity }),
    }),

  updateItem: async (id, quantity) =>
    apiFetch(`${BASE}/${id}`, {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    }),

  removeItem: async (id) =>
    apiFetch(`${BASE}/${id}`, { method: "DELETE" }),

  clear: async () =>
    apiFetch(BASE, { method: "DELETE" }),
};
