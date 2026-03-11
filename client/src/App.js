import { useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import "./App.css";
import Dashboard from "./components/Dashboard/Dashboard";
import TabBar from "./components/TabBar/TabBar";
import StatusMessages from "./components/StatusMessages/StatusMessages";
import EmployeePanel from "./components/Panel/EmployeePanel";
import DevicePanel from "./components/Panel/DevicePanel";
import CatalogPanel from "./components/Panel/CatalogPanel";
import OrderPanel from "./components/Panel/OrderPanel";
import { useEmployees } from "./hooks/useEmployees";
import { useDevices } from "./hooks/useDevices";

function App() {
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");

  const { data: employees = [], error: employeesError } = useEmployees();
  const { data: devices = [], error: devicesError } = useDevices();

  const dashboardState = useMemo(() => {
    const assigned = devices.filter((d) => d.owner_id).length;
    return {
      totalEmployees: employees.length,
      totalDevices: devices.length,
      assignedDevices: assigned,
    };
  }, [employees, devices]);

  useEffect(() => {
    const newErrors = [];
    if (employeesError) newErrors.push(`Employees fetch failed: ${employeesError.message}`);
    if (devicesError) newErrors.push(`Devices fetch failed: ${devicesError.message}`);
    if (newErrors.length > 0) {
      setErrors((prev) => [...prev, ...newErrors]);
    }
  }, [employeesError, devicesError]);

  useEffect(() => {
    if (!statusMessage) return undefined;
    const timer = window.setTimeout(() => setStatusMessage(""), 2500);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    queryClient.invalidateQueries({ queryKey: ["devices"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  }

  return (
    <div className="app-page">
      <header className="app-header">
        <h1>Fleet Device Manager</h1>
        <p>Interview boilerplate for employee and device management.</p>
      </header>

      <Dashboard
        totalEmployees={dashboardState.totalEmployees}
        totalDevices={dashboardState.totalDevices}
        assignedDevices={dashboardState.assignedDevices}
      />

      <TabBar onRefresh={handleRefresh} />

      <StatusMessages
        statusMessage={statusMessage}
        errors={errors}
        onClearErrors={() => setErrors([])}
      />

      <main className="app-main">
        <Routes>
          <Route path="/employees" element={<EmployeePanel />} />
          <Route path="/devices" element={<DevicePanel />} />
          <Route path="/catalog" element={<CatalogPanel />} />
          <Route path="/orders" element={<OrderPanel />} />
          <Route path="*" element={<Navigate to="/employees" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
