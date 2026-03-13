import { useMemo } from "react";

/**
 * Derives a filtered list of devices from the full list,
 * applying optional type, owner, and free-text search filters.
 */
export const useFilteredDevices = (devices, { type, owner, search }) => {
  const typeOptions = useMemo(() => {
    const set = new Set(devices.map((d) => d.type).filter(Boolean));
    return Array.from(set);
  }, [devices]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return devices
      .filter((d) => !type || d.type === type)
      .filter((d) => !owner || String(d.owner_id) === owner)
      .filter(
        (d) =>
          !term ||
          d.name.toLowerCase().includes(term) ||
          d.type.toLowerCase().includes(term),
      );
  }, [devices, type, owner, search]);

  return { filtered, typeOptions };
};
