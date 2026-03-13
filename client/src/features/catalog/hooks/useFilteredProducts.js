import { useMemo } from "react";

/**
 * Derives a filtered list of products from the full list,
 * applying an optional category filter and a free-text search.
 */
export const useFilteredProducts = (products, { category, search }) => {
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products
      .filter((p) => !category || p.category === category)
      .filter(
        (p) =>
          !term ||
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term),
      );
  }, [products, category, search]);

  return { filtered, categories };
};
