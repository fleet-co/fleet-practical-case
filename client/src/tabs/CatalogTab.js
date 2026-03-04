import { useEffect, useMemo, useState } from "react";

/**
 * Tab for browsing the product catalog and placing orders.
 *
 * Displays the catalog as a filterable table and a cart sidebar. Filtering is
 * applied locally via a free-text search across product name and configuration.
 * The cart is managed entirely in local state (cartItems with an added cartQuantity
 * field); quantities are capped at the item's available stock. On order confirmation,
 * a POST /api/orders is sent with all cart line items, then the cart is cleared and
 * fetchOrders is called so App can refresh its orders list. Errors are surfaced via
 * the onError callback; the cart is intentionally preserved on failure so the user
 * can retry without re-adding items.
 *
 * @param {Object}   props
 * @param {Array}    props.catalog        - Full product catalog from the server.
 * @param {boolean}  props.loadingCatalog - Whether App is currently fetching the catalog.
 * @param {Function} props.fetchOrders    - Callback to refresh the orders list in App after a purchase.
 * @param {Function} props.onError        - Callback to surface error messages in the global banner.
 * @returns {JSX.Element}
 */
export default function CatalogTab({
  catalog,
  loadingCatalog,
  fetchOrders,
  onError,
}) {
  const [filteredCatalog, setFilteredCatalog] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [cartStatusMessage, setCartStatusMessage] = useState("");

  // Compute the cart total from effective_price × cartQuantity for each line item
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.effective_price * item.cartQuantity, 0),
    [cartItems],
  );

  // Recompute the filtered catalog whenever the source data or search term changes
  useEffect(() => {
    let next = [...catalog];
    if (catalogSearch.trim()) {
      const normalized = catalogSearch.toLowerCase();
      next = next.filter((item) =>
        String(item.name || "").toLowerCase().includes(normalized) ||
        String(item.configuration || "").toLowerCase().includes(normalized),
      );
    }
    setFilteredCatalog(next);
  }, [catalog, catalogSearch]);

  // Auto-clear the cart status message after 2.5 s
  useEffect(() => {
    if (!cartStatusMessage) return undefined;
    const timer = window.setTimeout(() => setCartStatusMessage(""), 2500);
    return () => window.clearTimeout(timer);
  }, [cartStatusMessage]);

  /**
   * Adds an item to the cart. If the item is already present, increments its
   * cartQuantity up to the item's stock limit instead of adding a duplicate entry.
   *
   * @param {{ id: number, effective_price: number, stock: number }} item
   */
  function addToCart(item) {
    setCartItems((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        // Item already in cart — increment quantity, capped at available stock
        return prev.map((c) =>
          c.id === item.id
            ? { ...c, cartQuantity: Math.min(c.stock, c.cartQuantity + 1) }
            : c,
        );
      }
      return [...prev, { ...item, cartQuantity: 1 }];
    });
  }

  /**
   * Removes an item from the cart entirely.
   *
   * @param {number} itemId
   */
  function removeFromCart(itemId) {
    setCartItems((prev) => prev.filter((c) => c.id !== itemId));
  }

  /**
   * Increments the cartQuantity for an item, capped at its available stock.
   *
   * @param {number} itemId
   */
  function incrementCartItem(itemId) {
    setCartItems((prev) =>
      prev.map((c) =>
        c.id === itemId
          ? { ...c, cartQuantity: Math.min(c.stock, c.cartQuantity + 1) }
          : c,
      ),
    );
  }

  /**
   * Decrements the cartQuantity for an item, floored at 1 (use removeFromCart to remove).
   *
   * @param {number} itemId
   */
  function decrementCartItem(itemId) {
    setCartItems((prev) =>
      prev.map((c) =>
        c.id === itemId ? { ...c, cartQuantity: Math.max(1, c.cartQuantity - 1) } : c,
      ),
    );
  }

  /**
   * Sends the current cart as a POST /api/orders request.
   * On success the cart is cleared and fetchOrders is called to update App.
   * On failure onError is called and the cart is preserved so the user can retry.
   *
   * @async
   * @returns {Promise<void>}
   */
  async function confirmOrder() {
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            variantId: item.id,
            quantity: item.cartQuantity,
          })),
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Could not confirm order");
      // Clear the cart and notify the user on success
      setCartItems([]);
      setCartStatusMessage("Order confirmed");
      await fetchOrders();
    } catch (error) {
      onError(`Order failed: ${error.message}`);
    }
  }

  return (
    <div className="catalog-tab-layout">
      <section className="panel">
        <h3>Filters</h3>
        <div className="filters">
          <label>
            Search
            <input
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Search name / configuration"
            />
          </label>
        </div>

        <h3>Products {loadingCatalog ? "(loading...)" : ""}</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Net Unit price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCatalog.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.configuration}</td>
                <td>{item.stock}</td>
                <td>
                  {item.effective_price.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </td>
                <td>
                  <button
                    type="button"
                    disabled={item.stock === 0}
                    onClick={() => addToCart(item)}
                  >
                    Add to cart
                  </button>
                </td>
              </tr>
            ))}
            {filteredCatalog.length === 0 ? (
              <tr>
                <td colSpan="5">No catalog items found</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <aside className="panel cart-sidebar">
        <h3>Cart {cartItems.length > 0 ? `(${cartItems.length})` : ""}</h3>
        {cartItems.length === 0 ? (
          <p className="cart-empty">Your cart is empty.</p>
        ) : (
          <>
            <ul className="cart-list">
              {cartItems.map((item, index) => (
                <li
                  key={item.id}
                  className={index === cartItems.length - 1 ? "cart-item-last" : "cart-item"}
                >
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-row">
                    <div className="cart-item-controls">
                      <button
                        type="button"
                        onClick={() => decrementCartItem(item.id)}
                        disabled={item.cartQuantity <= 1}
                      >
                        −
                      </button>
                      <span>{item.cartQuantity}</span>
                      <button
                        type="button"
                        onClick={() => incrementCartItem(item.id)}
                        disabled={item.cartQuantity >= item.stock}
                      >
                        +
                      </button>
                    </div>
                    <span className="cart-item-subtotal">
                      {(item.effective_price * item.cartQuantity).toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </span>
                    <button
                      type="button"
                      className="cart-item-remove"
                      onClick={() => removeFromCart(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="cart-total">
              <span>Total</span>
              <span>
                {cartTotal.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
              </span>
            </div>
            {cartStatusMessage ? (
              <p className="status success">{cartStatusMessage}</p>
            ) : null}
            <button type="button" className="cart-confirm" onClick={confirmOrder}>
              Confirm order
            </button>
          </>
        )}
      </aside>
    </div>
  );
}
