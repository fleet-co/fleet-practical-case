export default function Table({
	columns,
	rows,
	editItem,
	deleteItem,
	addToCart,
	addToCartWhen,
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
								{column.key === "actions" ? (
									<>
										{editItem && <button
											type="button"
											onClick={() => editItem(row)}>
											Edit
										</button>}
										{deleteItem && <button
											type="button"
											onClick={() => deleteItem(row.id)}>
											Delete
										</button>}
										{addToCart && (!addToCartWhen || addToCartWhen(row)) && <button
											type="button"
											onClick={() => addToCart(row)}>
											Add to cart
										</button>}
									</>
								) : column.render ? (
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
