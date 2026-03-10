import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import "./Panel.css";
import DataTable from "./DataTable";
import { useEmployees } from "../../hooks/useEmployees";
import {
  useDevices,
  useCreateDevice,
  useUpdateDevice,
  useDeleteDevice,
} from "../../hooks/useDevices";

const deviceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["Laptop", "Peripheral", "Display", "Mobile"]),
  ownerId: z.string(),
});

function DevicePanel() {
  const { data: employees = [] } = useEmployees();
  const { data: devices = [], isLoading } = useDevices();
  const createMutation = useCreateDevice();
  const updateMutation = useUpdateDevice();
  const deleteMutation = useDeleteDevice();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(deviceSchema),
    defaultValues: { name: "", type: "Laptop", ownerId: "" },
  });

  const [editingId, setEditingId] = useState(null);
  const [typeFilter, setTypeFilter] = useState(
    () => window.localStorage.getItem("fleet_device_type_filter") || "",
  );
  const [ownerFilter, setOwnerFilter] = useState(
    () => window.localStorage.getItem("fleet_device_owner_filter") || "",
  );
  const [search, setSearch] = useState("");

  const employeeById = useMemo(() => {
    const map = {};
    employees.forEach((e) => {
      map[String(e.id)] = e.name;
    });
    return map;
  }, [employees]);

  const typeOptions = useMemo(() => {
    return Array.from(new Set(devices.map((d) => d.type).filter(Boolean)));
  }, [devices]);

  const filteredDevices = useMemo(() => {
    let result = devices;
    if (typeFilter) {
      result = result.filter((d) => d.type === typeFilter);
    }
    if (ownerFilter) {
      result = result.filter(
        (d) => String(d.owner_id || "") === String(ownerFilter),
      );
    }
    if (search.trim()) {
      const normalized = search.toLowerCase();
      result = result.filter(
        (d) =>
          String(d.name || "").toLowerCase().includes(normalized) ||
          String(d.type || "").toLowerCase().includes(normalized),
      );
    }
    return result;
  }, [devices, typeFilter, ownerFilter, search]);

  function handleTypeFilterChange(value) {
    setTypeFilter(value);
    window.localStorage.setItem("fleet_device_type_filter", value);
  }

  function handleOwnerFilterChange(value) {
    setOwnerFilter(value);
    window.localStorage.setItem("fleet_device_owner_filter", value);
  }

  async function onSubmit(data) {
    const payload = { ...data, ownerId: data.ownerId || null };

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    reset();
    setEditingId(null);
  }

  async function handleDelete(deviceId) {
    if (!window.confirm("Delete this device?")) return;
    await deleteMutation.mutateAsync(deviceId);
  }

  function beginEdit(device) {
    setEditingId(device.id);
    reset({
      name: device.name || "",
      type: device.type || "Laptop",
      ownerId: device.owner_id ? String(device.owner_id) : "",
    }, { keepDefaultValues: true });
  }

  function cancelEdit() {
    reset();
    setEditingId(null);
  }

  return (
    <section className="panel">
      <h2>{editingId ? "Edit device" : "Create device"}</h2>
      <form className="app-form" onSubmit={handleSubmit(onSubmit)}>
        <label>
          Device name
          <input {...register("name")} placeholder="MacBook Pro" />
          {errors.name && <span className="field-error">{errors.name.message}</span>}
        </label>
        <label>
          Type
          <select {...register("type")}>
            <option value="Laptop">Laptop</option>
            <option value="Peripheral">Peripheral</option>
            <option value="Display">Display</option>
            <option value="Mobile">Mobile</option>
          </select>
        </label>
        <label>
          Owner
          <select {...register("ownerId")}>
            <option value="">Unassigned</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
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
          Type filter
          <select
            value={typeFilter}
            onChange={(e) => handleTypeFilterChange(e.target.value)}
          >
            <option value="">All</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Owner filter
          <select
            value={ownerFilter}
            onChange={(e) => handleOwnerFilterChange(e.target.value)}
          >
            <option value="">All</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name / type"
          />
        </label>
      </div>

      <h3>Device list {isLoading ? "(loading...)" : ""}</h3>
      <DataTable
        columns={[
          { key: "name", header: "Name" },
          { key: "type", header: "Type" },
          {
            key: "owner",
            header: "Owner",
            render: (d) => employeeById[String(d.owner_id)] || "Unassigned",
          },
        ]}
        data={filteredDevices}
        onEdit={beginEdit}
        onDelete={handleDelete}
        emptyMessage="No devices found"
      />
    </section>
  );
}

export default DevicePanel;
