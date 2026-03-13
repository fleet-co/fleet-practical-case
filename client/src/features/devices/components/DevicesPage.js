import { useState } from "react";
import { useDevices } from "../hooks";
import { useEmployees } from "../../employees/hooks";
import { useFilteredDevices } from "../hooks/useFilteredDevices";
import DeviceForm from "./DeviceForm";
import DeviceList from "./DeviceList";

export default function DevicesPage() {
  const [typeFilter, setTypeFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editingDevice, setEditingDevice] = useState(null);

  const { data: devices = [], isLoading } = useDevices();
  const { data: employees = [] } = useEmployees();
  const { filtered, typeOptions } = useFilteredDevices(devices, { type: typeFilter, owner: ownerFilter, search });

  return (
    <section className="panel">
      <h2>{editingDevice ? "Edit device" : "Create device"}</h2>
      <DeviceForm
        key={editingDevice?.id || "new"}
        editingDevice={editingDevice}
        onDone={() => setEditingDevice(null)}
      />

      <h3>Filters</h3>
      <div className="filters">
        <label>
          Type filter
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          Owner filter
          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
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

      <DeviceList
        devices={filtered}
        isLoading={isLoading}
        onEdit={setEditingDevice}
      />
    </section>
  );
}
