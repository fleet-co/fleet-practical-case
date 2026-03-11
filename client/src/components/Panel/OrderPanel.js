import { useOrders } from "../../hooks/useOrders";
import "./Panel.css";
import "./OrderPanel.css";

function OrderPanel() {
  const { data: orders = [], isLoading } = useOrders();

  console.log(orders);
  

  return (
    <section className="panel">
      <h2>Order history {isLoading ? "(loading...)" : ""}</h2>

      {orders.length === 0 && !isLoading ? (
        <p>No orders yet</p>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <strong>Order #{order.id}</strong>
                <span className="order-status">{order.status}</span>
                <span>{new Date(order.created_at).toLocaleString()}</span>
                <span className="order-total">${Number(order.total).toFixed(2)}</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.lines || []).map((line) => (
                    <tr key={line.id}>
                      <td>{line.product_name}</td>
                      <td>{line.quantity}</td>
                      <td>${Number(line.unit_price).toFixed(2)}</td>
                      <td>${(line.quantity * line.unit_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default OrderPanel;
