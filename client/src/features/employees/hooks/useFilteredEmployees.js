import { useMemo } from "react";

/**
 * Derives a filtered list of employees from the full list,
 * applying an optional role filter and a free-text search.
 */
export const useFilteredEmployees = (employees, { role, search }) => {
  const roleOptions = useMemo(() => {
    const set = new Set(employees.map((e) => e.role).filter(Boolean));
    return Array.from(set);
  }, [employees]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return employees
      .filter((e) => !role || e.role === role)
      .filter(
        (e) =>
          !term ||
          e.name.toLowerCase().includes(term) ||
          e.role.toLowerCase().includes(term),
      );
  }, [employees, role, search]);

  return { filtered, roleOptions };
};
