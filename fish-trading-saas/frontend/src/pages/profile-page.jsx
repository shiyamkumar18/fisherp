import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/shared/toast-provider";

export default function ProfilePage() {
  const { session, login } = useAuthStore();
  const { push } = useToast();

  const [form, setForm] = useState({
    username: session?.user?.username || "",
    email: session?.user?.email || "",
  });

  const onSave = () => {
    if (!session) return;
    login({ ...session, user: { ...session.user, ...form } });
    push({ message: "Profile updated." });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl">User Profile</h2>
      <Card className="max-w-xl space-y-4">
        <div>
          <label className="mb-2 block text-sm text-slate-600">Username</label>
          <Input value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} />
        </div>
        <div>
          <label className="mb-2 block text-sm text-slate-600">Email</label>
          <Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
        </div>
        <Button onClick={onSave}>Save Changes</Button>
      </Card>
    </div>
  );
}
