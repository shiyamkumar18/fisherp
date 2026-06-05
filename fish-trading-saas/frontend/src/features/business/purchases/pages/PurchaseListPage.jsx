
export default function PurchaseListPage() {
  const { data, isLoading, isError, error } = usePurchases();

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (isError) return <div className="p-8 text-red-600">{error?.message || "Failed to load purchases."}</div>;

  const purchases = data?.data || data || [];

  return (
    <div className="bg-white p-6 rounded-xl shadow max-w-4xl mx-auto mt-8">
      <h2 className="text-lg font-semibold mb-4">Purchases</h2>
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="p-3 text-left">PO No</th>
            <th>Supplier</th>
            <th>Fish</th>
            <th>Weight</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {purchases.length === 0 && (
            <tr><td colSpan={5} className="text-gray-500 p-4 text-center">No purchases found.</td></tr>
          )}
          {purchases.map((p) => (
            <tr key={p.id} className="border-t hover:bg-slate-50">
              <td className="p-3 font-medium">{p.purchase_number}</td>
              <td>{p.supplier_name || p.supplier?.name || p.supplier || "-"}</td>
              <td>{p.fish_name || p.fish?.name || p.fish || "-"}</td>
              <td>{p.total_weight || p.weight || 0} kg</td>
              <td>₹{p.total_expense || p.total || p.total_amount || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
