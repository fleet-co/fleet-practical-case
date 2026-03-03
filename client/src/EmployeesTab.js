import { useEffect, useMemo, useState } from "react";

const DEFAULT_FORM = { name: "", role: "" };

export default function EmployeesTab({
  employees,
  loadingEmployees,
  fetchEmployees,
  fetchDevices,
  onError,
  onStatusMessage,
}) {
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [roleFilter, setRoleFilter] = useState(
    () => window.localStorage.getItem("fleet_role_filter") ?? "",
  );
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingId, setEditingId] = useState(null);

  const roleOptions = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => { if (e.role) set.add(e.role); });
    return Array.from(set);
  }, [employees]);

  useEffect(() => {
    window.localStorage.setItem("fleet_role_filter", roleFilter);
  }, [roleFilter]);

  useEffect(() => {
    let next = [...employees];
    if (roleFilter) {
      next = next.filter((e) => e.role === roleFilter);
    }
    if (employeeSearch.trim()) {
      const normalized = employeeSearch.toLowerCase();
      next = next.filter((e) =>
        String(e.name || "").toLowerCase().includes(normalized) ||
        String(e.role || "").toLowerCase().includes(normalized),
      );
    }
    setFilteredEmployees(next);
  }, [employees, roleFilter, employeeSearch]);

  async function handleSubmit(event) {
    event.preventDefault();
    const isEditing = Boolean(editingId);
    const url = isEditing ? `/api/employees/${editingId}` : "/api/employees";
    const method = isEditing ? "PUT" : "POST";
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, role: form.role }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Could not save employee");
      onStatusMessage(isEditing ? "Employee updated" : "Employee created");
      setForm(DEFAULT_FORM);
      setEditingId(null);
      await fetchEmployees();
      await fetchDevices();
    } catch (error) {
      onError(`Employee save failed: ${error.message}`);
    }
  }

  async function handleDelete(employeeId) {
    if (!window.confirm("Delete employee and unassign their devices?")) return;
    try {
      const response = await fetch(`/api/employees/${employeeId}`, { method: "DELETE" });
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.message || "Could not delete employee");
      }
      onStatusMessage("Employee deleted");
      await fetchEmployees();
    } catch (error) {
      onError(`Employee delete failed: ${error.message}`);
    }
  }

  function beginEdit(employee) {
    setEditingId(employee.id);
    setForm({ name: employee.name || "", role: employee.role || "" });
  }

  function cancelEdit() {
    setForm(DEFAULT_FORM);
    setEditingId(null);
  }

  return (
    <section className="panel">
      <h2>{editingId ? "Edit employee" : "Create employee"}</h2>
      <form className="app-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Employee name"
            required
          />
        </label>
        <label>
          Role
          <input
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            placeholder="Developer"
            required
          />
        </label>
        <div className="form-buttons">
          <button type="submit">{editingId ? "Update" : "Create"}</button>
          {editingId ? (
            <button type="button" onClick={cancelEdit}>Cancel edit</button>
          ) : null}
        </div>
      </form>

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
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            placeholder="Search name / role"
          />
        </label>
      </div>

      <h3>Employee list {loadingEmployees ? "(loading...)" : ""}</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Devices</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredEmployees.map((employee) => (
            <tr key={employee.id}>
              <td>{employee.name}</td>
              <td>{employee.role}</td>
              <td>{employee.device_count || 0}</td>
              <td>
                <button type="button" onClick={() => beginEdit(employee)}>Edit</button>
                <button type="button" onClick={() => handleDelete(employee.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {filteredEmployees.length === 0 ? (
            <tr><td colSpan="4">No employees found</td></tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}
