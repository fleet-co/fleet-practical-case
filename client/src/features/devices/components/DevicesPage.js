import { useState } from "react";
import { useDevices } from "../hooks";
import { useEmployees } from "../../employees/hooks";
import { useFilteredDevices } from "../hooks/useFilteredDevices";
import DeviceForm from "./DeviceForm";
import DeviceList from "./DeviceList";
import SelectFilter from "../../../components/SelectFilter";
import SearchInput from "../../../components/SearchInput";

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
        <SelectFilter label="Type filter" value={typeFilter} onChange={setTypeFilter} options={typeOptions} />
        <SelectFilter label="Owner filter" value={ownerFilter} onChange={setOwnerFilter} options={employees.map((e) => ({ value: String(e.id), label: e.name }))} />
        <SearchInput value={search} onChange={setSearch} placeholder="Search name / type" />
      </div>

      <DeviceList
        devices={filtered}
        isLoading={isLoading}
        onEdit={setEditingDevice}
      />
    </section>
  );
}
