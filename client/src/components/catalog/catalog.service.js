export async function fetchProducts() {
    // Simulate fetching products from an API
      const response = await fetch("/api/products");
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.message || "Could not load products");
      }
      return json;
}