import { useMemo } from "react";

export default function useCart({
	items = [],
	total,
	setStatusMessage,
	setErrors,
	resetCart,
	refreshOrders,
	refreshProducts,
}) {
	const cartTotal = useMemo(
		() => total ?? items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0),
		[items, total],
	);

	const hasQuantityOverStock = useMemo(
		() =>
			items.some((item) => {
				const availableStock = Number(item.availableStock ?? 0);
				return Number(item.quantity || 0) > availableStock;
			}),
		[items],
	);

	async function submitOrder(event) {
		event.preventDefault();

		if (hasQuantityOverStock) {
			setErrors((prev) => [...prev, "Order save failed: quantity exceeds available stock"]);
			return;
		}

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
			if (typeof refreshProducts === "function") {
				await refreshProducts();
			}
		} catch (error) {
			setErrors((prev) => [...prev, `Order save failed: ${error.message}`]);
		}
	}

	return {
		cartTotal,
		hasQuantityOverStock,
		submitOrder,
	};
}
