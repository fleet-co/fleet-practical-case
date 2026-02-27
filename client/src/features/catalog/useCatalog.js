import { useCallback, useEffect, useMemo, useState } from "react";

export default function useCatalog(products = []) {
	const [selectedProducts, setSelectedProducts] = useState([]);
	const [filteredProducts, setFilteredProducts] = useState([]);
	const [productSearch, setProductSearch] = useState("");

	const handleAddToCart = useCallback((product) => {
		const unitPrice = Number((product.price ?? product.base_price) || 0);
		const cartItemId = product.variant_id
			? `variant-${product.variant_id}`
			: `product-${product.id}`;
		const itemName = product.configuration
			? `${product.name} - ${product.configuration}`
			: product.name;

		setSelectedProducts((previousItems) => {
			const existingItem = previousItems.find((item) => item.id === cartItemId);

			if (!existingItem) {
				return [
					...previousItems,
					{
						id: cartItemId,
						name: itemName,
						productId: product.id || null,
						productVariantId: product.variant_id || null,
						productName: product.name || "",
						configuration: product.configuration || "",
						sku: product.sku || "",
						quantity: 1,
						totalPrice: unitPrice,
						unitPrice,
					},
				];
			}

			return previousItems.map((item) => {
				if (item.id !== cartItemId) {
					return item;
				}

				const nextQuantity = item.quantity + 1;
				return {
					...item,
					quantity: nextQuantity,
					totalPrice: unitPrice * nextQuantity,
				};
			});
		});
	}, []);

	const handleIncreaseQuantity = useCallback((productId) => {
		setSelectedProducts((previousItems) =>
			previousItems.map((item) => {
				if (item.id !== productId) {
					return item;
				}

				const nextQuantity = item.quantity + 1;
				return {
					...item,
					quantity: nextQuantity,
					totalPrice: Number(item.unitPrice || 0) * nextQuantity,
				};
			}),
		);
	}, []);

	const handleDecreaseQuantity = useCallback((productId) => {
		setSelectedProducts((previousItems) =>
			previousItems
				.map((item) => {
					if (item.id !== productId) {
						return item;
					}

					const nextQuantity = item.quantity - 1;

					if (nextQuantity <= 0) {
						return null;
					}

					return {
						...item,
						quantity: nextQuantity,
						totalPrice: Number(item.unitPrice || 0) * nextQuantity,
					};
				})
				.filter(Boolean),
		);
	}, []);

	const handleRemoveFromCart = useCallback((productId) => {
		setSelectedProducts((previousItems) =>
			previousItems.filter((item) => item.id !== productId),
		);
	}, []);

	const resetCart = useCallback(() => {
		setSelectedProducts([]);
	}, []);

	useEffect(() => {
		let nextProducts = [...products];

		if (productSearch.trim()) {
			const normalized = productSearch.toLowerCase();
			nextProducts = nextProducts.filter((product) => {
				const finalPrice = Number((product.price ?? product.base_price) || 0);
				return (
					String(product.name || "")
						.toLowerCase()
						.includes(normalized) ||
					String(product.configuration || "")
						.toLowerCase()
						.includes(normalized) ||
					String(finalPrice)
						.toLowerCase()
						.includes(normalized)
				);
			});
		}

		setFilteredProducts(nextProducts);
	}, [products, productSearch]);

	const productTableColumns = useMemo(
		() => [
			{ key: "name", header: "Name" },
			{ key: "configuration", header: "Configuration" },
			{
				key: "stock",
				header: "Stock",
				render: (row) => {
					const stock = Number(row.stock || 0);
					return (
						<span className={stock === 0 ? "stock-value out-of-stock" : "stock-value"}>
							{stock}
						</span>
					);
				},
			},
			{ key: "price", header: "Price ($)" },
			{
				key: "actions",
				header: "Actions",
				render: (row) => {
					if (Number(row.stock || 0) <= 0) {
						return null;
					}

					return (
						<button type="button" onClick={() => handleAddToCart(row)}>
							Add to cart
						</button>
					);
				},
			},
		],
		[handleAddToCart],
	);

	return {
		productSearch,
		setProductSearch,
		filteredProducts,
		productTableColumns,
		selectedProducts,
		handleIncreaseQuantity,
		handleDecreaseQuantity,
		handleRemoveFromCart,
		resetCart,
	};
}
