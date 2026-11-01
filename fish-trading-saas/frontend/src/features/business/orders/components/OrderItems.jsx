export default function OrderItems({ items, onChange, onAdd, onRemove }) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-2 mb-2 font-medium">
        <div>Fish</div>
        <div>Qty</div>
        <div>Price</div>
        <div>Total</div>
        <div></div>
      </div>
      {items.map((item, idx) => (
        <div className="grid grid-cols-5 gap-2 mb-2" key={idx}>
          <select
            className="input"
            value={item.fish}
            onChange={e => onChange(idx, "fish", e.target.value)}
            required
          >
            <option value="">Select fish</option>
            {/* TODO: Populate with real fish */}
            <option value="1">Mackerel</option>
            <option value="2">Tuna</option>
          </select>
          <input
            className="input"
            type="number"
            min="1"
            value={item.qty}
            onChange={e => onChange(idx, "qty", e.target.value)}
            required
          />
          <input
            className="input"
            type="number"
            min="0"
            value={item.price}
            onChange={e => onChange(idx, "price", e.target.value)}
            required
          />
          <div className="flex items-center">₹{Number(item.qty) * Number(item.price)}</div>
          <button type="button" className="text-red-500" onClick={() => onRemove(idx)} disabled={items.length === 1}>✕</button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary mt-2" onClick={onAdd}>Add Row +</button>
    </div>
  );
}
