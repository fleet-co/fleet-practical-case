import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CatalogTab from "../tabs/CatalogTab";

// Fixtures — three items with stock and one out-of-stock item
const CATALOG = [
  { id: 1, name: "MacBook Pro", configuration: "M3 Pro / 18GB", sku: "MBP-M3P-18", stock: 5, effective_price: 1700 },
  { id: 2, name: "MacBook Pro", configuration: "M3 Max / 36GB", sku: "MBP-M3M-36", stock: 3, effective_price: 2300 },
  { id: 3, name: "LG Display", configuration: "27 inch / 4K", sku: "LG27-4K", stock: 10, effective_price: 400 },
  { id: 4, name: "Out of Stock Item", configuration: "Standard", sku: "OOS-STD", stock: 0, effective_price: 99 },
];

/**
 * Renders CatalogTab with the shared CATALOG fixture and any prop overrides.
 * fetchOrders and onError are stubbed with jest.fn() by default so tests only
 * need to provide real implementations when asserting on those callbacks.
 *
 * @param {Object} [props={}] - Props to override on top of the defaults.
 * @returns {RenderResult}
 */
function renderTab(props = {}) {
  return render(
    <CatalogTab
      catalog={CATALOG}
      loadingCatalog={false}
      fetchOrders={jest.fn()}
      onError={jest.fn()}
      {...props}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe("Rendering", () => {
  // Rows are identified by configuration since the product name is shared across variants.
  test("renders a row for each catalog item", () => {
    renderTab();
    expect(screen.getByText("M3 Pro / 18GB")).toBeInTheDocument();
    expect(screen.getByText("M3 Max / 36GB")).toBeInTheDocument();
    expect(screen.getByText("27 inch / 4K")).toBeInTheDocument();
  });

  test("shows 'No catalog items found' when catalog is empty", () => {
    renderTab({ catalog: [] });
    expect(screen.getByText("No catalog items found")).toBeInTheDocument();
  });

  test("shows loading indicator when loadingCatalog is true", () => {
    renderTab({ loadingCatalog: true });
    expect(screen.getByText(/loading\.\.\./i)).toBeInTheDocument();
  });

  test("prices are formatted as EUR currency", () => {
    renderTab();
    expect(screen.getByText(/1\s?700/)).toBeInTheDocument();
  });

  // The disabled button corresponds to the out-of-stock item (stock=0).
  test("'Add to cart' button is disabled when stock is 0", () => {
    renderTab();
    const buttons = screen.getAllByRole("button", { name: /add to cart/i });
    const disabledButton = buttons.find((b) => b.disabled);
    expect(disabledButton).toBeTruthy();
  });

  test("'Add to cart' button is enabled when stock > 0", () => {
    renderTab();
    const buttons = screen.getAllByRole("button", { name: /add to cart/i });
    const enabledButtons = buttons.filter((b) => !b.disabled);
    expect(enabledButtons.length).toBe(3); // 3 items with stock > 0
  });
});

// ---------------------------------------------------------------------------
// Search filtering
// ---------------------------------------------------------------------------
describe("Search filtering", () => {
  test("filters by product name", () => {
    renderTab();
    userEvent.type(screen.getByPlaceholderText(/search name \/ configuration/i), "LG");
    expect(screen.getByText("27 inch / 4K")).toBeInTheDocument();
    expect(screen.queryByText("M3 Pro / 18GB")).not.toBeInTheDocument();
  });

  test("filters by configuration", () => {
    renderTab();
    userEvent.type(screen.getByPlaceholderText(/search name \/ configuration/i), "18GB");
    expect(screen.getByText("M3 Pro / 18GB")).toBeInTheDocument();
    expect(screen.queryByText("M3 Max / 36GB")).not.toBeInTheDocument();
  });

  test("search is case-insensitive", () => {
    renderTab();
    userEvent.type(screen.getByPlaceholderText(/search name \/ configuration/i), "macbook");
    expect(screen.getByText("M3 Pro / 18GB")).toBeInTheDocument();
    expect(screen.getByText("M3 Max / 36GB")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Cart state
// ---------------------------------------------------------------------------
describe("Cart state", () => {
  test("cart starts empty with 'Your cart is empty' message", () => {
    renderTab();
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  test("heading shows 'Cart' without count when empty", () => {
    renderTab();
    expect(screen.queryByText(/cart \(/i)).not.toBeInTheDocument();
    expect(screen.getByText("Cart")).toBeInTheDocument();
  });

  // A Remove button only appears when the cart is non-empty, confirming the item was added.
  test("adding an item shows it in the cart sidebar", () => {
    renderTab();
    const addButtons = screen.getAllByRole("button", { name: /add to cart/i });
    userEvent.click(addButtons[0]);
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
    expect(screen.queryByText(/your cart is empty/i)).not.toBeInTheDocument();
  });

  test("cart heading shows item count after adding", () => {
    renderTab();
    userEvent.click(screen.getAllByRole("button", { name: /add to cart/i })[0]);
    expect(screen.getByText(/cart \(1\)/i)).toBeInTheDocument();
  });

  // Cart should show 1 unique line item with quantity 2, not two separate entries.
  test("adding the same item twice increments cartQuantity instead of duplicating", () => {
    renderTab();
    const addButtons = screen.getAllByRole("button", { name: /add to cart/i });
    userEvent.click(addButtons[0]);
    userEvent.click(addButtons[0]);
    expect(screen.getByText(/cart \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  // Uses an item with stock=1 so a single add immediately reaches the cap.
  test("cartQuantity cannot exceed item.stock — increment disabled at cap", () => {
    const singleStockCatalog = [
      { id: 99, name: "Limited Item", configuration: "Only One", sku: "LIM-1", stock: 1, effective_price: 100 },
    ];
    renderTab({ catalog: singleStockCatalog });
    userEvent.click(screen.getByRole("button", { name: /add to cart/i }));
    const incrementButton = screen.getByRole("button", { name: "+" });
    expect(incrementButton).toBeDisabled();
  });

  test("decrement button is disabled when cartQuantity is 1", () => {
    renderTab();
    userEvent.click(screen.getAllByRole("button", { name: /add to cart/i })[0]);
    const decrementButton = screen.getByRole("button", { name: "−" });
    expect(decrementButton).toBeDisabled();
  });

  test("increment increases cartQuantity", () => {
    renderTab();
    userEvent.click(screen.getAllByRole("button", { name: /add to cart/i })[0]);
    userEvent.click(screen.getByRole("button", { name: "+" }));
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  test("decrement decreases cartQuantity (but not below 1)", () => {
    renderTab();
    const addButton = screen.getAllByRole("button", { name: /add to cart/i })[0];
    userEvent.click(addButton);
    userEvent.click(screen.getByRole("button", { name: "+" })); // qty → 2
    userEvent.click(screen.getByRole("button", { name: "−" })); // qty → 1
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  test("removing an item eliminates it from the cart", () => {
    renderTab();
    userEvent.click(screen.getAllByRole("button", { name: /add to cart/i })[0]);
    userEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  // Adds item id=1 (1700 €) twice → 2 × 1700 = 3400 €, shown in subtotal and total.
  test("cart total equals sum of effective_price × cartQuantity", () => {
    renderTab();
    userEvent.click(screen.getAllByRole("button", { name: /add to cart/i })[0]);
    userEvent.click(screen.getAllByRole("button", { name: /add to cart/i })[0]);
    expect(screen.getAllByText(/3\s?400/).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Order confirmation
// ---------------------------------------------------------------------------
describe("Order confirmation", () => {
  // Adds item id=1 to the cart then confirms — the POST body should contain variantId:1.
  test("confirm order sends POST /api/orders with correct variantIds and quantities", async () => {
    const fetchOrders = jest.fn().mockResolvedValue();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 10, total_amount: 1700, item_count: 1, items: [] }),
    });
    renderTab({ fetchOrders });

    userEvent.click(screen.getAllByRole("button", { name: /add to cart/i })[0]);
    userEvent.click(screen.getByRole("button", { name: /confirm order/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/orders",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"variantId":1'),
        }),
      );
    });

    delete global.fetch;
  });

  test("after successful order, cart is cleared", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 10, total_amount: 0, item_count: 0, items: [] }),
    });
    renderTab();
    userEvent.click(screen.getAllByRole("button", { name: /add to cart/i })[0]);
    userEvent.click(screen.getByRole("button", { name: /confirm order/i }));

    await waitFor(() => {
      expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    });

    delete global.fetch;
  });

  // The cart must be preserved on failure so the user can retry without re-adding items.
  test("failed order calls onError and does not clear the cart", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Insufficient stock" }),
    });
    const onError = jest.fn();
    renderTab({ onError });
    userEvent.click(screen.getAllByRole("button", { name: /add to cart/i })[0]);
    userEvent.click(screen.getByRole("button", { name: /confirm order/i }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.stringContaining("Insufficient stock"));
    });
    expect(screen.queryByText(/your cart is empty/i)).not.toBeInTheDocument();

    delete global.fetch;
  });
});
