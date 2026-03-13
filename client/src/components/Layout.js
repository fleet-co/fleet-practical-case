import { Outlet } from "react-router-dom";
import AppHeader from "./AppHeader";
import KpiBar from "./KpiBar";
import NavBar from "./NavBar";

export default function Layout() {
  return (
    <div className="app-page">
      <AppHeader />
      <KpiBar />
      <NavBar />

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
