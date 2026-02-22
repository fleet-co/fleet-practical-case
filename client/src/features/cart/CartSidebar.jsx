import "./CartSidebar.css";

function CartSidebar({
  cart,
  products,
  onUpdateQuantity,
  onRemoveLine,
  onCreateOrder,
  creating,
}) {
  const lines = (cart || []).map((line) => {
    const product = (products || []).find((p) => p.id === line.productId);
    const price = line.price != null ? line.price : (product && product.price) || 0;
    const total = (line.quantity || 0) * Number(price);
    return { ...line, price, total, name: line.name || (product && product.name) || `Product #${line.productId}` };
  });

  const overallTotal = lines.reduce((sum, line) => sum + line.total, 0);
  const isEmpty = lines.length === 0;

  return (
    <aside className="cart-sidebar">
      <h3>Cart</h3>
      {isEmpty ? (
        <p className="cart-empty">Cart is empty.</p>
      ) : (
        <>
          <ul className="cart-lines">
            {lines.map((line) => (
              <li key={line.productId} className="cart-line">
                <span className="cart-line-name">{line.name}</span>
                <span className="cart-line-qty">
                  <input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => {
                      const q = Math.max(1, Math.floor(Number(e.target.value) || 1));
                      onUpdateQuantity(line.productId, q);
                    }}
                  />
                </span>
                <span className="cart-line-total">
                  €{line.total.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveLine(line.productId)}
                  aria-label="Remove line"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <p className="cart-total">
            <strong>Total: €{overallTotal.toFixed(2)}</strong>
          </p>
          <button
            type="button"
            onClick={onCreateOrder}
            disabled={creating}
          >
            {creating ? "Creating…" : "Create order"}
          </button>
        </>
      )}
    </aside>
  );
}

export default CartSidebar;
