import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Wrench } from "lucide-react";
import { toast } from "sonner";

const AdminSettings = () => {
  const [maintenance, setMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "maintenance").maybeSingle();
      setMaintenance(!!(data?.value as any)?.enabled);
      setLoading(false);
    })();
  }, []);

  const toggle = async (v: boolean) => {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ value: { enabled: v }, updated_at: new Date().toISOString() })
      .eq("key", "maintenance");
    setSaving(false);
    if (error) return toast.error(error.message);
    setMaintenance(v);
    toast.success(`Maintenance mode ${v ? "enabled" : "disabled"}`);
  };

  return (
    <AppShell kind="admin">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">System settings</h1>
        <p className="text-sm text-muted-foreground">Control system-wide behavior.</p>
      </div>
      {loading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : (
        <Card className="card-elevated max-w-xl p-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <Label className="flex items-center gap-2 text-base font-semibold"><Wrench className="h-4 w-4 text-primary" /> Maintenance mode</Label>
              <p className="mt-1 text-sm text-muted-foreground">When enabled, students cannot log in, register, or access the dashboard. Admins can still sign in.</p>
            </div>
            <Switch checked={maintenance} onCheckedChange={toggle} disabled={saving} />
          </div>
        </Card>
      )}
    </AppShell>
  );
};

export default AdminSettings;
