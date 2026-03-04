import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

/**
 * Installs a global fetch mock that routes each expected API endpoint to the
 * corresponding fixture array. Individual resource endpoints (/api/orders/:id
 * and /api/employees/:id) are handled dynamically by looking up the ID in the
 * fixture so the mock stays consistent without needing per-test setup.
 * Any unrecognised URL resolves with an empty object so unexpected calls fail
 * silently rather than throwing.
 *
 * @param {Object} fixtures
 * @param {Array}  [fixtures.employees=[]]
 * @param {Array}  [fixtures.devices=[]]
 * @param {Array}  [fixtures.catalog=[]]
 * @param {Array}  [fixtures.orders=[]]
 */
function mockFetch({ employees = [], devices = [], catalog = [], orders = [] } = {}) {
  global.fetch = jest.fn().mockImplementation((url) => {
    if (url === "/api/employees")
      return Promise.resolve({ ok: true, json: () => Promise.resolve(employees) });
    if (url === "/api/devices")
      return Promise.resolve({ ok: true, json: () => Promise.resolve(devices) });
    if (url === "/api/catalog")
      return Promise.resolve({ ok: true, json: () => Promise.resolve(catalog) });
    if (url === "/api/orders")
      return Promise.resolve({ ok: true, json: () => Promise.resolve(orders) });
    // GET /api/orders/:id — return the matching order (with items already on the object)
    if (/^\/api\/orders\/\d+$/.test(url)) {
      const id = Number(url.split("/").pop());
      const order = orders.find((o) => o.id === id) ?? { id, items: [] };
      return Promise.resolve({ ok: true, json: () => Promise.resolve(order) });
    }
    // GET /api/employees/:id — used by DevicesTab to resolve owner names
    if (/^\/api\/employees\/\d+$/.test(url)) {
      const id = Number(url.split("/").pop());
      const emp = employees.find((e) => e.id === id) ?? { id, name: "Unknown" };
      return Promise.resolve({ ok: true, json: () => Promise.resolve(emp) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

/**
 * Renders the full App component and waits for all four initial data fetches
 * to complete before returning. This prevents act() warnings caused by async
 * state updates settling after the test's synchronous assertions have already run.
 *
 * @async
 * @returns {Promise<void>}
 */
async function renderApp() {
  render(<App />);
  // Wait until App has called all four fetch endpoints triggered by its mount effect
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith("/api/employees");
    expect(global.fetch).toHaveBeenCalledWith("/api/devices");
    expect(global.fetch).toHaveBeenCalledWith("/api/catalog");
    expect(global.fetch).toHaveBeenCalledWith("/api/orders");
  });
}

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
  // Install a default empty-fixture mock so tests that don't need data still work
  mockFetch();
});

afterEach(() => {
  delete global.fetch;
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe("Rendering", () => {
  test("renders 'Fleet Device Manager' title", async () => {
    await renderApp();
    expect(screen.getByText(/fleet device manager/i)).toBeInTheDocument();
  });

  test("renders all four tab buttons", async () => {
    await renderApp();
    expect(screen.getByRole("button", { name: /^employees$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^devices$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^catalog$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^orders$/i })).toBeInTheDocument();
  });

  test("renders dashboard KPI headings", async () => {
    await renderApp();
    expect(screen.getByText("Total employees")).toBeInTheDocument();
    expect(screen.getByText("Total devices")).toBeInTheDocument();
    expect(screen.getByText("Assigned devices")).toBeInTheDocument();
  });

  // Each count is scoped to its KPI article to avoid matching other occurrences of "2" in the DOM.
  // Only device id=1 has an owner_id, so the assigned count should be 1.
  test("dashboard KPI counts update after data loads", async () => {
    mockFetch({
      employees: [
        { id: 1, name: "Alice", role: "Engineer", device_count: 1 },
        { id: 2, name: "Bob", role: "Designer", device_count: 0 },
      ],
      devices: [
        { id: 1, name: "MacBook", type: "Laptop", owner_id: 1 },
        { id: 2, name: "Dell", type: "Laptop", owner_id: null },
      ],
    });
    await renderApp();

    const employeesArticle = screen.getByText("Total employees").closest("article");
    expect(within(employeesArticle).getByText("2")).toBeInTheDocument();

    const devicesArticle = screen.getByText("Total devices").closest("article");
    expect(within(devicesArticle).getByText("2")).toBeInTheDocument();

    const assignedArticle = screen.getByText("Assigned devices").closest("article");
    expect(within(assignedArticle).getByText("1")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tab navigation
// ---------------------------------------------------------------------------
describe("Tab navigation", () => {
  test("default active tab is Employees", async () => {
    await renderApp();
    expect(screen.getByRole("heading", { name: /create employee/i })).toBeInTheDocument();
  });

  test("clicking Devices tab shows the devices panel", async () => {
    await renderApp();
    userEvent.click(screen.getByRole("button", { name: /^devices$/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /create device/i })).toBeInTheDocument();
    });
  });

  test("clicking Catalog tab shows the catalog panel", async () => {
    await renderApp();
    userEvent.click(screen.getByRole("button", { name: /^catalog$/i }));
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  test("clicking Orders tab shows the orders panel", async () => {
    await renderApp();
    userEvent.click(screen.getByRole("button", { name: /^orders$/i }));
    expect(screen.getByText(/no orders yet/i)).toBeInTheDocument();
  });

  test("switching tabs hides the previous tab content", async () => {
    await renderApp();
    expect(screen.getByRole("heading", { name: /create employee/i })).toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: /^catalog$/i }));
    expect(screen.queryByRole("heading", { name: /create employee/i })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tab persistence
// ---------------------------------------------------------------------------
describe("Tab persistence", () => {
  test("restores active tab from localStorage on mount", async () => {
    localStorage.setItem("fleet_active_tab", "catalog");
    await renderApp();
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  test("saves active tab to localStorage when switching", async () => {
    await renderApp();
    userEvent.click(screen.getByRole("button", { name: /^orders$/i }));
    expect(localStorage.getItem("fleet_active_tab")).toBe("orders");
  });

  // localStorage says "employees" but the hash says "#catalog" — the hash should win.
  test("URL hash takes precedence over localStorage on mount", async () => {
    localStorage.setItem("fleet_active_tab", "employees");
    window.location.hash = "#catalog";
    await renderApp();
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  // An unrecognised localStorage value should be ignored, falling back to the default tab.
  test("ignores invalid values in localStorage", async () => {
    localStorage.setItem("fleet_active_tab", "not-a-valid-tab");
    await renderApp();
    expect(screen.getByRole("heading", { name: /create employee/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
describe("Error handling", () => {
  test("failed employees fetch displays an error message", async () => {
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url === "/api/employees")
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ message: "DB error" }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/employees fetch failed/i)).toBeInTheDocument();
    });
  });

  test("failed devices fetch displays an error message", async () => {
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url === "/api/devices")
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ message: "Timeout" }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/devices fetch failed/i)).toBeInTheDocument();
    });
  });

  // All endpoints fail — the error banner should accumulate at least 2 entries.
  test("multiple fetch failures are accumulated and all shown", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Fail" }),
    });
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(2);
    });
  });

  test("'Clear' button removes all errors", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Fail" }),
    });
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
    });
    userEvent.click(screen.getByRole("button", { name: /clear/i }));
    await waitFor(() => {
      expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------
describe("Data fetching", () => {
  test("fetches all four datasets on mount", async () => {
    await renderApp();
    expect(global.fetch).toHaveBeenCalledWith("/api/employees");
    expect(global.fetch).toHaveBeenCalledWith("/api/devices");
    expect(global.fetch).toHaveBeenCalledWith("/api/catalog");
    expect(global.fetch).toHaveBeenCalledWith("/api/orders");
  });

  // The baseline call count is recorded after mount so the assertion only checks
  // calls triggered by the button click, not the initial fetch round.
  test("Manual refresh button triggers a new round of fetches", async () => {
    await renderApp();
    const callsBefore = global.fetch.mock.calls.length;

    userEvent.click(screen.getByRole("button", { name: /manual refresh/i }));

    await waitFor(() => {
      expect(global.fetch.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  test("shows 'Last refresh' timestamp after data loads", async () => {
    await renderApp();
    expect(screen.getByText(/last refresh/i)).toBeInTheDocument();
  });
});
