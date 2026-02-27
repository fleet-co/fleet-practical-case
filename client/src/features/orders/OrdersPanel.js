"use client";

import Table from "../../components/Table";
import OrderDetails from "./OrderDetails";
import useOrders from "./useOrders";
import "./OrdersPanel.css";

export default function OrdersPanel({ orders }) {
    const {
        filteredOrders,
        orderSearch,
        setOrderSearch,
        selectedOrder,
        selectedOrderDetails,
        loadingDetails,
        detailsError,
        orderTableColumns,
        resetOrderDetails,
    } = useOrders(orders);

    return (
        <div >
            <section className="panel">
                <h3>Filters</h3>
                <div className="filters">
                    <label>
                        Search
                        <input
                            value={orderSearch}
                            onChange={(event) => setOrderSearch(event.target.value)}
                            placeholder="Search ID / date / total amount / item count"
                        />
                    </label>
                </div>

                <h3>Order list</h3>
                <Table
                    columns={orderTableColumns}
                    rows={filteredOrders}
                    emptyMessage="No orders found"
                />

                {(selectedOrder || loadingDetails || detailsError) ? (
                    <OrderDetails
                        order={selectedOrder}
                        items={selectedOrderDetails}
                        loading={loadingDetails}
                        error={detailsError}
                        reset={resetOrderDetails}
                    />
                ) : null}
            </section>
        </div>
    );
}
