import { useState } from "react";
import "./cart.css";

export default function Cart() {
    const [isOpenState, setIsOpenState] = useState(false);
    return (
        <>
            <div className={`sidebar ${isOpenState ? "open" : ""}`}>
                <div className="sidebar-content">
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

}