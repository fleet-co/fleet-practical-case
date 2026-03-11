import { NavLink } from "react-router-dom";
import "./TabBar.css";

function TabBar({ onRefresh }) {
  return (
    <div className="app-controls">
      <NavLink
        to="/employees"
        className={({ isActive }) =>
          isActive ? "tab-button active" : "tab-button"
        }
      >
        Employees
      </NavLink>
      <NavLink
        to="/devices"
        className={({ isActive }) =>
          isActive ? "tab-button active" : "tab-button"
        }
      >
        Devices
      </NavLink>
      <NavLink
        to="/catalog"
        className={({ isActive }) =>
          isActive ? "tab-button active" : "tab-button"
        }
      >
        Catalog
      </NavLink>
      <NavLink
        to="/orders"
        className={({ isActive }) =>
          isActive ? "tab-button active" : "tab-button"
        }
      >
        Orders
      </NavLink>
      <button type="button" onClick={onRefresh}>
        Manual refresh
      </button>
    </div>
  );
}

export default TabBar;
