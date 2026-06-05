import { useState } from "react";
import { useCreateBuyer } from "../hooks/useBuyer";

export default function BuyerForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { mutate, isLoading, isSuccess, isError, error: mutationError } = useCreateBuyer();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!name) {
      setError("Buyer name is required");
      return;
    }
    mutate(
      { name, phone },
      {
        onSuccess: () => {
          setSuccess(true);
          setName("");
          setPhone("");
        },
        onError: (err) => {
          setError(err?.message || "Failed to create buyer");
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-1 font-semibold">Buyer Name</label>
        <input
          placeholder="Buyer Name"
          className="input border px-2 py-1 rounded w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="block mb-1 font-semibold">Phone</label>
        <input
          placeholder="Phone"
          className="input border px-2 py-1 rounded w-full"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      {error && <div className="text-red-600">{error}</div>}
      {isError && <div className="text-red-600">{mutationError?.message || "Failed to create buyer"}</div>}
      {success || isSuccess ? <div className="text-green-600">Buyer created!</div> : null}
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={isLoading}
      >
        {isLoading ? "Saving..." : "Save Buyer"}
      </button>
    </form>
  );
}
