import {useEffect, useState} from "react";

/**
 * @return {{isLoading: boolean, catalog: Product[], hasError: boolean}}
 */
function useCatalog() {
  const [catalog, setCatalog] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // TODO: Copy-pasting the logic for fetch is error-prone, it'd be better to use either a library or a hook that can be reused
  useEffect(() => {
    const abortController = new AbortController()
    setIsLoading(true);
    fetch("/api/products", {
      method: "GET",
      signal: abortController.signal,
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        return Promise.reject()
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setHasError(false);

          const flattenedCatalog = data.flatMap(product => {
            if (!product.variants || product.variants.length === 0) {
              return [{
                id: `p-${product.id}`,
                name: product.name,
                price: product.base_price
              }];
            }

            return product.variants.map(variant => ({
              id: variant.id,
              name: `${product.name} (${variant.configuration})`,
              price: product.base_price + variant.price_delta,
              sku: variant.sku
            }));
          });

          setCatalog(flattenedCatalog);
        } else {
          return Promise.reject();
        }
      })
      .catch(() => {
        setHasError(true);
      })
      .finally(() => setIsLoading(false));

    return () => {
      abortController.abort();
    }
  }, [])

  return {isLoading, catalog, hasError}
}

/**
 * @typedef Product
 * @property {number} id Unique identifier for the product
 * @property {string} name Name of the product
 * @property {number} price Price of one unit
 */

/**
 * @typedef CartProduct
 * @property {number} id Unique identifier for the product
 * @property {string} name Name of the product
 * @property {number} quantity Amount of elements in the cart
 * @property {number} unitPrice Price of one unit
 * @property {number} totalPrice Total price
 */

/**
 * @return {{displayLoadingState: boolean, displayErrorState: boolean, displayEmptyCatalogState: boolean, displayCatalogContent: boolean, catalogContent: Product[]}}
 */
export function useCatalogViewModel() {
  const {isLoading, catalog, hasError} = useCatalog();
  const isOk = !isLoading && !hasError;

  return {
    displayLoadingState: isLoading && !hasError,
    displayErrorState: !isLoading && hasError,
    displayEmptyCatalogState: isOk && catalog.length === 0,
    displayCatalogContent: isOk && catalog.length > 0,
    catalogContent: catalog,
  }
}

export function useCartViewModel() {
  const [cart, setCart] = useState([]);

  return {
    isCartEmpty: cart.length === 0,
    cart,
    addProductToCart: (product) => {
      setCart((prevState) => {
        const existing = prevState.find((v) => v.id === product.id);
        if (existing) {
          return prevState.map(item =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
              : item
          );
        }
        return [{
          ...product,
          quantity: 1,
          unitPrice: product.price,
          totalPrice: product.price
        }, ...prevState];
      });
    },
    removeOneFromCart: (product) => {
      setCart((prevState) => {
        const existing = prevState.find((v) => v.id === product.id);
        if (existing && existing.quantity > 1) {
          return prevState.map(item =>
            item.id === product.id
              ? { ...item, quantity: item.quantity - 1, totalPrice: (item.quantity - 1) * item.unitPrice }
              : item
          );
        }
        return prevState.filter(item => item.id !== product.id);
      });
    },
    removeAllFromCart: (product) => {
      setCart((prevState) => prevState.filter((v) => v.id !== product.id));
    },
    subtotal: cart.reduce((acc, cur) => acc + (cur.quantity * cur.unitPrice), 0),
  };
}