import Loader from "./Loader";

export default function DataTable({ columns, data, renderRow, emptyMessage = "No data", isLoading = false }) {
  if (isLoading) return <Loader />;

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(renderRow)}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length}>{emptyMessage}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
