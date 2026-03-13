import { apiFetch } from "../../../lib/fetch";

const BASE = "/products";

export const catalogApi = {
  getAll: async ({ category, search } = {}) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    const url = params.toString() ? `${BASE}?${params}` : BASE;
    return apiFetch(url);
  },

  getById: async (id) => apiFetch(`${BASE}/${id}`),

  getCategories: async () => apiFetch(`${BASE}/categories`),

  create: async (data) =>
    apiFetch(BASE, { method: "POST", body: JSON.stringify(data) }),

  update: async (id, data) =>
    apiFetch(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: async (id) =>
    apiFetch(`${BASE}/${id}`, { method: "DELETE" }),
};
