import { useMemo } from "react";
import Table from "../../components/Table";

export default function OrderDetails({
	order,
	items = [],
	loading = false,
	error = "",
	reset,
}) {
	const safeItems = Array.isArray(items) ? items : [];
	const orderItemsColumns = useMemo(
		() => [
			{ key: "product_name", header: "Product" },
			{ key: "configuration", header: "Configuration" },
			{ key: "unit_price", header: "Unit price ($)" },
			{ key: "quantity", header: "Quantity" },
			{ key: "line_total", header: "Line total ($)" },
		],
		[],
	);

	return (
		<section className="order-details">
			<h3>Order details</h3>
			{order ? (
				<p>
					<strong>Order #{order.id}</strong> - Date: {order.created_at} - Total: ${order.total_amount} - Items: {order.item_count}
				</p>
			) : null}

			{loading ? <p>Loading details...</p> : null}
			{error ? <p className="status error">{error}</p> : null}

			{!loading && !error && safeItems.length > 0 ? (
				<Table
					columns={orderItemsColumns}
					rows={safeItems}
					emptyMessage="No items found for this order."
				/>
			) : null}

			{!loading && !error && order && safeItems.length === 0 ? (
				<p>No items found for this order.</p>
			) : null}

			<button type="button" onClick={reset}>Close details</button>
		</section>
	);
}
