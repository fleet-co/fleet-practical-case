export async function fetchProducts() {
    const response = await fetch("/api/products");
    const json = await response.json();
    if (!response.ok) {
        throw new Error(json.message || "Could not load products");
    }
    return json;
}