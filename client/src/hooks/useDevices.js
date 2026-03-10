import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function fetchDevices() {
  const response = await fetch("/api/devices");
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Could not load devices");
  }
  return Array.isArray(json) ? json : [];
}

async function createDevice(payload) {
  const response = await fetch("/api/devices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Could not create device");
  }
  return json;
}

async function updateDevice({ id, ...payload }) {
  const response = await fetch(`/api/devices/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Could not update device");
  }
  return json;
}

async function deleteDevice(id) {
  const response = await fetch(`/api/devices/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const json = await response.json();
    throw new Error(json.message || "Could not delete device");
  }
}

export function useDevices() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: fetchDevices,
  });
}

export function useCreateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}
