import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateDevice, useUpdateDevice } from "../hooks";
import { useEmployees } from "../../employees/hooks";

const deviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  ownerId: z.string(),
});

export default function DeviceForm({ editingDevice, onDone }) {
  const createMutation = useCreateDevice();
  const updateMutation = useUpdateDevice();
  const { data: employees = [] } = useEmployees();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      name: editingDevice?.name || "",
      type: editingDevice?.type || "Laptop",
      ownerId: editingDevice?.owner_id ? String(editingDevice.owner_id) : "",
    },
  });

  const onSubmit = async (data) => {
    const payload = {
      name: data.name,
      type: data.type,
      ownerId: data.ownerId || null,
    };

    if (editingDevice) {
      await updateMutation.mutateAsync({ id: editingDevice.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onDone?.();
  };

  return (
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
        <button type="submit" disabled={isSubmitting}>
          {editingDevice ? "Update" : "Create"}
        </button>
        {editingDevice && (
          <button type="button" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
