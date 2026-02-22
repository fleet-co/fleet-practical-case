const CURRENCY = "EUR";

/**
 * @param {number} price
 * @return string
 */
export function formatPrice(price) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: CURRENCY
  }).format(price);
}
