import "./OrdersPage.css";

function OrdersPage({ orders, loading }) {
  if (loading && !orders) {
    return <p>Loading orders...</p>;
  }

  const list = orders || [];

  return (
    <section className="orders-tab">
      <h2>Order history</h2>
      {list.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {list.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>
                  {order.created_at
                    ? new Date(order.created_at).toLocaleString()
                    : ""}
                </td>
                <td>
                  {order.total != null
                    ? `€${Number(order.total).toFixed(2)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default OrdersPage;
