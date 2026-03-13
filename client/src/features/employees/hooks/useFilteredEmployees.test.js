import { renderHook } from "@testing-library/react";
import { useFilteredEmployees } from "./useFilteredEmployees";

const EMPLOYEES = [
  { id: 1, name: "Alice Martin", role: "Developer" },
  { id: 2, name: "Bob Dupont", role: "Designer" },
  { id: 3, name: "Charlie Dev", role: "Developer" },
];

describe("useFilteredEmployees", () => {
  it("returns all employees when no filters are applied", () => {
    const { result } = renderHook(() =>
      useFilteredEmployees(EMPLOYEES, { role: "", search: "" }),
    );
    expect(result.current.filtered).toHaveLength(3);
  });

  it("filters by role", () => {
    const { result } = renderHook(() =>
      useFilteredEmployees(EMPLOYEES, { role: "Developer", search: "" }),
    );
    expect(result.current.filtered).toHaveLength(2);
    expect(result.current.filtered.every((e) => e.role === "Developer")).toBe(true);
  });

  it("filters by search term on name", () => {
    const { result } = renderHook(() =>
      useFilteredEmployees(EMPLOYEES, { role: "", search: "alice" }),
    );
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].name).toBe("Alice Martin");
  });

  it("filters by search term on role", () => {
    const { result } = renderHook(() =>
      useFilteredEmployees(EMPLOYEES, { role: "", search: "design" }),
    );
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].name).toBe("Bob Dupont");
  });

  it("combines role and search filters", () => {
    const { result } = renderHook(() =>
      useFilteredEmployees(EMPLOYEES, { role: "Developer", search: "charlie" }),
    );
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].name).toBe("Charlie Dev");
  });

  it("extracts unique role options", () => {
    const { result } = renderHook(() =>
      useFilteredEmployees(EMPLOYEES, { role: "", search: "" }),
    );
    expect(result.current.roleOptions).toEqual(
      expect.arrayContaining(["Developer", "Designer"]),
    );
    expect(result.current.roleOptions).toHaveLength(2);
  });

  it("returns empty when no match", () => {
    const { result } = renderHook(() =>
      useFilteredEmployees(EMPLOYEES, { role: "", search: "zzz" }),
    );
    expect(result.current.filtered).toHaveLength(0);
  });
});
