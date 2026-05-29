import { useState, useEffect } from "react";
import Card from "@/components/ui/card";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/shared/toast-provider";
import { fetchProfile, updateProfile } from "@/services/profileService";
import { User, Phone, Mail, Shield, CheckCircle } from "lucide-react";

export default function ProfilePage() {
  const { session, login } = useAuthStore();
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    username: session?.user?.username || "",
    email: session?.user?.email || "",
    phone: session?.user?.phone || "",
    first_name: session?.user?.first_name || "",
    last_name: session?.user?.last_name || "",
  });

  const [twoFactor, setTwoFactor] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchProfile();
        setForm({
          username: data.username || "",
          email: data.email || "",
          phone: data.phone || "",
          first_name: data.first_name || "",
          last_name: data.last_name || "",
        });
        setTwoFactor(data.two_factor_enabled || false);
      } catch (e) {
        push({ message: "Failed to load profile", type: "error" });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [push]);

  const onSave = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const updated = await updateProfile({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
      });
      // Update global store
      login({ ...session, user: { ...session.user, ...updated } });
      push({ message: "Profile updated successfully.", type: "success" });
    } catch (e) {
      push({ message: "Error updating profile.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading profile...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">My Profile</h2>
        <p className="text-sm text-textSecondary">Manage your personal information and security settings.</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border text-primary font-bold">
            <User size={18} />
            <h3>Personal Information</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-textSecondary">First Name</label>
              <Input value={form.first_name} onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-textSecondary">Last Name</label>
              <Input value={form.last_name} onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))} />
            </div>
          </div>
          
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-textSecondary">Username (Read Only)</label>
            <Input value={form.username} disabled className="bg-border/30 opacity-70" />
          </div>
          
          <Button onClick={onSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border text-primary font-bold">
            <Shield size={18} />
            <h3>Contact & Security</h3>
          </div>
          
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-textSecondary">
              <Mail size={14} /> Email
            </label>
            <Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          </div>
          
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-textSecondary">
              <Phone size={14} /> Phone
            </label>
            <Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">Two-Factor Authentication</p>
              <p className="text-xs text-textSecondary">Protect your account with 2FA.</p>
            </div>
            {twoFactor ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-success bg-success/10 px-2.5 py-1 rounded-full">
                <CheckCircle size={14} /> Enabled
              </span>
            ) : (
              <Button variant="outline" size="sm">Enable 2FA</Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
