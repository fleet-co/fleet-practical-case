import { useEffect, useState, useImperativeHandle, forwardRef, useRef } from "react";
import { fetchProducts } from "./catalog.service";
import Cart from "../cart/cart";

const Catalog = forwardRef((props, ref) => {
    const [products, setProducts] = useState([]);
    const cartRef = useRef();
    const { setErrors } = props;

    const refreshProducts = async () => {
        try {
            const data = await fetchProducts();

            const cartItems = JSON.parse(localStorage.getItem("cartItems") || "{}");

            const filteredProducts = data.map((p) => {
                const cartItem = cartItems[p.id];

                if (!cartItem) return p;

                return {
                    ...p,
                    stock: p.stock - (cartItem.quantity || 1),
                };
            });

            setProducts(filteredProducts);

        } catch (error) {
            setErrors((prev) => [...prev, error.message]);
        }
    };

    useEffect(() => {
        refreshProducts();
    }, []);

    useImperativeHandle(ref, () => ({
        refreshProducts,
    }));

    function addToCart(product) {
        const updatedProducts = products.map((p) =>
            p.id === product.id ? { ...p, stock: p.stock - 1 } : p
        );
        setProducts(updatedProducts);

        cartRef.current?.addToCart(product);
    }

    function addProduct(productId) {
        const updatedProducts = products.map((p) =>
            p.id === productId ? { ...p, stock: p.stock + 1 } : p
        );
        setProducts(updatedProducts);
    }

    return (
        <section className="panel">
            <Cart ref={cartRef} addProduct={addProduct} setErrors={setErrors} />
            <h2>Catalog</h2>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Configuration</th>
                        <th>SKU</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {products.filter((product) => product.stock > 0).map((product) => (
                        <tr key={product.id}>
                            <td>{product.name}</td>
                            <td>{product.configuration}</td>
                            <td>{product.sku}</td>
                            <td>{product.price}</td>
                            <td>{product.stock}</td>
                            <td>
                                <button
                                    onClick={() => addToCart(product)}
                                    disabled={product.stock <= 0}
                                    className={product.stock <= 0 ? "disabled" : ""}
                                >
                                    {product.stock <= 0 ? "Out of Stock" : "Add to Cart"}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
});

export default Catalog;
