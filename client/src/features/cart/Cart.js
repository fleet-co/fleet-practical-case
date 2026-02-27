import useCart from "./useCart";
import "./Cart.css";

export default function Cart({
	items = [],
	total,
	setStatusMessage,
	setErrors,
	resetCart,
	refreshOrders,
	refreshProducts,
	onIncreaseQuantity,
	onDecreaseQuantity,
	onRemoveItem,
}) {
	const { cartTotal, submitOrder } = useCart({
		items,
		total,
		setStatusMessage,
		setErrors,
		resetCart,
		refreshOrders,
		refreshProducts,
	});

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
								disabled={Number(item.quantity || 0) >= Number(item.availableStock || 0)}
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
				<button
					type="button"
					className="cart-create-order-button"
					onClick={submitOrder}
					disabled={items.some(
						(item) => Number(item.quantity || 0) > Number(item.availableStock || 0),
					)}>
					Order
				</button>
			)}
		</section>
	);
}
