import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import "./Panel.css";
import "./CatalogPanel.css";
import DataTable from "./DataTable";
import CartSidebar from "./CartSidebar";
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "../../hooks/useProducts";
import { useCart } from "../../hooks/useCart";
import { useCreateOrder } from "../../hooks/useOrders";

const CATEGORIES = ["Electronics", "Accessories", "Software", "Furniture", "Other"];

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  price: z.coerce.number().min(0),
  category: z.string().min(1),
  stock: z.coerce.number().int().min(0),
});

function CatalogPanel() {
  const { data: products = [], isLoading } = useProducts();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const cart = useCart();
  const createOrder = useCreateOrder();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", description: "", price: 0, category: "", stock: 0 },
  });

  const [editingId, setEditingId] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(
    () => window.localStorage.getItem("catalog_category_filter") || "",
  );
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    let result = products;
    if (categoryFilter) {
      result = result.filter((p) => p.category === categoryFilter);
    }
    if (search.trim()) {
      const normalized = search.toLowerCase();
      result = result.filter(
        (p) =>
          String(p.name || "").toLowerCase().includes(normalized) ||
          String(p.description || "").toLowerCase().includes(normalized),
      );
    }
    return result;
  }, [products, categoryFilter, search]);

  function handleCategoryFilterChange(value) {
    setCategoryFilter(value);
    window.localStorage.setItem("catalog_category_filter", value);
  }

  async function onSubmit(data) {
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
    reset();
    setEditingId(null);
  }

  async function handleDelete(productId) {
    if (!window.confirm("Delete this product?")) return;
    await deleteMutation.mutateAsync(productId);
  }

  function beginEdit(product) {
    setEditingId(product.id);
    reset(
      {
        name: product.name || "",
        description: product.description || "",
        price: product.price || 0,
        category: product.category || "",
        stock: product.stock || 0,
      },
      { keepDefaultValues: true },
    );
  }

  function cancelEdit() {
    reset();
    setEditingId(null);
  }

  async function handleCheckout() {
    if (cart.items.length === 0) return;
    await createOrder.mutateAsync({
      lines: cart.items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
    });
    cart.clear();
  }

  return (
    <div className="catalog-layout">
      <section className="panel catalog-main">
        <h2>{editingId ? "Edit product" : "Add product"}</h2>
        <form className="app-form" onSubmit={handleSubmit(onSubmit)}>
          <label>
            Name
            <input {...register("name")} placeholder="Product name" />
            {errors.name && <span className="field-error">{errors.name.message}</span>}
          </label>
          <label>
            Category
            <select {...register("category")}>
              <option value="">Select...</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.category && <span className="field-error">{errors.category.message}</span>}
          </label>
          <label>
            Price
            <input type="number" step="0.01" {...register("price")} />
            {errors.price && <span className="field-error">{errors.price.message}</span>}
          </label>
          <label>
            Stock
            <input type="number" {...register("stock")} />
            {errors.stock && <span className="field-error">{errors.stock.message}</span>}
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Description
            <input {...register("description")} placeholder="Optional description" />
          </label>
          <div className="form-buttons">
            <button type="submit">{editingId ? "Update" : "Create"}</button>
            {editingId ? (
              <button type="button" onClick={cancelEdit}>Cancel edit</button>
            ) : null}
          </div>
        </form>

        <h3>Filters</h3>
        <div className="filters">
          <label>
            Category
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryFilterChange(e.target.value)}
            >
              <option value="">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Search
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / description"
            />
          </label>
        </div>

        <h3>Product list {isLoading ? "(loading...)" : ""}</h3>
        <DataTable
          columns={[
            { key: "name", header: "Name" },
            { key: "category", header: "Category" },
            {
              key: "price",
              header: "Price",
              render: (p) => {
                console.log(p)
                return `$${Number(p.price).toFixed(2)}`},
            },
            { key: "stock", header: "Stock" },
          ]}
          data={filteredProducts}
          onEdit={beginEdit}
          onDelete={handleDelete}
          extraAction={(product) => {
            const inCart = cart.items.find((i) => i.product_id === product.id);
            const atLimit = product.stock <= 0 || (inCart && inCart.quantity >= product.stock);
            return (
              <button type="button" onClick={() => cart.addItem(product)} disabled={atLimit}>
                {product.stock <= 0 ? "Out of stock" : "Add to cart"}
              </button>
            );
          }}
          emptyMessage="No products found"
        />
      </section>

      <CartSidebar cart={cart} onCheckout={handleCheckout} isOrdering={createOrder.isPending} />
    </div>
  );
}

export default CatalogPanel;
