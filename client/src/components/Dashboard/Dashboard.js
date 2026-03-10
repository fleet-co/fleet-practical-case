import "./Dashboard.css";

function Dashboard({ totalEmployees, totalDevices, assignedDevices }) {
  return (
    <section className="app-kpis">
      <article>
        <h3>Total employees</h3>
        <strong>{totalEmployees}</strong>
      </article>
      <article>
        <h3>Total devices</h3>
        <strong>{totalDevices}</strong>
      </article>
      <article>
        <h3>Assigned devices</h3>
        <strong>{assignedDevices}</strong>
      </article>
    </section>
  );
}

export default Dashboard;
