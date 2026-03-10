import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function fetchEmployees() {
  const response = await fetch("/api/employees");
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Could not load employees");
  }
  return Array.isArray(json) ? json : [];
}

async function createEmployee(payload) {
  const response = await fetch("/api/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Could not create employee");
  }
  return json;
}

async function updateEmployee({ id, ...payload }) {
  const response = await fetch(`/api/employees/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Could not update employee");
  }
  return json;
}

async function deleteEmployee(id) {
  const response = await fetch(`/api/employees/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const json = await response.json();
    throw new Error(json.message || "Could not delete employee");
  }
}

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: fetchEmployees,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
