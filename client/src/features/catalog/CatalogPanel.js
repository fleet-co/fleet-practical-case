"use client";

import { useState } from "react";
import Table from "../../components/Table";
import { useMemo } from "react";
import { useEffect } from "react";
import { useCallback } from "react";
import Cart from "../cart/Cart";

export default function CatalogPanel({ products, setStatusMessage, setErrors }) {
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

	function handleIncreaseQuantity(productId) {
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
	}

	function handleDecreaseQuantity(productId) {
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
	}

	function handleRemoveFromCart(productId) {
		setSelectedProducts((previousItems) =>
			previousItems.filter((item) => item.id !== productId),
		);
	}

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

	return (
		<div className="catalog-layout">
			<section className="panel catalog-main">
				<h3>Filters</h3>
				<div className="filters catalog-filters">
					<label>
						Search
						<input
							value={productSearch}
							onChange={(event) => setProductSearch(event.target.value)}
							placeholder="Search name / price / configuration"
						/>
					</label>
				</div>

				<h3>Product list</h3>
				<Table
					columns={productTableColumns}
					rows={filteredProducts}
					emptyMessage="No products found"
				/>
			</section>
			<aside className="catalog-sidebar">
				<Cart
					items={selectedProducts}
					resetCart={() => {
						setSelectedProducts([])
					}}
					setStatusMessage={setStatusMessage}
					setErrors={setErrors}
					onIncreaseQuantity={handleIncreaseQuantity}
					onDecreaseQuantity={handleDecreaseQuantity}
					onRemoveItem={handleRemoveFromCart}
				/>
			</aside>
		</div>
	);
}
