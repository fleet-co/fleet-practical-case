import { apiFetch } from "../../../lib/fetch";

const BASE = "/orders";

export const ordersApi = {
  getAll: async () => apiFetch(BASE),

  getById: async (id) => apiFetch(`${BASE}/${id}`),

  createFromCart: async () =>
    apiFetch(BASE, { method: "POST" }),
};
