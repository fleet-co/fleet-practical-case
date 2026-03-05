import { useEffect, useMemo, useState } from "react";

const DEFAULT_FORM = { name: "", role: "" };

/**
 * Tab for browsing, creating, editing, and deleting employees.
 *
 * Receives the full employee list from App and applies role filtering and
 * free-text search locally. The role filter is persisted to localStorage so
 * it survives page refreshes. Create and edit share a single form whose heading
 * and submit button label change depending on whether editingId is set. Mutations
 * (POST / PUT / DELETE) call back to App via fetchEmployees and fetchDevices so
 * the parent can refresh its shared state after a change.
 *
 * @param {Object}   props
 * @param {Array}    props.employees        - Full employee list from the server.
 * @param {boolean}  props.loadingEmployees - Whether App is currently fetching employees.
 * @param {Function} props.fetchEmployees   - Callback to refresh the employee list in App.
 * @param {Function} props.fetchDevices     - Callback to refresh devices (counts change after mutations).
 * @param {Function} props.onError          - Callback to surface error messages in the global banner.
 * @param {Function} props.onStatusMessage  - Callback to show a transient success message.
 * @returns {JSX.Element}
 */
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

  // Derive the unique role options from the current employee list
  const roleOptions = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => { if (e.role) set.add(e.role); });
    return Array.from(set);
  }, [employees]);

  // Persist the role filter to localStorage whenever it changes
  useEffect(() => {
    window.localStorage.setItem("fleet_role_filter", roleFilter);
  }, [roleFilter]);

  // Recompute the filtered list whenever employees, role filter, or search term changes
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

  /**
   * Handles both create (POST) and update (PUT) form submissions.
   * The target URL and HTTP method are derived from whether editingId is set.
   * On success the form is reset, the editing state is cleared, and both
   * fetchEmployees and fetchDevices are called to keep the parent in sync.
   *
   * @param {React.FormEvent} event
   * @returns {Promise<void>}
   */
  
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
      // Reset form and exit edit mode after a successful save
      setForm(DEFAULT_FORM);
      setEditingId(null);
      await fetchEmployees();
      await fetchDevices();
    } catch (error) {
      onError(`Employee save failed: ${error.message}`);
    }
  }

  /**
   * Prompts the user for confirmation then sends DELETE /api/employees/:id.
   * After a successful deletion, fetchEmployees is called to refresh the list.
   *
   * @param {number} employeeId - ID of the employee to delete.
   * @returns {Promise<void>}
   */
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

  /**
   * Enters edit mode for the given employee, pre-filling the form with their data.
   *
   * @param {{ id: number, name: string, role: string }} employee
   */
  function beginEdit(employee) {
    setEditingId(employee.id);
    setForm({ name: employee.name || "", role: employee.role || "" });
  }

  /**
   * Exits edit mode and resets the form to its empty default state.
   */
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
