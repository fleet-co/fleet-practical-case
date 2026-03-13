import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogApi } from "../api";

const PRODUCTS_KEY = ["products"];

export const useProducts = (filters = {}) =>
  useQuery({
    queryKey: [...PRODUCTS_KEY, filters],
    queryFn: () => catalogApi.getAll(filters),
  });

export const useProductCategories = () =>
  useQuery({
    queryKey: [...PRODUCTS_KEY, "categories"],
    queryFn: () => catalogApi.getCategories(),
  });

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => catalogApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => catalogApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => catalogApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
  });
};
