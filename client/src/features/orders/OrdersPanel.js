"use client";

import { useState } from "react";
import Table from "../../components/Table";
import { useMemo } from "react";
import { useEffect } from "react";

export default function OrdersPanel({ orders }) {
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [orderSearch, setOrderSearch] = useState("");

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
        ],
        [],
    );

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
            </section>
        </div>
    );
}
