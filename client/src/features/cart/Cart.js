export default function Cart({
	items = [],
	total,
	setStatusMessage,
	setErrors,
	resetCart,
	onIncreaseQuantity,
	onDecreaseQuantity,
	onRemoveItem,
}) {
	const cartTotal = total ?? items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);

	async function submitOrder(event) {
		event.preventDefault();

		const payload = {
			totalAmount: cartTotal,
			itemCount: items.length,
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
		} catch (error) {
			setErrors((prev) => [...prev, `Order save failed: ${error.message}`]);
		}
	}

	return (
		<section className="cart">
			<h3>Your cart</h3>

			<div className="cart-items">
				{items.map((item) => (
					<article key={item.id} className="cart-item">
						<strong className="cart-item-name">{item.name}</strong>
						<div className="cart-quantity" aria-label={`Quantity ${item.name}`}>
							<button
								type="button"
								aria-label={`Decrease ${item.name}`}
								onClick={() => onDecreaseQuantity?.(item.id)}>
								-
							</button>
							<span>{item.quantity}</span>
							<button
								type="button"
								aria-label={`Increase ${item.name}`}
								onClick={() => onIncreaseQuantity?.(item.id)}>
								+
							</button>
						</div>
						<strong className="cart-item-total">${item.totalPrice}</strong>
						<button
							type="button"
							className="cart-item-remove"
							aria-label={`Remove ${item.name}`}
							onClick={() => onRemoveItem?.(item.id)}>
							×
						</button>
					</article>
				))}
			</div>

			<div className="cart-total">
				<span>Total cart</span>
				<strong>${cartTotal}</strong>
			</div>

			{items && items.length > 0 && (
				<button type="button" className="cart-create-order-button" onClick={submitOrder}>
					Order
				</button>
			)}
		</section>
	);
}
