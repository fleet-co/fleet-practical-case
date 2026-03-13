import { useDeleteDevice } from "../hooks";
import DataTable from "../../../components/DataTable";

const COLUMNS = ["Name", "Type", "Owner", "Actions"];

export default function DeviceList({ devices, isLoading, onEdit }) {
  const deleteMutation = useDeleteDevice();

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this device?")) return;
    await deleteMutation.mutateAsync(id);
  };

  return (
    <>
      <h3>Device list</h3>
      <DataTable
        columns={COLUMNS}
        data={devices}
        isLoading={isLoading}
        emptyMessage="No devices found"
        renderRow={(device) => (
          <tr key={device.id}>
            <td>{device.name}</td>
            <td>{device.type}</td>
            <td>{device.owner_name || "Unassigned"}</td>
            <td>
              <button type="button" onClick={() => onEdit(device)}>
                Edit
              </button>
              <button type="button" onClick={() => handleDelete(device.id)}>
                Delete
              </button>
            </td>
          </tr>
        )}
      />
    </>
  );
}
