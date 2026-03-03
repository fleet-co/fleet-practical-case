export default function OrdersTab({ orders, loadingOrders }) {
  return (
    <section className="panel">
      <h2>Orders {loadingOrders ? "(loading...)" : ""}</h2>
      {orders.length === 0 ? (
        <p className="cart-empty">No orders yet.</p>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const total = order.items.reduce(
              (sum, item) => sum + item.unit_price * item.quantity,
              0,
            );
            return (
              <article key={order.id} className="order-card">
                <div className="order-card-header">
                  <span className="order-card-id">Order #{order.id}</span>
                  <span className="order-card-date">
                    {new Date(order.created_at).toLocaleString("fr-FR")}
                  </span>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Configuration</th>
                      <th>Qty</th>
                      <th>Unit price</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.product_name}</td>
                        <td>{item.configuration}</td>
                        <td>{item.quantity}</td>
                        <td>
                          {item.unit_price.toLocaleString("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                          })}
                        </td>
                        <td>
                          {(item.unit_price * item.quantity).toLocaleString(
                            "fr-FR",
                            { style: "currency", currency: "EUR" },
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="order-card-total">
                  <span>Total</span>
                  <span>
                    {total.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
