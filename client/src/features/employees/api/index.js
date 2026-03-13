import { apiFetch } from "../../../lib/fetch";

const BASE = "/employees";

export const employeesApi = {
  getAll: async ({ role, search } = {}) => {
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    if (search) params.set("search", search);
    const url = params.toString() ? `${BASE}?${params}` : BASE;
    return apiFetch(url);
  },

  getById: async (id) => apiFetch(`${BASE}/${id}`),

  getRoles: async () => apiFetch(`${BASE}/roles`),

  create: async (data) =>
    apiFetch(BASE, { method: "POST", body: JSON.stringify(data) }),

  update: async (id, data) =>
    apiFetch(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: async (id) =>
    apiFetch(`${BASE}/${id}`, { method: "DELETE" }),
};
