import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { fetchOrders } from "./orders.service";
import "./order.css";

const Orders = forwardRef((props, ref) => {
    const [orders, setOrders] = useState([]);

    const { setErrors } = props;

    async function refreshOrders() {
        try {
            const ordersData = await fetchOrders();
            setOrders(ordersData);
            console.log("Orders component mounted", ordersData);
        } catch (err) {
            setErrors((prev) => [...prev, err.message]);
        }
    }

    useImperativeHandle(ref, () => ({
        refreshOrders,
    }));

    useEffect(() => {
        refreshOrders();
    }, []);

    return (
        <section className="panel">
            <h2>Orders</h2>
            {orders.length === 0 ? (
                <p>No orders found.</p>
            ) : (
                orders.map(([order_id, order]) => (
                    <div key={order_id} className="order-container">
                        <div className="order-header">
                            <p><b>Order ID:</b> {order_id}</p>
                            <p><b>Order Date:</b> {new Date(order[0].order_date).toLocaleString()}</p>
                            <p><b>Total Price:</b> ${order[0].total_price}</p>
                        </div>
                        <h4>Items:</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Product Name</th>
                                    <th>Configuration</th>
                                    <th>SKU</th>
                                    <th>Unit Price</th>
                                    <th>Quantity</th>
                                    <th>Line Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.map((item, index) => (
                                    <tr key={index}>
                                        <td>{item.product_name}</td>
                                        <td>{item.configuration}</td>
                                        <td>{item.sku}</td>
                                        <td>${item.unit_price}</td>
                                        <td>{item.quantity}</td>
                                        <td>${item.line_total}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))
            )}
        </section>
    );
});

export default Orders;
