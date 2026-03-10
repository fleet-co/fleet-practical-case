import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import "./Panel.css";
import DataTable from "./DataTable";
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from "../../hooks/useEmployees";

const employeeSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
});

function EmployeePanel() {
  const { data: employees = [], isLoading } = useEmployees();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: "", role: "" },
  });

  const [editingId, setEditingId] = useState(null);
  const [roleFilter, setRoleFilter] = useState(
    () => window.localStorage.getItem("fleet_role_filter") || "",
  );
  const [search, setSearch] = useState("");

  const roleOptions = useMemo(() => {
    return Array.from(new Set(employees.map((e) => e.role).filter(Boolean)));
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let result = employees;
    if (roleFilter) {
      result = result.filter((e) => e.role === roleFilter);
    }
    if (search.trim()) {
      const normalized = search.toLowerCase();
      result = result.filter(
        (e) =>
          String(e.name || "").toLowerCase().includes(normalized) ||
          String(e.role || "").toLowerCase().includes(normalized),
      );
    }
    return result;
  }, [employees, roleFilter, search]);

  function handleRoleFilterChange(value) {
    setRoleFilter(value);
    window.localStorage.setItem("fleet_role_filter", value);
  }

  async function onSubmit(data) {
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
    reset();
    setEditingId(null);
  }

  async function handleDelete(employeeId) {
    if (!window.confirm("Delete employee and unassign their devices?")) return;
    await deleteMutation.mutateAsync(employeeId);
  }

  function beginEdit(employee) {
    setEditingId(employee.id);
    reset({ name: employee.name || "", role: employee.role || "" }, { keepDefaultValues: true });
  }

  function cancelEdit() {
    reset();
    setEditingId(null);
  }

  return (
    <section className="panel">
      <h2>{editingId ? "Edit employee" : "Create employee"}</h2>
      <form className="app-form" onSubmit={handleSubmit(onSubmit)}>
        <label>
          Name
          <input {...register("name")} placeholder="Employee name" />
          {errors.name && <span className="field-error">{errors.name.message}</span>}
        </label>
        <label>
          Role
          <input {...register("role")} placeholder="Developer" />
          {errors.role && <span className="field-error">{errors.role.message}</span>}
        </label>
        <div className="form-buttons">
          <button type="submit">{editingId ? "Update" : "Create"}</button>
          {editingId ? (
            <button type="button" onClick={cancelEdit}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <h3>Filters</h3>
      <div className="filters">
        <label>
          Role filter
          <select
            value={roleFilter}
            onChange={(e) => handleRoleFilterChange(e.target.value)}
          >
            <option value="">All</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
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

      <h3>Employee list {isLoading ? "(loading...)" : ""}</h3>
      <DataTable
        columns={[
          { key: "name", header: "Name" },
          { key: "role", header: "Role" },
          { key: "device_count", header: "Devices", render: (e) => e.device_count || 0 },
        ]}
        data={filteredEmployees}
        onEdit={beginEdit}
        onDelete={handleDelete}
        emptyMessage="No employees found"
      />
    </section>
  );
}

export default EmployeePanel;
