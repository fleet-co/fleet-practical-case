import { renderHook } from "@testing-library/react";
import { useFilteredProducts } from "./useFilteredProducts";

const PRODUCTS = [
  { id: 1, name: "Keyboard", description: "Mechanical keyboard", category: "Peripherals", price: 89, stock: 10 },
  { id: 2, name: "Monitor", description: "27 inch 4K display", category: "Displays", price: 450, stock: 5 },
  { id: 3, name: "Mouse", description: "Wireless mouse", category: "Peripherals", price: 35, stock: 20 },
  { id: 4, name: "Webcam", description: "HD webcam for calls", category: "Accessories", price: 60, stock: 8 },
];

describe("useFilteredProducts", () => {
  it("returns all products when no filters are applied", () => {
    const { result } = renderHook(() =>
      useFilteredProducts(PRODUCTS, { category: "", search: "" }),
    );
    expect(result.current.filtered).toHaveLength(4);
  });

  it("filters by category", () => {
    const { result } = renderHook(() =>
      useFilteredProducts(PRODUCTS, { category: "Peripherals", search: "" }),
    );
    expect(result.current.filtered).toHaveLength(2);
    expect(result.current.filtered.every((p) => p.category === "Peripherals")).toBe(true);
  });

  it("filters by search term on name", () => {
    const { result } = renderHook(() =>
      useFilteredProducts(PRODUCTS, { category: "", search: "monitor" }),
    );
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].name).toBe("Monitor");
  });

  it("filters by search term on description", () => {
    const { result } = renderHook(() =>
      useFilteredProducts(PRODUCTS, { category: "", search: "wireless" }),
    );
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].name).toBe("Mouse");
  });

  it("combines category and search filters", () => {
    const { result } = renderHook(() =>
      useFilteredProducts(PRODUCTS, { category: "Peripherals", search: "key" }),
    );
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].name).toBe("Keyboard");
  });

  it("extracts sorted unique categories", () => {
    const { result } = renderHook(() =>
      useFilteredProducts(PRODUCTS, { category: "", search: "" }),
    );
    expect(result.current.categories).toEqual(["Accessories", "Displays", "Peripherals"]);
  });

  it("returns empty when no match", () => {
    const { result } = renderHook(() =>
      useFilteredProducts(PRODUCTS, { category: "", search: "zzz" }),
    );
    expect(result.current.filtered).toHaveLength(0);
  });
});
