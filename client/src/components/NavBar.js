import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/employees", label: "Employees" },
  { to: "/devices", label: "Devices" },
  { to: "/catalog", label: "Catalog" },
  { to: "/orders", label: "Orders" },
];

export default function NavBar() {
  return (
    <nav className="app-controls">
      {NAV_ITEMS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => isActive ? "tab-button active" : "tab-button"}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
