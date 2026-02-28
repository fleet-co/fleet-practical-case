import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import "./cart.css";
import { createOrder } from "./cart.service";
import { ReactComponent as CrossIcon } from "../../assets/cross.svg";
import { ReactComponent as CartIcon } from "../../assets/cart.svg";

const Cart = forwardRef((props, ref) => {
    const [isOpenState, setIsOpenState] = useState(false);
    const [cartItems, setCartItems] = useState(() => {
        const savedCart = localStorage.getItem("cartItems");
        return savedCart ? JSON.parse(savedCart) : {};
    });
    const { addProduct, setErrors } = props;

    useEffect(() => {
        localStorage.setItem("cartItems", JSON.stringify(cartItems));
    }, [cartItems]);

    function addToCart(product) {
        cartItems[product.id] = cartItems[product.id] || { ...product, quantity: 0 };
        cartItems[product.id].quantity += 1;
        setCartItems({ ...cartItems });
    }

    function removeFromCart(index) {
        cartItems[index].quantity -= 1;
        addProduct(cartItems[index].id);
        if (cartItems[index].quantity <= 0) {
            delete cartItems[index];
        }

        setCartItems(({ ...cartItems }));
    }

    useImperativeHandle(ref, () => ({
        addToCart
    }));

    async function handleOrder(cartItems) {
        console.log("Ordering with items:", cartItems);
        try {
            await createOrder(cartItems);
            setCartItems({});
        } catch (error) {
            setErrors((prev) => [...prev, error.message]);
        }
    }

    return (
        <>
            <div className={`sidebar ${isOpenState ? "open" : ""}`}>
                <div className="sidebar-content">
                    <h2>Shopping Cart</h2>
                    {Object.keys(cartItems).length === 0 ? (
                        <p>Your cart is empty.</p>
                    ) : (
                        <div className="cart-details">
                            <div className="cart-items">
                                {Object.entries(cartItems).map(([key, item]) => (
                                    <div key={key} className="cart-item-card">
                                        <div className="cart-item-info">
                                            <h5>{item.name}</h5>
                                            <p>{item.configuration}</p>
                                            <p className="cart-item-price">${item.price * item.quantity}</p>
                                        </div>
                                        <div className="cart-item-actions">
                                            <div>Quantity: {item.quantity}</div>
                                            <button
                                                className="cart-item-remove"
                                                onClick={() => removeFromCart(key)}
                                            >
                                                <CrossIcon />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="cart-total">
                                <h3>
                                    Total: $
                                    {Object.values(cartItems).reduce((total, item) => total + (item.price * item.quantity), 0)}
                                </h3>
                            </div>
                            <button className="checkout-button" onClick={() => handleOrder(cartItems)}>Order</button>
                        </div>
                    )}
                </div>
            </div>
            <button
                className={`toggle-sidebar-button ${isOpenState ? "open" : ""}`}
                onClick={() => setIsOpenState(!isOpenState)}
            >
                {isOpenState ? <CrossIcon /> : <span className="cart-button"><CartIcon /> My Cart</span>}
            </button>
        </>
    );
});

export default Cart;
