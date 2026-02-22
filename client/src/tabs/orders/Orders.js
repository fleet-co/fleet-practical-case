import styles from "../catalog/Catalog.module.css";
import {useOrdersViewModel} from "./useOrders";
import {formatPrice} from "../../utils/formatPrice"; // Reuse your panel/sidebar styles

function Orders() {
  const viewModel = useOrdersViewModel();

  return (
    <section className="panel">
      <div className={styles.catalog}>
        <h3>Order History</h3>

        {viewModel.displayLoadingState && <p>Loading orders...</p>}
        {viewModel.displayErrorState && <p style={{ color: "red" }}>Error loading orders!</p>}
        {viewModel.displayEmptyState && <p>No orders found in your history.</p>}

        {viewModel.displayContent && viewModel.ordersContent.map((order) => (
          <div key={order.id} style={{ marginBottom: "2rem", border: "1px solid #eee", borderRadius: "8px", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}>
              <strong>Order #{order.id}</strong>
              <span>{new Date(order.created_at).toLocaleString()}</span>
            </div>

            <table style={{ width: "100%", textAlign: "left" }}>
              <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Unit Price</th>
                <th>Qty</th>
                <th>Line Total</th>
              </tr>
              </thead>
              <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.product_name} <br />
                    <small style={{ color: "#666" }}>
                      (item.configuration)
                    </small>
                  </td>
                  <td><code>{item.sku}</code></td>
                  <td>{formatPrice(item.unit_price)}</td>
                  <td>{item.quantity}</td>
                  <td>{formatPrice(item.line_total)}</td>
                </tr>
              ))}
              </tbody>
              <tfoot>
              <tr>
                <td colSpan="4" style={{ textAlign: "right", paddingTop: "1rem" }}>
                  <strong>Total Amount:</strong>
                </td>
                <td style={{ paddingTop: "1rem" }}>
                  <strong>{formatPrice(order.total_amount)}</strong>
                </td>
              </tr>
              </tfoot>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Orders;
