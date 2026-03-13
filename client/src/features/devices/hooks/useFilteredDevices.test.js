import { renderHook } from "@testing-library/react";
import { useFilteredDevices } from "./useFilteredDevices";

const DEVICES = [
  { id: 1, name: "MacBook Pro", type: "Laptop", owner_id: 1 },
  { id: 2, name: "iPhone 15", type: "Phone", owner_id: 2 },
  { id: 3, name: "Dell XPS", type: "Laptop", owner_id: 1 },
  { id: 4, name: "Galaxy S24", type: "Phone", owner_id: 3 },
];

describe("useFilteredDevices", () => {
  it("returns all devices when no filters are applied", () => {
    const { result } = renderHook(() =>
      useFilteredDevices(DEVICES, { type: "", owner: "", search: "" }),
    );
    expect(result.current.filtered).toHaveLength(4);
  });

  it("filters by type", () => {
    const { result } = renderHook(() =>
      useFilteredDevices(DEVICES, { type: "Laptop", owner: "", search: "" }),
    );
    expect(result.current.filtered).toHaveLength(2);
    expect(result.current.filtered.every((d) => d.type === "Laptop")).toBe(true);
  });

  it("filters by owner", () => {
    const { result } = renderHook(() =>
      useFilteredDevices(DEVICES, { type: "", owner: "1", search: "" }),
    );
    expect(result.current.filtered).toHaveLength(2);
    expect(result.current.filtered.every((d) => d.owner_id === 1)).toBe(true);
  });

  it("filters by search term on name", () => {
    const { result } = renderHook(() =>
      useFilteredDevices(DEVICES, { type: "", owner: "", search: "iphone" }),
    );
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].name).toBe("iPhone 15");
  });

  it("combines type and owner filters", () => {
    const { result } = renderHook(() =>
      useFilteredDevices(DEVICES, { type: "Phone", owner: "2", search: "" }),
    );
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].name).toBe("iPhone 15");
  });

  it("extracts unique type options", () => {
    const { result } = renderHook(() =>
      useFilteredDevices(DEVICES, { type: "", owner: "", search: "" }),
    );
    expect(result.current.typeOptions).toEqual(
      expect.arrayContaining(["Laptop", "Phone"]),
    );
    expect(result.current.typeOptions).toHaveLength(2);
  });

  it("returns empty when no match", () => {
    const { result } = renderHook(() =>
      useFilteredDevices(DEVICES, { type: "Tablet", owner: "", search: "" }),
    );
    expect(result.current.filtered).toHaveLength(0);
  });
});
