import { useState } from "react";
import { useOrders, useOrder } from "../hooks";
import DataTable from "../../../components/DataTable";

const ORDER_COLUMNS = ["Order #", "Date", "Total", "Status", "Actions"];
const DETAIL_COLUMNS = ["Product", "Unit price", "Quantity", "Subtotal"];

export default function OrdersPage() {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const { data: orders = [], isLoading } = useOrders();
  const { data: orderDetail } = useOrder(selectedOrderId);

  return (
    <section className="panel">
      <h2>Order history</h2>

      <DataTable
        columns={ORDER_COLUMNS}
        data={orders}
        isLoading={isLoading}
        emptyMessage="No orders yet"
        renderRow={(order) => (
          <tr key={order.id}>
            <td>{order.id}</td>
            <td>{new Date(order.created_at).toLocaleString()}</td>
            <td>${order.total.toFixed(2)}</td>
            <td><span className={`badge badge-${order.status}`}>{order.status}</span></td>
            <td>
              <button
                type="button"
                onClick={() =>
                  setSelectedOrderId(selectedOrderId === order.id ? null : order.id)
                }
              >
                {selectedOrderId === order.id ? "Hide details" : "View details"}
              </button>
            </td>
          </tr>
        )}
      />

      {orderDetail && selectedOrderId && (
        <div className="order-detail">
          <h3>Order #{orderDetail.id} details</h3>
          <DataTable
            columns={DETAIL_COLUMNS}
            data={orderDetail.items || []}
            renderRow={(item) => (
              <tr key={item.id}>
                <td>{item.product_name}</td>
                <td>${item.unit_price.toFixed(2)}</td>
                <td>{item.quantity}</td>
                <td>${(item.unit_price * item.quantity).toFixed(2)}</td>
              </tr>
            )}
          />
        </div>
      )}
    </section>
  );
}
