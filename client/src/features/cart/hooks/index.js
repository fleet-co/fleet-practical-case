import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cartApi } from "../api";

const CART_KEY = ["cart"];

export const useCart = () =>
  useQuery({
    queryKey: CART_KEY,
    queryFn: () => cartApi.get(),
  });

export const useAddToCart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, quantity }) => cartApi.addItem(productId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_KEY });
    },
  });
};

export const useUpdateCartItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }) => cartApi.updateItem(id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_KEY });
    },
  });
};

export const useRemoveCartItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => cartApi.removeItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_KEY });
    },
  });
};

export const useClearCart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.clear(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_KEY });
    },
  });
};
