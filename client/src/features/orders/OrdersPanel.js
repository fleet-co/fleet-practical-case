"use client";

import { useState } from "react";
import Table from "../../components/Table";
import { useMemo } from "react";
import { useEffect } from "react";
import OrderDetails from "./OrderDetails";

export default function OrdersPanel({ orders }) {
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [orderSearch, setOrderSearch] = useState("");
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedOrderDetails, setSelectedOrderDetails] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [detailsError, setDetailsError] = useState("");

    useEffect(() => {
        let nextOrders = [...orders];

        if (orderSearch.trim()) {
            const normalized = orderSearch.toLowerCase();
            nextOrders = nextOrders.filter((order) => {
                return (
                    String(order.id || "")
                        .toLowerCase()
                        .includes(normalized) ||
                    String(order.created_at || "")
                        .toLowerCase()
                        .includes(normalized) ||
                    String(order.total_amount || "")
                        .toLowerCase()
                        .includes(normalized) ||
                    String(order.item_count || "")
                        .toLowerCase()
                        .includes(normalized)
                );
            });
        }
        setFilteredOrders(nextOrders);
    }, [orders, orderSearch]);

    const orderTableColumns = useMemo(
        () => [
            { key: "created_at", header: "Date" },
            { key: "total_amount", header: "Total amount ($)" },
            { key: "item_count", header: "Item count" },
            {
                key: "actions",
                header: "Actions",
                render: (row) => (
                    <button
                        type="button"
                        onClick={() => handleShowDetails(row)}>
                        Show details
                    </button>
                ),
            },
        ],
        [],
    );

    async function handleShowDetails(order) {
        setLoadingDetails(true);
        setDetailsError("");

        try {
            const response = await fetch(`/api/orders/${order.id}`);
            const json = await response.json();

            if (!response.ok) {
                throw new Error(json.message || "Could not load order details");
            }

            setSelectedOrder(json.order || order);
            setSelectedOrderDetails(Array.isArray(json.items) ? json.items : []);
        } catch (error) {
            setSelectedOrder(order);
            setSelectedOrderDetails([]);
            setDetailsError(error.message || "Could not load order details");
        } finally {
            setLoadingDetails(false);
        }
    }

    function resetOrderDetails() {
        setSelectedOrder(null);
        setSelectedOrderDetails([]);
        setDetailsError("");
    }

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
