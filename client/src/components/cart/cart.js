import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import "./cart.css";

const Cart = forwardRef((props, ref) => {
    const [isOpenState, setIsOpenState] = useState(false);
    const [cartItems, setCartItems] = useState(() => {
        const savedCart = localStorage.getItem("cartItems");
        return savedCart ? JSON.parse(savedCart) : [];
    });
    const { addProduct } = props;

    useEffect(() => {
        localStorage.setItem("cartItems", JSON.stringify(cartItems));
    }, [cartItems]);

    function addToCart(product) {
        setCartItems((prev) => [...prev, product]);
    }

    function removeFromCart(index) {
        setCartItems((prev) => prev.filter((_, i) => i !== index));
        addProduct(cartItems[index].id);
    }

    useImperativeHandle(ref, () => ({
        addToCart,
        getCartItems: () => cartItems,
    }));

    return (
        <>
            <div className={`sidebar ${isOpenState ? "open" : ""}`}>
                <div className="sidebar-content">
                    <h2>Shopping Cart</h2>
                    {cartItems.length === 0 ? (
                        <p>Your cart is empty.</p>
                    ) : (
                        <div className="cart-items">
                            {cartItems.map((item, index) => (
                                <div key={index} className="cart-item-card">
                                    <div className="cart-item-info">
                                        <h5>{item.name}</h5>
                                        <p className="cart-item-price">${item.price}</p>
                                    </div>
                                    <button
                                        className="cart-item-remove"
                                        onClick={() => removeFromCart(index)}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <button
                className={`toggle-sidebar-button ${isOpenState ? "open" : ""}`}
                onClick={() => setIsOpenState(!isOpenState)}
            >
                {isOpenState ? "✕" : "☰"}
            </button>
        </>
    );
});

export default Cart;
