import { useState } from "react";
import { useEmployees } from "../hooks";
import { useFilteredEmployees } from "../hooks/useFilteredEmployees";
import EmployeeForm from "./EmployeeForm";
import EmployeeList from "./EmployeeList";

export default function EmployeesPage() {
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editingEmployee, setEditingEmployee] = useState(null);

  const { data: employees = [], isLoading } = useEmployees();
  const { filtered, roleOptions } = useFilteredEmployees(employees, { role: roleFilter, search });

  return (
    <section className="panel">
      <h2>{editingEmployee ? "Edit employee" : "Create employee"}</h2>
      <EmployeeForm
        key={editingEmployee?.id || "new"}
        editingEmployee={editingEmployee}
        onDone={() => setEditingEmployee(null)}
      />

      <h3>Filters</h3>
      <div className="filters">
        <label>
          Role filter
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </label>
        <label>
          Search
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name / role"
          />
        </label>
      </div>

      <EmployeeList
        employees={filtered}
        isLoading={isLoading}
        onEdit={setEditingEmployee}
      />
    </section>
  );
}
