import { useMemo } from "react";

export default function useCart({
	items = [],
	total,
	setStatusMessage,
	setErrors,
	resetCart,
	refreshOrders,
}) {
	const cartTotal = useMemo(
		() => total ?? items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0),
		[items, total],
	);

	async function submitOrder(event) {
		event.preventDefault();

		const orderItems = items.map((item) => {
			const unitPrice = Number(item.unitPrice || 0);
			const quantity = Number(item.quantity || 0);
			const lineTotal = Number(item.totalPrice || unitPrice * quantity);

			return {
				productId: item.productId || null,
				productVariantId: item.productVariantId || null,
				productName: item.productName || item.name || "",
				configuration: item.configuration || "",
				sku: item.sku || "",
				unitPrice,
				quantity,
				lineTotal,
			};
		});

		const payload = {
			totalAmount: cartTotal,
			itemCount: items.length,
			items: orderItems,
		};

		try {
			const response = await fetch("/api/orders", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const json = await response.json();
			if (!response.ok) {
				throw new Error(json.message || "Could not save order");
			}
			setStatusMessage("Order created");
			resetCart();
			if (typeof refreshOrders === "function") {
				await refreshOrders();
			}
		} catch (error) {
			setErrors((prev) => [...prev, `Order save failed: ${error.message}`]);
		}
	}

	return {
		cartTotal,
		submitOrder,
	};
}
