import { useCart, useUpdateCartItem, useRemoveCartItem } from "../hooks";
import { useCreateOrder } from "../../orders/hooks";
import Loader from "../../../components/Loader";

export default function CartSidebar() {
  const { data: cart, isLoading } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const createOrder = useCreateOrder();

  const items = cart?.items || [];
  const total = cart?.total || 0;

  const handleQuantityChange = (id, quantity) => {
    if (quantity < 1) return;
    updateItem.mutate({ id, quantity });
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    await createOrder.mutateAsync();
  };

  return (
    <aside className="cart-sidebar">
      <h3>Cart ({items.length})</h3>

      {isLoading ? <Loader /> : items.length === 0 ? (
        <p className="cart-empty">Your cart is empty</p>
      ) : (
        <>
          <ul className="cart-items">
            {items.map((item) => (
              <li key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <strong>{item.product_name}</strong>
                  <span>${item.unit_price.toFixed(2)}</span>
                </div>
                <div className="cart-item-controls">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="cart-remove"
                    onClick={() => removeItem.mutate(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="cart-total">
            <strong>Total: ${total.toFixed(2)}</strong>
          </div>
          <button
            type="button"
            className="cart-checkout"
            onClick={handleCheckout}
            disabled={createOrder.isPending}
          >
            {createOrder.isPending ? "Placing order..." : "Place order"}
          </button>
        </>
      )}
    </aside>
  );
}
