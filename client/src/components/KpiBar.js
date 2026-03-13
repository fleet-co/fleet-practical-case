import { useEmployees } from "../features/employees/hooks";
import { useDevices } from "../features/devices/hooks";

export default function KpiBar() {
  const { data: employees = [] } = useEmployees();
  const { data: devices = [] } = useDevices();

  const assignedDevices = devices.filter((d) => d.owner_id).length;

  return (
    <section className="app-kpis">
      <article>
        <h3>Total employees</h3>
        <strong>{employees.length}</strong>
      </article>
      <article>
        <h3>Total devices</h3>
        <strong>{devices.length}</strong>
      </article>
      <article>
        <h3>Assigned devices</h3>
        <strong>{assignedDevices}</strong>
      </article>
    </section>
  );
}
