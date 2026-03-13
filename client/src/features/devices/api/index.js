import { apiFetch } from "../../../lib/fetch";

const BASE = "/devices";

export const devicesApi = {
  getAll: async ({ type, ownerId, search } = {}) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (ownerId) params.set("ownerId", ownerId);
    if (search) params.set("search", search);
    const url = params.toString() ? `${BASE}?${params}` : BASE;
    return apiFetch(url);
  },

  create: async (data) =>
    apiFetch(BASE, { method: "POST", body: JSON.stringify(data) }),

  update: async (id, data) =>
    apiFetch(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: async (id) =>
    apiFetch(`${BASE}/${id}`, { method: "DELETE" }),
};
