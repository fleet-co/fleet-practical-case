import { render, screen, within } from "@testing-library/react";
import OrdersTab from "../tabs/OrdersTab";

// Fixtures — two orders covering single-item and multi-item cases
const ORDERS = [
  {
    id: 1,
    created_at: "2024-01-15T10:00:00.000Z",
    total_amount: 1700,
    item_count: 1,
    items: [
      {
        id: 1,
        product_name: "MacBook Pro",
        configuration: "M3 Pro / 18GB",
        sku: "MBP-M3P-18",
        unit_price: 1700,
        quantity: 1,
        line_total: 1700,
      },
    ],
  },
  {
    id: 2,
    created_at: "2024-01-16T10:00:00.000Z",
    total_amount: 2700,
    item_count: 2,
    items: [
      {
        id: 2,
        product_name: "MacBook Pro",
        configuration: "M3 Max / 36GB",
        sku: "MBP-M3M-36",
        unit_price: 2300,
        quantity: 1,
        line_total: 2300,
      },
      {
        id: 3,
        product_name: "LG Display",
        configuration: "27 inch / 4K",
        sku: "LG27-4K",
        unit_price: 400,
        quantity: 1,
        line_total: 400,
      },
    ],
  },
];

/**
 * Renders OrdersTab with the shared ORDERS fixture and any prop overrides.
 * OrdersTab is a pure display component — it owns no state and makes no network
 * calls, so no fetch mocking or async waiting is needed.
 *
 * @param {Object} [props={}] - Props to override on top of the defaults.
 * @returns {RenderResult}
 */
function renderTab(props = {}) {
  return render(<OrdersTab orders={ORDERS} loadingOrders={false} {...props} />);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe("Rendering", () => {
  test("shows 'No orders yet.' when orders is empty", () => {
    renderTab({ orders: [] });
    expect(screen.getByText("No orders yet.")).toBeInTheDocument();
  });

  test("shows loading indicator in heading when loadingOrders is true", () => {
    renderTab({ loadingOrders: true });
    expect(screen.getByText(/loading\.\.\./i)).toBeInTheDocument();
  });

  test("renders a card for each order", () => {
    renderTab();
    expect(screen.getByText("Order #1")).toBeInTheDocument();
    expect(screen.getByText("Order #2")).toBeInTheDocument();
  });

  test("renders line item configurations within order cards", () => {
    renderTab();
    expect(screen.getByText("M3 Pro / 18GB")).toBeInTheDocument();
    expect(screen.getByText("M3 Max / 36GB")).toBeInTheDocument();
    expect(screen.getByText("27 inch / 4K")).toBeInTheDocument();
  });

  // MacBook Pro appears in both orders so getAllByText is used instead of getByText.
  test("renders product names within order cards", () => {
    renderTab();
    const macbookCells = screen.getAllByText("MacBook Pro");
    expect(macbookCells.length).toBeGreaterThan(0);
    expect(screen.getByText("LG Display")).toBeInTheDocument();
  });

  // 1 700,00 € formatted with fr-FR locale — multiple cells may display the same value.
  test("unit prices are formatted as EUR currency", () => {
    renderTab();
    expect(screen.getAllByText(/1\s?700/).length).toBeGreaterThan(0);
  });

  // Order 1: 1 × 1700 = 1700 — the value appears in unit price, subtotal, and total cells.
  test("order total equals sum of unit_price × quantity for single-item order", () => {
    renderTab({ orders: [ORDERS[0]] });
    expect(screen.getAllByText(/1\s?700/).length).toBeGreaterThan(0);
  });

  // Order 2: 2300 + 400 = 2700.
  test("order total equals sum of unit_price × quantity for multi-item order", () => {
    renderTab({ orders: [ORDERS[1]] });
    expect(screen.getByText(/2\s?700/)).toBeInTheDocument();
  });

  test("multi-item order shows all line items in the same card", () => {
    renderTab({ orders: [ORDERS[1]] });
    expect(screen.getByText("M3 Max / 36GB")).toBeInTheDocument();
    expect(screen.getByText("27 inch / 4K")).toBeInTheDocument();
  });

  test("each order displays a quantity column", () => {
    renderTab({ orders: [ORDERS[0]] });
    expect(screen.getByRole("columnheader", { name: /qty/i })).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  // Custom order with quantity 2 to verify quantity rendering and computed subtotal.
  // Subtotal: 2 × 1700 = 3400 — appears in both the subtotal cell and the card total.
  test("multi-unit line item displays correct quantity", () => {
    const orderWithQty = {
      id: 3,
      created_at: "2024-01-17T10:00:00.000Z",
      total_amount: 3400,
      item_count: 2,
      items: [
        {
          id: 10,
          product_name: "MacBook Pro",
          configuration: "M3 Pro / 18GB",
          sku: "MBP-M3P-18",
          unit_price: 1700,
          quantity: 2,
          line_total: 3400,
        },
      ],
    };
    renderTab({ orders: [orderWithQty] });
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getAllByText(/3\s?400/).length).toBeGreaterThan(0);
  });

  // Scoped to the article element to confirm the id renders inside its own card.
  test("card header shows the order id", () => {
    renderTab();
    const card1 = screen.getByText("Order #1").closest("article");
    expect(within(card1).getByText("Order #1")).toBeInTheDocument();
  });
});
