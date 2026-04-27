import { useEffect, useState, FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Lock, QrCode } from "lucide-react";
import { toast } from "sonner";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [code, setCode] = useState<string>("");
  const [form, setForm] = useState({ full_name: "", phone: "", department: "", date_of_birth: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const [{ data: p }, { data: lc }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("login_codes").select("code").eq("user_id", user.id).maybeSingle(),
    ]);
    setProfile(p);
    setCode(lc?.code || "");
    if (p) {
      setForm({
        full_name: p.full_name || "",
        phone: p.phone || "",
        department: p.department || "",
        date_of_birth: p.date_of_birth || "",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const lastEdit = profile?.last_profile_edit ? new Date(profile.last_profile_edit).getTime() : 0;
  const nextEditAt = lastEdit + WEEK_MS;
  const canEdit = Date.now() >= nextEditAt;
  const daysLeft = Math.ceil((nextEditAt - Date.now()) / (24 * 60 * 60 * 1000));

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toast.error(`You can edit again in ${daysLeft} day(s).`);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        phone: form.phone || null,
        department: form.department || null,
        date_of_birth: form.date_of_birth || null,
        last_profile_edit: new Date().toISOString(),
      })
      .eq("id", user!.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile updated");
      load();
    }
  };

  if (loading) {
    return (
      <AppShell kind="student">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  // QR payload encodes student id + login code so admin scanner can identify
  const qrPayload = JSON.stringify({ uid: user?.id, code, sid: profile?.student_id });

  return (
    <AppShell kind="student">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your details — editable once a week.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="card-elevated p-6">
          <h2 className="mb-4 text-lg font-semibold">Your information</h2>
          <form onSubmit={onSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Email (locked)</Label>
                <Input value={profile?.email || ""} disabled />
              </div>
              <div>
                <Label>Student ID (locked)</Label>
                <Input value={profile?.student_id || ""} disabled />
              </div>
              <div>
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} disabled={!canEdit} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!canEdit} />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input id="department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} disabled={!canEdit} />
              </div>
              <div>
                <Label htmlFor="dob">Date of birth</Label>
                <Input id="dob" type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} disabled={!canEdit} />
              </div>
            </div>
            {!canEdit && (
              <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
                <Lock className="h-4 w-4" /> You can edit again in {daysLeft} day(s).
              </div>
            )}
            <Button type="submit" disabled={!canEdit || saving} className="gradient-primary text-primary-foreground hover:opacity-90">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </form>
        </Card>

        <Card className="card-elevated p-6">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
            <QrCode className="h-5 w-5 text-primary" /> Session QR
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            New code generated each login. Show this to admin for attendance.
          </p>
          {code ? (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-xl bg-white p-4">
                <QRCodeSVG value={qrPayload} size={200} />
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Session code</div>
                <div className="font-mono text-lg font-bold tracking-widest">{code}</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sign out and back in to generate a code.</p>
          )}
        </Card>
      </div>
    </AppShell>
  );
};

export default Profile;
