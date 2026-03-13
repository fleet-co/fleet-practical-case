import { useState } from "react";
import { useProducts, useDeleteProduct } from "../hooks";
import { useFilteredProducts } from "../hooks/useFilteredProducts";
import { useAddToCart } from "../../cart/hooks";
import ProductForm from "./ProductForm";
import CartSidebar from "../../cart/components/CartSidebar";
import DataTable from "../../../components/DataTable";
import SelectFilter from "../../../components/SelectFilter";
import SearchInput from "../../../components/SearchInput";

const COLUMNS = ["Name", "Category", "Price", "Stock", "Actions"];

export default function CatalogPage() {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);

  const { data: products = [], isLoading } = useProducts();
  const deleteMutation = useDeleteProduct();
  const addToCart = useAddToCart();
  const { filtered, categories } = useFilteredProducts(products, { category: categoryFilter, search });

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await deleteMutation.mutateAsync(id);
  };

  return (
    <div className="catalog-layout">
      <section className="panel catalog-main">
        <h2>{editingProduct ? "Edit product" : "Add product"}</h2>
        <ProductForm
          key={editingProduct?.id || "new"}
          editingProduct={editingProduct}
          onDone={() => setEditingProduct(null)}
        />

        <h3>Filters</h3>
        <div className="filters">
          <SelectFilter label="Category" value={categoryFilter} onChange={setCategoryFilter} options={categories} />
          <SearchInput value={search} onChange={setSearch} placeholder="Search products" />
        </div>

        <h3>Products</h3>
        <DataTable
          columns={COLUMNS}
          data={filtered}
          isLoading={isLoading}
          emptyMessage="No products found"
          renderRow={(product) => (
            <tr key={product.id}>
              <td>
                <strong>{product.name}</strong>
                {product.description && (
                  <div className="product-description">{product.description}</div>
                )}
              </td>
              <td>{product.category}</td>
              <td>${product.price.toFixed(2)}</td>
              <td>{product.stock}</td>
              <td>
                <button
                  type="button"
                  onClick={() => addToCart.mutate({ productId: product.id, quantity: 1 })}
                  disabled={product.stock === 0}
                >
                  Add to cart
                </button>
                <button type="button" onClick={() => setEditingProduct(product)}>
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(product.id)}>
                  Delete
                </button>
              </td>
            </tr>
          )}
        />
      </section>

      <CartSidebar />
    </div>
  );
}
