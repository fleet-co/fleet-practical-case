import { useEffect, useMemo, useState } from "react";

export default function useOrders(orders = []) {
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

	const orderTableColumns = useMemo(
		() => [
			{ key: "created_at", header: "Date" },
			{ key: "total_amount", header: "Total amount ($)" },
			{ key: "item_count", header: "Item count" },
			{
				key: "actions",
				header: "Actions",
				render: (row) => (
					<button type="button" onClick={() => handleShowDetails(row)}>
						Show details
					</button>
				),
			},
		],
		[],
	);

	function resetOrderDetails() {
		setSelectedOrder(null);
		setSelectedOrderDetails([]);
		setDetailsError("");
	}

	return {
		filteredOrders,
		orderSearch,
		setOrderSearch,
		selectedOrder,
		selectedOrderDetails,
		loadingDetails,
		detailsError,
		orderTableColumns,
		resetOrderDetails,
	};
}
