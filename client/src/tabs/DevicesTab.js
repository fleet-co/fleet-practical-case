import { useEffect, useMemo, useState } from "react";

const DEFAULT_FORM = { name: "", type: "Laptop", ownerId: "" };

export default function DevicesTab({
  devices,
  employees,
  loadingDevices,
  fetchDevices,
  fetchEmployees,
  onError,
  onStatusMessage,
}) {
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [deviceTypeFilter, setDeviceTypeFilter] = useState(
    () => window.localStorage.getItem("fleet_device_type_filter") ?? "",
  );
  const [deviceOwnerFilter, setDeviceOwnerFilter] = useState(
    () => window.localStorage.getItem("fleet_device_owner_filter") ?? "",
  );
  const [deviceSearch, setDeviceSearch] = useState("");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingId, setEditingId] = useState(null);
  const [ownerNameById, setOwnerNameById] = useState({});
  const [loadingOwnerNames, setLoadingOwnerNames] = useState(false);

  const deviceTypeOptions = useMemo(() => {
    const set = new Set();
    devices.forEach((d) => { if (d.type) set.add(d.type); });
    return Array.from(set);
  }, [devices]);

  useEffect(() => {
    window.localStorage.setItem("fleet_device_type_filter", deviceTypeFilter);
  }, [deviceTypeFilter]);

  useEffect(() => {
    window.localStorage.setItem("fleet_device_owner_filter", deviceOwnerFilter);
  }, [deviceOwnerFilter]);

  useEffect(() => {
    let next = [...devices];
    if (deviceTypeFilter) {
      next = next.filter((d) => d.type === deviceTypeFilter);
    }
    if (deviceOwnerFilter) {
      next = next.filter((d) => String(d.owner_id || "") === String(deviceOwnerFilter));
    }
    if (deviceSearch.trim()) {
      const normalized = deviceSearch.toLowerCase();
      next = next.filter((d) =>
        String(d.name || "").toLowerCase().includes(normalized) ||
        String(d.type || "").toLowerCase().includes(normalized),
      );
    }
    setFilteredDevices(next);
  }, [devices, deviceTypeFilter, deviceOwnerFilter, deviceSearch]);

  useEffect(() => {
    const ownerIds = Array.from(
      new Set(
        filteredDevices
          .map((d) => Number(d.owner_id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    );

    if (ownerIds.length === 0) {
      setOwnerNameById({});
      return;
    }

    setLoadingOwnerNames(true);
    setOwnerNameById({});

    Promise.all(
      ownerIds.map(async (ownerId) => {
        try {
          const response = await fetch(`/api/employees/${ownerId}`);
          if (response.status === 404) {
            return { ownerId: String(ownerId), ownerName: `Unknown employee #${ownerId}` };
          }
          if (!response.ok) throw new Error(`Failed to resolve owner ${ownerId}`);
          const json = await response.json();
          return { ownerId: String(ownerId), ownerName: json.name };
        } catch {
          return { ownerId: String(ownerId), ownerName: `Unknown employee #${ownerId}` };
        }
      }),
    )
      .then((resolved) => {
        const map = {};
        resolved.forEach(({ ownerId, ownerName }) => { map[ownerId] = ownerName; });
        setOwnerNameById(map);
      })
      .finally(() => setLoadingOwnerNames(false));
  }, [filteredDevices]);

  async function handleSubmit(event) {
    event.preventDefault();
    const isEditing = Boolean(editingId);
    const url = isEditing ? `/api/devices/${editingId}` : "/api/devices";
    const method = isEditing ? "PUT" : "POST";
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, type: form.type, ownerId: form.ownerId || null }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Could not save device");
      onStatusMessage(isEditing ? "Device updated" : "Device created");
      setForm(DEFAULT_FORM);
      setEditingId(null);
      await fetchDevices();
      await fetchEmployees();
    } catch (error) {
      onError(`Device save failed: ${error.message}`);
    }
  }

  async function handleDelete(deviceId) {
    if (!window.confirm("Delete this device?")) return;
    try {
      const response = await fetch(`/api/devices/${deviceId}`, { method: "DELETE" });
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.message || "Could not delete device");
      }
      onStatusMessage("Device deleted");
      await fetchDevices();
      await fetchEmployees();
    } catch (error) {
      onError(`Device delete failed: ${error.message}`);
    }
  }

  function beginEdit(device) {
    setEditingId(device.id);
    setForm({
      name: device.name || "",
      type: device.type || "Laptop",
      ownerId: device.owner_id ? String(device.owner_id) : "",
    });
  }

  function cancelEdit() {
    setForm(DEFAULT_FORM);
    setEditingId(null);
  }

  return (
    <section className="panel">
      <h2>{editingId ? "Edit device" : "Create device"}</h2>
      <form className="app-form" onSubmit={handleSubmit}>
        <label>
          Device name
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="MacBook Pro"
            required
          />
        </label>
        <label>
          Type
          <select
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
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
            value={form.ownerId}
            onChange={(e) => setForm((prev) => ({ ...prev, ownerId: e.target.value }))}
          >
            <option value="">Unassigned</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.name}</option>
            ))}
          </select>
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
          Type filter
          <select value={deviceTypeFilter} onChange={(e) => setDeviceTypeFilter(e.target.value)}>
            <option value="">All</option>
            {deviceTypeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          Owner filter
          <select value={deviceOwnerFilter} onChange={(e) => setDeviceOwnerFilter(e.target.value)}>
            <option value="">All</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.name}</option>
            ))}
          </select>
        </label>
        <label>
          Search
          <input
            value={deviceSearch}
            onChange={(e) => setDeviceSearch(e.target.value)}
            placeholder="Search name / type"
          />
        </label>
      </div>

      <h3>
        Device list {loadingDevices ? "(loading...)" : ""}{" "}
        {loadingOwnerNames ? "(resolving owners...)" : ""}
      </h3>
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
              <td>{ownerNameById[String(device.owner_id)] || "Unassigned"}</td>
              <td>
                <button type="button" onClick={() => beginEdit(device)}>Edit</button>
                <button type="button" onClick={() => handleDelete(device.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {filteredDevices.length === 0 ? (
            <tr><td colSpan="4">No devices found</td></tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}
