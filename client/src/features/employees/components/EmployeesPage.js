import { useState } from "react";
import { useEmployees } from "../hooks";
import { useFilteredEmployees } from "../hooks/useFilteredEmployees";
import EmployeeForm from "./EmployeeForm";
import EmployeeList from "./EmployeeList";
import SelectFilter from "../../../components/SelectFilter";
import SearchInput from "../../../components/SearchInput";

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
        <SelectFilter label="Role filter" value={roleFilter} onChange={setRoleFilter} options={roleOptions} />
        <SearchInput value={search} onChange={setSearch} placeholder="Search name / role" />
      </div>

      <EmployeeList
        employees={filtered}
        isLoading={isLoading}
        onEdit={setEditingEmployee}
      />
    </section>
  );
}
