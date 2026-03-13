import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "../api";

const ORDERS_KEY = ["orders"];

export const useOrders = () =>
  useQuery({
    queryKey: ORDERS_KEY,
    queryFn: () => ordersApi.getAll(),
  });

export const useOrder = (id) =>
  useQuery({
    queryKey: [...ORDERS_KEY, id],
    queryFn: () => ordersApi.getById(id),
    enabled: !!id,
  });

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ordersApi.createFromCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
};
