import "./CartSidebar.css";

function CartSidebar({ cart, onCheckout, isOrdering }) {
  return (
    <aside className="cart-sidebar">
      <h2>Cart</h2>
      {cart.items.length === 0 ? (
        <p className="cart-empty">Your cart is empty</p>
      ) : (
        <>
          <ul className="cart-list">
            {cart.items.map((item) => (
              <li key={item.product_id} className="cart-item">
                <div className="cart-item-info">
                  <strong>{item.name}</strong>
                  <span>${(item.unit_price * item.quantity).toFixed(2)}</span>
                </div>
                <div className="cart-item-controls">
                  <button
                    type="button"
                    onClick={() =>
                      cart.updateQuantity(item.product_id, item.quantity - 1)
                    }
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() =>
                      cart.updateQuantity(item.product_id, item.quantity + 1)
                    }
                    disabled={item.quantity >= item.stock}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="cart-remove"
                    onClick={() => cart.removeItem(item.product_id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="cart-total">
            <strong>Total: ${cart.total.toFixed(2)}</strong>
          </div>
          <button
            type="button"
            className="cart-checkout"
            onClick={onCheckout}
            disabled={isOrdering}
          >
            {isOrdering ? "Placing order..." : "Place order"}
          </button>
        </>
      )}
    </aside>
  );
}

export default CartSidebar;
