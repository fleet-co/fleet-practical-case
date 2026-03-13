import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateEmployee, useUpdateEmployee, useEmployeeRoles } from "../hooks";

const OTHER = "__other__";

const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
});

export default function EmployeeForm({ editingEmployee, onDone }) {
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const { data: roles = [] } = useEmployeeRoles();

  const isNewRole = editingEmployee && !roles.includes(editingEmployee.role);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: editingEmployee?.name || "",
      role: isNewRole ? OTHER : (editingEmployee?.role || ""),
      customRole: isNewRole ? editingEmployee.role : "",
    },
  });

  const selectedRole = watch("role");
  const customRole = watch("customRole");

  const onSubmit = async (data) => {
    const role = data.role === OTHER ? customRole : data.role;
    const payload = { name: data.name, role };

    if (editingEmployee) {
      await updateMutation.mutateAsync({ id: editingEmployee.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onDone?.();
  };

  return (
    <form className="app-form" onSubmit={handleSubmit(onSubmit)}>
      <label>
        Name
        <input {...register("name")} placeholder="Employee name" />
        {errors.name && <span className="field-error">{errors.name.message}</span>}
      </label>
      <label>
        Role
        <select
          {...register("role", {
            onChange: (e) => {
              if (e.target.value !== OTHER) setValue("customRole", "");
            },
          })}
        >
          <option value="">Select a role</option>
          {roles.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
          <option value={OTHER}>Other...</option>
        </select>
        {selectedRole === OTHER && (
          <input {...register("customRole")} placeholder="Enter new role" />
        )}
        {errors.role && <span className="field-error">{errors.role.message}</span>}
      </label>
      <div className="form-buttons">
        <button type="submit" disabled={isSubmitting}>
          {editingEmployee ? "Update" : "Create"}
        </button>
        {editingEmployee && (
          <button type="button" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
