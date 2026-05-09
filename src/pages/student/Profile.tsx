import { useEffect, useState, FormEvent, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Lock, QrCode, ShieldCheck, Camera, X, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [code, setCode] = useState<string>("");
  const [qrLocked, setQrLocked] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", department: "", date_of_birth: "" });
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: p }, { data: lc }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("login_codes").select("code, locked").eq("user_id", user.id).maybeSingle(),
    ]);
    setProfile(p);
    setCode(lc?.code || "");
    setQrLocked(!!(lc as any)?.locked);
    if (p) {
      setForm({
        full_name: p.full_name || "",
        phone: p.phone || "",
        department: p.department || "",
        date_of_birth: p.date_of_birth || "",
      });
      
      setPhotoUrl((p as any).avatar_url || "");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("login_codes_self")
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "login_codes", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          setQrLocked(!!payload.new?.locked);
          if (payload.new?.code) setCode(payload.new.code);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const lastEdit = profile?.last_profile_edit ? new Date(profile.last_profile_edit).getTime() : 0;
  const nextEditAt = lastEdit + WEEK_MS;
  const canEdit = Date.now() >= nextEditAt;
  const daysLeft = Math.ceil((nextEditAt - Date.now()) / (24 * 60 * 60 * 1000));

  const onPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return toast.error("Pick an image file");
    if (file.size > 4 * 1024 * 1024) return toast.error("Max 4 MB");
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${pub.publicUrl}?t=${Date.now()}`;
    const { error: updErr } = await supabase.from("profiles").update({ avatar_url: url } as any).eq("id", user.id);
    setUploading(false);
    if (updErr) toast.error(updErr.message);
    else { setPhotoUrl(url); toast.success("Photo updated"); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ avatar_url: null } as any).eq("id", user.id);
    if (error) toast.error(error.message);
    else { setPhotoUrl(""); toast.success("Photo removed"); }
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit) { toast.error(`You can edit again in ${daysLeft} day(s).`); return; }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        phone: form.phone || null,
        department: form.department || null,
        date_of_birth: form.date_of_birth || null,
        last_profile_edit: new Date().toISOString(),
      } as any)
      .eq("id", user!.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Profile updated"); load(); }
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
          <form onSubmit={onSave} className="space-y-6">
            <div>
              <Label className="mb-2 block">Profile picture</Label>
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative">
                  {photoUrl ? (
                    <img src={photoUrl} alt="profile" className="h-24 w-24 rounded-2xl object-cover ring-2 ring-border" />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 text-muted-foreground">
                      <UserIcon className="h-8 w-8" />
                    </div>
                  )}
                  {photoUrl && (
                    <button type="button" onClick={removePhoto} title="Remove photo"
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhotoChange} />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                    {photoUrl ? "Change photo" : "Upload photo"}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">JPG/PNG, max 4 MB.</p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Email (locked)</Label><Input value={profile?.email || ""} disabled /></div>
              <div><Label>Registration number (locked)</Label><Input value={profile?.student_id || ""} disabled /></div>
              <div><Label htmlFor="full_name">Full name</Label><Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} disabled={!canEdit} /></div>
              <div><Label htmlFor="phone">Phone</Label><Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!canEdit} /></div>
              <div><Label htmlFor="department">Department</Label><Input id="department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} disabled={!canEdit} /></div>
              <div><Label htmlFor="dob">Date of birth</Label><Input id="dob" type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} disabled={!canEdit} /></div>
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
            Show this to admin for attendance.
          </p>
          {code ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative rounded-xl bg-white p-4">
                <div className={qrLocked ? "blur-md select-none pointer-events-none" : ""}>
                  <QRCodeSVG value={qrPayload} size={200} />
                </div>
                {qrLocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-xl bg-background/40">
                    <Lock className="h-8 w-8 text-foreground" />
                    <span className="rounded-md bg-foreground/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-background">
                      Locked
                    </span>
                  </div>
                )}
              </div>
              {qrLocked ? (
                <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
                  <Lock className="h-3.5 w-3.5" /> Attendance recorded — QR locked. Ask admin to unlock.
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
                  <ShieldCheck className="h-3.5 w-3.5" /> Active — ready to scan.
                </div>
              )}
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
