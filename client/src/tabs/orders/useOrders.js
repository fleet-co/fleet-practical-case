import { useEffect, useState } from "react";

/**
 * @return {{isLoading: boolean, orders: Order[], hasError: boolean}}
 */
function useOrders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    setIsLoading(true);

    fetch("/api/orders", {
      method: "GET",
      signal: abortController.signal,
    })
      .then((response) => {
        if (response.ok) return response.json();
        return Promise.reject();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setHasError(false);
          setOrders(data);
        } else {
          return Promise.reject();
        }
      })
      .catch(() => setHasError(true))
      .finally(() => setIsLoading(false));

    return () => abortController.abort();
  }, []);

  return { isLoading, orders, hasError };
}

/**
 * @typedef OrderItem
 * @property {number} id
 * @property {string} product_name
 * @property {object} configuration
 * @property {string} sku
 * @property {number} unit_price
 * @property {number} quantity
 * @property {number} line_total
 */

/**
 * @typedef Order
 * @property {number} id
 * @property {number} total_amount
 * @property {number} item_count
 * @property {string} created_at
 * @property {OrderItem[]} items
 */

/**
 * @return {{displayLoadingState: boolean, displayErrorState: boolean, displayEmptyState: boolean, displayContent: boolean, ordersContent: Order[]}}
 */
export function useOrdersViewModel() {
  const { isLoading, orders, hasError } = useOrders();
  const isOk = !isLoading && !hasError;

  return {
    displayLoadingState: isLoading && !hasError,
    displayErrorState: !isLoading && hasError,
    displayEmptyState: isOk && orders.length === 0,
    displayContent: isOk && orders.length > 0,
    ordersContent: orders,
  };
}
