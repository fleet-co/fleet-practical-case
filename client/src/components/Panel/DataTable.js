function DataTable({ columns, data, onEdit, onDelete, emptyMessage }) {
  return (
    <table>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key}>{col.header}</th>
          ))}
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={item.id}>
            {columns.map((col) => (
              <td key={col.key}>{col.render ? col.render(item) : item[col.key]}</td>
            ))}
            <td>
              <button type="button" onClick={() => onEdit(item)}>
                Edit
              </button>
              <button type="button" onClick={() => onDelete(item.id)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length + 1}>{emptyMessage}</td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

export default DataTable;
