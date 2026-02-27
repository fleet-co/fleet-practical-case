export default function Table({
	columns,
	rows,
	emptyMessage = "No data found",
}) {
	return (
		<table>
			<thead>
				<tr>
					{columns.map((column) => (
						<th key={column.key}>{column.header}</th>
					))}
				</tr>
			</thead>
			<tbody>
				{rows.map((row, index) => (
					<tr key={row.variant_id ?? row.id ?? index}>
						{columns.map((column) => (
							<td key={column.key}>
								{column.render ? (
									column.render(row)
								) : (
									row[column.key]
								)}
							</td>
						))}
					</tr>
				))}
				{rows.length === 0 ? (
					<tr>
						<td colSpan={columns.length}>{emptyMessage}</td>
					</tr>
				) : null}
			</tbody>
		</table>
	);
}
