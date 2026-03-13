import { useDeleteEmployee } from "../hooks";
import DataTable from "../../../components/DataTable";

const COLUMNS = ["Name", "Role", "Devices", "Actions"];

export default function EmployeeList({ employees, isLoading, onEdit }) {
  const deleteMutation = useDeleteEmployee();

  const handleDelete = async (id) => {
    if (!window.confirm("Delete employee and unassign their devices?")) return;
    await deleteMutation.mutateAsync(id);
  };

  return (
    <>
      <h3>Employee list</h3>
      <DataTable
        columns={COLUMNS}
        data={employees}
        isLoading={isLoading}
        emptyMessage="No employees found"
        renderRow={(employee) => (
          <tr key={employee.id}>
            <td>{employee.name}</td>
            <td>{employee.role}</td>
            <td>{employee.device_count || 0}</td>
            <td>
              <button type="button" onClick={() => onEdit(employee)}>
                Edit
              </button>
              <button type="button" onClick={() => handleDelete(employee.id)}>
                Delete
              </button>
            </td>
          </tr>
        )}
      />
    </>
  );
}
