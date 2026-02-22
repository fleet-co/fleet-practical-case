import "./CatalogPage.css";
import ProductCard from "./ProductCard";

function CatalogPage({ products, loading, error, onAddToCart }) {
  if (error) {
    return <p className="status error">{error}</p>;
  }
  if (loading) {
    return <p>Loading catalog...</p>;
  }
  if (!products || products.length === 0) {
    return <p>No products in catalog.</p>;
  }

  return (
    <section className="catalog-tab">
      <h2>Catalog</h2>
      <ul className="catalog-list">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
          />
        ))}
      </ul>
    </section>
  );
}

export default CatalogPage;
