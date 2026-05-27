
export default function Table({ columns, data, className = "", emptyText = "No data available", onRowClick, actions }) {
  return (
    <div className={`bg-white rounded-xl shadow overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            {columns.map((col) => (
              <th key={typeof col === 'string' ? col : col.key} className="p-3 text-left">
                {typeof col === 'string' ? col : col.label}
              </th>
            ))}
            {actions && <th className="p-3 text-left">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="p-6 text-center text-gray-400">{emptyText}</td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                className="border-t hover:bg-slate-50 transition"
                onClick={onRowClick ? () => onRowClick(row, i) : undefined}
              >
                {columns.map((col, j) => {
                  const key = typeof col === 'string' ? col : col.key;
                  return (
                    <td key={j} className="p-3">
                      {row[key]}
                    </td>
                  );
                })}
                {actions && (
                  <td className="p-3">
                    {actions(row, i)}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
