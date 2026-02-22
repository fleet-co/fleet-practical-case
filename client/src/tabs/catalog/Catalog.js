import styles from "./Catalog.module.css";
import {formatPrice} from "../../utils/formatPrice";
import {useCartViewModel, useCatalogViewModel} from "./useCatalog";

function Catalog() {
  const catalogViewModel = useCatalogViewModel()
  const cartViewModel = useCartViewModel()

  return (
    <section className="panel">
      <div className={styles.withSidebar}>
        <div className={styles.cartSidebar}>
          <h3>Cart</h3>
          {cartViewModel.isCartEmpty ? "Empty cart" : (
            <table>
              <thead>
              <tr>
                <th>Name</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
              </thead>
              <tbody>
              {cartViewModel.cart.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.quantity}</td>
                  <td>{formatPrice(product.totalPrice)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => cartViewModel.addProductToCart(product)}
                    >
                      Add 1
                    </button>
                    <button
                      type="button"
                      onClick={() => cartViewModel.removeOneFromCart(product)}
                    >
                      Remove 1
                    </button>
                    <button
                      type="button"
                      onClick={() => cartViewModel.removeAllFromCart(product)}
                    >
                      Remove all
                    </button>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          )}
          <div>
            <h4>Subtotal</h4>
            {formatPrice(cartViewModel.subtotal)}
          </div>
          <div>
            <button
              type="button"
              onClick={cartViewModel.checkout}
              disabled={cartViewModel.isCartEmpty || cartViewModel.isSubmitting}
              style={{ padding: "10px", width: "100%", cursor: "pointer" }}
            >
              {cartViewModel.isSubmitting ? "Processing..." : "Checkout"}
            </button>
          </div>
        </div>

        <div className={styles.catalog}>
          <h3>Catalog</h3>
          {catalogViewModel.displayLoadingState && "Loading..."}
          {catalogViewModel.displayErrorState && "Error!"}
          {catalogViewModel.displayEmptyCatalogState && "The catalog is empty"}
          {catalogViewModel.displayCatalogContent && (
            <table>
              <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
              </thead>
              <tbody>
              {catalogViewModel.catalogContent.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{formatPrice(product.price)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => cartViewModel.addProductToCart(product)}
                    >
                      Add 1 to cart
                    </button>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  )
}

export default Catalog;
