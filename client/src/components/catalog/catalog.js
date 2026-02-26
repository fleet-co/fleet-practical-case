import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { fetchProducts } from "./catalog.service";
import Cart from "../cart/cart";

const Catalog = forwardRef((props, ref) => {
    const [products, setProducts] = useState([]);
    
    const refreshProducts = () => {
        fetchProducts()
        .then((data) => setProducts(data))
        .catch((error) => console.error("Error fetching products:", error));
    }
    
    useEffect(() => {
        refreshProducts();
    }, []);
    
    useImperativeHandle(ref, () => ({
        refreshProducts,
    }));
    
    function addToCart(product) {
        console.log("Adding to cart:", product);
    }
    
    return (<section className="panel">
        <h2>Catalog</h2>
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Configuration</th>
                    <th>SKU</th>
                    <th>Price</th>
                    <th>Stock</th>
                </tr>
            </thead>
            <tbody>
                {products.map((product) => (
                    <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>{product.configuration}</td>
                        <td>{product.sku}</td>
                        <td>{product.price}</td>
                        <td>{product.stock}</td>
                        <td>
                            <button onClick={() => addToCart(product)}>Add to Cart</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </section>);
});

export default Catalog;