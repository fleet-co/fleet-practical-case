import { useEffect, useMemo, useState } from "react";
import "./App.css";
import EmployeesTab from "./tabs/EmployeesTab";
import DevicesTab from "./tabs/DevicesTab";
import CatalogTab from "./tabs/CatalogTab";
import OrdersTab from "./tabs/OrdersTab";

const VALID_TABS = ["employees", "devices", "catalog", "orders"];

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

  // Restore tab from URL hash or localStorage on mount
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    const savedTab = window.localStorage.getItem("fleet_active_tab");
    if (VALID_TABS.includes(hash)) {
      setActiveTab(hash);
    } else if (VALID_TABS.includes(savedTab)) {
      setActiveTab(savedTab);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("fleet_active_tab", activeTab);
    window.location.hash = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (!statusMessage) return undefined;
    const timer = window.setTimeout(() => setStatusMessage(""), 2500);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    fetchEmployees();
    fetchDevices();
    fetchCatalog();
    fetchOrders();
  }, []);

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

  async function fetchOrders() {
    setLoadingOrders(true);
    try {
      const response = await fetch("/api/orders");
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Could not load orders");
      const summaries = Array.isArray(json) ? json : [];
      const detailed = await Promise.all(
        summaries.map(async (order) => {
          try {
            const r = await fetch(`/api/orders/${order.id}`);
            const j = await r.json();
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
