import { useEffect, useMemo, useState } from "react";
import "./App.css";
import EmployeesTab from "./tabs/EmployeesTab";
import DevicesTab from "./tabs/DevicesTab";
import CatalogTab from "./tabs/CatalogTab";
import OrdersTab from "./tabs/OrdersTab";

const VALID_TABS = ["employees", "devices", "catalog", "orders"];

/**
 * Root application component for Fleet Device Manager.
 *
 * Owns all shared server state (employees, devices, catalog, orders) and is the
 * single source of truth for data fetching. Tab navigation is persisted to both
 * localStorage and the URL hash so the active view survives page refreshes and
 * can be bookmarked. Error messages are accumulated in a dismissible banner;
 * success messages auto-clear after 2.5 s. Child tabs receive data and callbacks
 * as props — they never fetch directly or manage global state.
 *
 * @component
 * @returns {JSX.Element}
 */
function App() {
  const [activeTab, setActiveTab] = useState("employees");
  const [employees, setEmployees] = useState([]);
  const [devices, setDevices] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [errors, setErrors] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [lastRefreshAt, setLastRefreshAt] = useState("");

  const dashboardState = useMemo(() => ({
    totalEmployees: employees.length,
    totalDevices: devices.length,
    assignedDevices: devices.filter((d) => d.owner_id).length,
  }), [employees, devices]);

  // On mount: prefer the URL hash, fall back to localStorage, otherwise keep the default
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    const savedTab = window.localStorage.getItem("fleet_active_tab");
    if (VALID_TABS.includes(hash)) {
      setActiveTab(hash);
    } else if (VALID_TABS.includes(savedTab)) {
      setActiveTab(savedTab);
    }
  }, []);

  // Keep localStorage and the URL hash in sync whenever the active tab changes
  useEffect(() => {
    window.localStorage.setItem("fleet_active_tab", activeTab);
    window.location.hash = activeTab;
  }, [activeTab]);

  // Auto-clear the status message after 2.5 s; cancel the timer if it changes before then
  useEffect(() => {
    if (!statusMessage) return undefined;
    const timer = window.setTimeout(() => setStatusMessage(""), 2500);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  // Fetch all data once on initial mount
  useEffect(() => {
    fetchEmployees();
    fetchDevices();
    fetchCatalog();
    fetchOrders();
  }, []);

  /**
   * Fetches the employee list from GET /api/employees and updates state.
   * Non-2xx responses are treated the same as network errors and surfaced via addError.
   *
   * @async
   * @returns {Promise<void>}
   */
  async function fetchEmployees() {
    setLoadingEmployees(true);
    try {
      const response = await fetch("/api/employees");
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Could not load employees");
      setEmployees(Array.isArray(json) ? json : []);
      setLastRefreshAt(new Date().toISOString());
    } catch (error) {
      addError(`Employees fetch failed: ${error.message}`);
    } finally {
      setLoadingEmployees(false);
    }
  }

  /**
   * Fetches the device list from GET /api/devices and updates state.
   * Non-2xx responses are treated the same as network errors and surfaced via addError.
   *
   * @async
   * @returns {Promise<void>}
   */
  async function fetchDevices() {
    setLoadingDevices(true);
    try {
      const response = await fetch("/api/devices");
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Could not load devices");
      setDevices(Array.isArray(json) ? json : []);
      setLastRefreshAt(new Date().toISOString());
    } catch (error) {
      addError(`Devices fetch failed: ${error.message}`);
    } finally {
      setLoadingDevices(false);
    }
  }

  /**
   * Fetches the product catalog from GET /api/catalog and updates state.
   * Non-2xx responses are treated the same as network errors and surfaced via addError.
   *
   * @async
   * @returns {Promise<void>}
   */
  async function fetchCatalog() {
    setLoadingCatalog(true);
    try {
      const response = await fetch("/api/catalog");
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Could not load catalog");
      setCatalog(Array.isArray(json) ? json : []);
      setLastRefreshAt(new Date().toISOString());
    } catch (error) {
      addError(`Catalog fetch failed: ${error.message}`);
    } finally {
      setLoadingCatalog(false);
    }
  }

  /**
   * Fetches order data in two phases: first the summary list from GET /api/orders,
   * then the full line-item detail for each order via GET /api/orders/:id in parallel.
   * This two-step approach keeps the list endpoint lightweight while still giving
   * each rendered order its complete item breakdown. Individual detail calls that fail
   * are gracefully degraded to { ...order, items: [] } so one bad order never blocks
   * the rest from rendering.
   *
   * @async
   * @returns {Promise<void>}
   */
  async function fetchOrders() {
    setLoadingOrders(true);
    try {
      // Phase 1: load the summary list
      const response = await fetch("/api/orders");
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Could not load orders");
      const summaries = Array.isArray(json) ? json : [];

      // Phase 2: enrich each summary with its full line items in parallel
      const detailed = await Promise.all(
        summaries.map(async (order) => {
          try {
            const r = await fetch(`/api/orders/${order.id}`);
            const j = await r.json();
            // Fall back to the summary without items if the detail call fails
            return r.ok ? j : { ...order, items: [] };
          } catch {
            return { ...order, items: [] };
          }
        }),
      );
      setOrders(detailed);
      setLastRefreshAt(new Date().toISOString());
    } catch (error) {
      addError(`Orders fetch failed: ${error.message}`);
    } finally {
      setLoadingOrders(false);
    }
  }

  /**
   * Appends an error message to the error banner.
   * Passed as the onError prop to all tab components so they can surface failures
   * without owning any global error state themselves.
   *
   * @param {string} message - Human-readable description of the error.
   * @returns {void}
   */
  function addError(message) {
    setErrors((prev) => [...prev, message]);
  }

  return (
    <div className="app-page">
      <header className="app-header">
        <h1>Fleet Device Manager</h1>
        <p>Interview boilerplate for employee and device management.</p>
      </header>

      <section className="app-kpis">
        <article>
          <h3>Total employees</h3>
          <strong>{dashboardState.totalEmployees}</strong>
        </article>
        <article>
          <h3>Total devices</h3>
          <strong>{dashboardState.totalDevices}</strong>
        </article>
        <article>
          <h3>Assigned devices</h3>
          <strong>{dashboardState.assignedDevices}</strong>
        </article>
      </section>

      <div className="app-controls">
        <button
          className={activeTab === "employees" ? "tab-button active" : "tab-button"}
          onClick={() => setActiveTab("employees")}
          type="button"
        >
          Employees
        </button>
        <button
          className={activeTab === "devices" ? "tab-button active" : "tab-button"}
          onClick={() => setActiveTab("devices")}
          type="button"
        >
          Devices
        </button>
        <button
          className={activeTab === "catalog" ? "tab-button active" : "tab-button"}
          onClick={() => setActiveTab("catalog")}
          type="button"
        >
          Catalog
        </button>
        <button
          className={activeTab === "orders" ? "tab-button active" : "tab-button"}
          onClick={() => setActiveTab("orders")}
          type="button"
        >
          Orders
        </button>
        <button
          type="button"
          onClick={() => {
            fetchEmployees();
            fetchDevices();
            fetchCatalog();
            fetchOrders();
          }}
        >
          Manual refresh
        </button>
      </div>

      {statusMessage ? <p className="status success">{statusMessage}</p> : null}
      {lastRefreshAt ? (
        <p className="timestamp">Last refresh: {lastRefreshAt}</p>
      ) : null}

      {errors.length > 0 ? (
        <div className="status error">
          <div className="error-header">
            <strong>Errors ({errors.length})</strong>
            <button type="button" onClick={() => setErrors([])}>Clear</button>
          </div>
          <ul>
            {errors.map((error, index) => (
              <li key={`${error}-${index}`}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <main className="app-main">
        {activeTab === "employees" ? (
          <EmployeesTab
            employees={employees}
            loadingEmployees={loadingEmployees}
            fetchEmployees={fetchEmployees}
            fetchDevices={fetchDevices}
            onError={addError}
            onStatusMessage={setStatusMessage}
          />
        ) : null}

        {activeTab === "devices" ? (
          <DevicesTab
            devices={devices}
            employees={employees}
            loadingDevices={loadingDevices}
            fetchDevices={fetchDevices}
            fetchEmployees={fetchEmployees}
            onError={addError}
            onStatusMessage={setStatusMessage}
          />
        ) : null}

        {activeTab === "catalog" ? (
          <CatalogTab
            catalog={catalog}
            loadingCatalog={loadingCatalog}
            fetchOrders={fetchOrders}
            onError={addError}
          />
        ) : null}

        {activeTab === "orders" ? (
          <OrdersTab orders={orders} loadingOrders={loadingOrders} />
        ) : null}
      </main>
    </div>
  );
}

export default App;
