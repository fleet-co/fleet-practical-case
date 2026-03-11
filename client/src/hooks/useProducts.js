import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function fetchProducts() {
  const response = await fetch("/api/products");
  const json = await response.json();
  console.log(json);
  
  if (!response.ok) {
    throw new Error(json.message || "Could not load products");
  }
  return Array.isArray(json) ? json : [];
}

async function createProduct(payload) {
  const response = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Could not create product");
  }
  return json;
}

async function updateProduct({ id, ...payload }) {
  const response = await fetch(`/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Could not update product");
  }
  return json;
}

async function deleteProduct(id) {
  const response = await fetch(`/api/products/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const json = await response.json();
    throw new Error(json.message || "Could not delete product");
  }
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
