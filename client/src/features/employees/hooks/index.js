import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeesApi } from "../api";

const EMPLOYEES_KEY = ["employees"];

export const useEmployees = (filters = {}) =>
  useQuery({
    queryKey: [...EMPLOYEES_KEY, filters],
    queryFn: () => employeesApi.getAll(filters),
  });

export const useEmployeeRoles = () =>
  useQuery({
    queryKey: [...EMPLOYEES_KEY, "roles"],
    queryFn: () => employeesApi.getRoles(),
  });

export const useEmployee = (id) =>
  useQuery({
    queryKey: [...EMPLOYEES_KEY, id],
    queryFn: () => employeesApi.getById(id),
    enabled: !!id,
  });

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => employeesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => employeesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY });
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => employeesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
};
