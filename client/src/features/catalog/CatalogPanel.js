"use client";

import Table from "../../components/Table";
import Cart from "../cart/Cart";
import useCatalog from "./useCatalog";
import "./CatalogPanel.css";

export default function CatalogPanel({ products, setStatusMessage, setErrors, refreshOrders }) {
	const {
		productSearch,
		setProductSearch,
		filteredProducts,
		productTableColumns,
		selectedProducts,
		handleIncreaseQuantity,
		handleDecreaseQuantity,
		handleRemoveFromCart,
		resetCart,
	} = useCatalog(products);

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
					resetCart={resetCart}
					setStatusMessage={setStatusMessage}
					setErrors={setErrors}
					refreshOrders={refreshOrders}
					onIncreaseQuantity={handleIncreaseQuantity}
					onDecreaseQuantity={handleDecreaseQuantity}
					onRemoveItem={handleRemoveFromCart}
				/>
			</aside>
		</div>
	);
}
