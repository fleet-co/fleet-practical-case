import { useMemo, useState } from "react";
import "./Panel.css";
import { useEmployees } from "../../hooks/useEmployees";
import {
  useDevices,
  useCreateDevice,
  useUpdateDevice,
  useDeleteDevice,
} from "../../hooks/useDevices";

const DEFAULT_FORM = { name: "", type: "Laptop", ownerId: "" };

function DevicePanel() {
  const { data: employees = [] } = useEmployees();
  const { data: devices = [], isLoading } = useDevices();
  const createMutation = useCreateDevice();
  const updateMutation = useUpdateDevice();
  const deleteMutation = useDeleteDevice();

  const [deviceForm, setDeviceForm] = useState(DEFAULT_FORM);
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

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      name: deviceForm.name,
      type: deviceForm.type,
      ownerId: deviceForm.ownerId || null,
    };

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setDeviceForm(DEFAULT_FORM);
    setEditingId(null);
  }

  async function handleDelete(deviceId) {
    if (!window.confirm("Delete this device?")) return;
    await deleteMutation.mutateAsync(deviceId);
  }

  function beginEdit(device) {
    setEditingId(device.id);
    setDeviceForm({
      name: device.name || "",
      type: device.type || "Laptop",
      ownerId: device.owner_id ? String(device.owner_id) : "",
    });
  }

  function cancelEdit() {
    setDeviceForm(DEFAULT_FORM);
    setEditingId(null);
  }

  return (
    <section className="panel">
      <h2>{editingId ? "Edit device" : "Create device"}</h2>
      <form className="app-form" onSubmit={handleSubmit}>
        <label>
          Device name
          <input
            value={deviceForm.name}
            onChange={(e) =>
              setDeviceForm((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="MacBook Pro"
            required
          />
        </label>
        <label>
          Type
          <select
            value={deviceForm.type}
            onChange={(e) =>
              setDeviceForm((prev) => ({ ...prev, type: e.target.value }))
            }
          >
            <option value="Laptop">Laptop</option>
            <option value="Peripheral">Peripheral</option>
            <option value="Display">Display</option>
            <option value="Mobile">Mobile</option>
          </select>
        </label>
        <label>
          Owner
          <select
            value={deviceForm.ownerId}
            onChange={(e) =>
              setDeviceForm((prev) => ({ ...prev, ownerId: e.target.value }))
            }
          >
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
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Owner</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredDevices.map((device) => (
            <tr key={device.id}>
              <td>{device.name}</td>
              <td>{device.type}</td>
              <td>
                {employeeById[String(device.owner_id)] || "Unassigned"}
              </td>
              <td>
                <button type="button" onClick={() => beginEdit(device)}>
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(device.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {filteredDevices.length === 0 ? (
            <tr>
              <td colSpan="4">No devices found</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}

export default DevicePanel;
