import { useEffect, useState } from "react";
import { fetchProducts } from "./catalog.service";

export default function Catalog() {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        fetchProducts()
            .then((data) => setProducts(data));
    }, []);

    return (<section className="panel">
        <h2>Catalog</h2>
        <p>This is the catalog page.</p>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Price</th>
                </tr>
            </thead>
            <tbody>
                {products.map((product) => (
                    <tr key={product.id}>
                        <td>{product.id}</td>
                        <td>{product.name}</td>
                        <td>{product.base_price}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </section>);
}