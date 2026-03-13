import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateProduct, useUpdateProduct, useProductCategories } from "../hooks";

const OTHER = "__other__";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  price: z.coerce.number().positive("Price must be positive"),
  category: z.string().min(1, "Category is required"),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
});

export default function ProductForm({ editingProduct, onDone }) {
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const { data: categories = [] } = useProductCategories();

  const isNewCategory = editingProduct && !categories.includes(editingProduct.category);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: editingProduct?.name || "",
      description: editingProduct?.description || "",
      price: editingProduct?.price || "",
      category: isNewCategory ? OTHER : (editingProduct?.category || ""),
      customCategory: isNewCategory ? editingProduct.category : "",
      stock: editingProduct?.stock ?? 0,
    },
  });

  const selectedCategory = watch("category");
  const customCategory = watch("customCategory");

  const onSubmit = async (data) => {
    const category = data.category === OTHER ? customCategory : data.category;
    const payload = { name: data.name, description: data.description, price: data.price, category, stock: data.stock };

    if (editingProduct) {
      await updateMutation.mutateAsync({ id: editingProduct.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onDone?.();
  };

  return (
    <form className="app-form" onSubmit={handleSubmit(onSubmit)}>
      <label>
        Name
        <input {...register("name")} placeholder="Product name" />
        {errors.name && <span className="field-error">{errors.name.message}</span>}
      </label>
      <label>
        Category
        <select
          {...register("category", {
            onChange: (e) => {
              if (e.target.value !== OTHER) setValue("customCategory", "");
            },
          })}
        >
          <option value="">Select a category</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
          <option value={OTHER}>Other...</option>
        </select>
        {selectedCategory === OTHER && (
          <input {...register("customCategory")} placeholder="Enter new category" />
        )}
        {errors.category && <span className="field-error">{errors.category.message}</span>}
      </label>
      <label>
        Price
        <input {...register("price")} type="number" step="0.01" placeholder="29.99" />
        {errors.price && <span className="field-error">{errors.price.message}</span>}
      </label>
      <label>
        Stock
        <input {...register("stock")} type="number" placeholder="0" />
        {errors.stock && <span className="field-error">{errors.stock.message}</span>}
      </label>
      <label style={{ gridColumn: "1 / -1" }}>
        Description
        <input {...register("description")} placeholder="Optional description" />
      </label>
      <div className="form-buttons">
        <button type="submit" disabled={isSubmitting}>
          {editingProduct ? "Update" : "Create"}
        </button>
        {editingProduct && (
          <button type="button" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
