import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import Layout from "./components/Layout";
import EmployeesPage from "./features/employees/components/EmployeesPage";
import DevicesPage from "./features/devices/components/DevicesPage";
import CatalogPage from "./features/catalog/components/CatalogPage";
import OrdersPage from "./features/orders/components/OrdersPage";
import "./App.css";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="*" element={<Navigate to="/employees" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
