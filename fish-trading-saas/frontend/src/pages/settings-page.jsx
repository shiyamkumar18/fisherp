import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl">Settings</h2>
      <Card className="max-w-xl space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
          <div>
            <p>Email notifications</p>
            <p className="text-sm text-slate-500">Receive order and delivery updates by email.</p>
          </div>
          <input type="checkbox" checked={notifyByEmail} onChange={(e) => setNotifyByEmail(e.target.checked)} className="h-4 w-4" />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
          <div>
            <p>Compact dashboard mode</p>
            <p className="text-sm text-slate-500">Show denser KPI layout for large datasets.</p>
          </div>
          <input type="checkbox" checked={compactMode} onChange={(e) => setCompactMode(e.target.checked)} className="h-4 w-4" />
        </div>

        <Button>Save Preferences</Button>
      </Card>
    </div>
  );
}
