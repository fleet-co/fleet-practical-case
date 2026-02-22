function ProductCard({ product, onAddToCart }) {
  return (
    <li key={product.id} className="catalog-item">
      <div className="catalog-item-info">
        <strong>{product.name}</strong>
        <span className="catalog-price">
          €{Number(product.price).toFixed(2)}
        </span>
      </div>
      <div className="catalog-item-actions">
        <button
          type="button"
          onClick={() => onAddToCart(product.id, 1)}
        >
          Add to cart
        </button>
      </div>
    </li>
  );
}

export default ProductCard;
