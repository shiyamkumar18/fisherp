import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import toast from "react-hot-toast";

export default function CreateCompanyPage() {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Replace with your API utility if needed
      const res = await fetch("/api/companies/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, logo }),
      });
      if (!res.ok) throw new Error("Failed to create company");
      toast.success("Company created!");
      navigate("/onboarding/plan");
    } catch (err) {
      toast.error(err.message || "Error creating company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto mt-12 p-6">
      <h2 className="text-xl font-bold mb-4">Create Your Company</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          placeholder="Company Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <Input
          placeholder="Logo URL (optional)"
          value={logo}
          onChange={e => setLogo(e.target.value)}
        />
        <Button type="submit" className="mt-2" loading={loading} disabled={loading}>
          {loading ? "Creating..." : "Continue"}
        </Button>
      </form>
    </Card>
  );
}
