import { useState, FormEvent, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Upload, Wrench, Camera, X } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import logo from "@/assets/logo.png";

const schema = z.object({
  full_name: z.string().trim().min(2, "Full name is too short").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Password must be 8+ characters").max(72),
  student_id: z.string().trim().min(1, "Registration number is required").max(50),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  department: z.string().trim().max(100).optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
});

const Register = () => {
  const navigate = useNavigate();
  const { enabled: maintenance } = useMaintenanceMode();
  const [loading, setLoading] = useState(false);
  const [idCard, setIdCard] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const photoRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", student_id: "", phone: "", department: "", date_of_birth: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onPhotoPick = (file: File | null) => {
    if (!file) { setPhoto(null); setPhotoPreview(""); return; }
    if (!file.type.startsWith("image/")) { toast.error("Photo must be an image"); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error("Photo must be under 4 MB"); return; }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (maintenance) { toast.error("System is under maintenance. Please try again later."); return; }
    if (!photo) { toast.error("Please upload a passport-size photo."); return; }
    if (!idCard) { toast.error("Please upload your Student ID card."); return; }
    if (idCard.size > 10 * 1024 * 1024) { toast.error("ID card must be under 10MB."); return; }

    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }

    setLoading(true);
    const { data: existing } = await supabase
      .from("profiles").select("id").eq("student_id", form.student_id.trim()).maybeSingle();
    if (existing) { setLoading(false); toast.error("That registration number is already registered."); return; }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: form.full_name.trim(),
          student_id: form.student_id.trim(),
          phone: form.phone.trim(),
          department: form.department.trim(),
          date_of_birth: form.date_of_birth,
        },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(/duplicate|already/i.test(error.message) ? "Account with this email exists." : error.message);
      return;
    }
    const uid = signUpData.user?.id;
    if (uid) {
      // Upload passport photo → set as avatar
      try {
        const ext = (photo.name.split(".").pop() || "jpg").toLowerCase();
        const photoPath = `${uid}/avatar-${Date.now()}.${ext}`;
        const { error: pErr } = await supabase.storage.from("avatars").upload(photoPath, photo, {
          upsert: true, contentType: photo.type,
        });
        if (!pErr) {
          const { data: pub } = supabase.storage.from("avatars").getPublicUrl(photoPath);
          await supabase.from("profiles").update({ avatar_url: pub.publicUrl } as any).eq("id", uid);
        }
      } catch (err) { console.error(err); }

      // Upload ID card
      try {
        const ext = (idCard.name.split(".").pop() || "bin").toLowerCase();
        const path = `${uid}/id-card.${ext}`;
        const { error: upErr } = await supabase.storage.from("id-cards").upload(path, idCard, {
          upsert: true, contentType: idCard.type,
        });
        if (upErr) {
          toast.warning("Account created but ID card upload failed. Please re-upload from your profile.");
        } else {
          await supabase.from("profiles").update({ id_card_url: path, id_card_name: idCard.name }).eq("id", uid);
        }
      } catch (err) { console.error(err); }
    }
    setLoading(false);
    toast.success("Registration submitted! Pending admin approval.");
    navigate("/dashboard");
  };

  if (maintenance) {
    return (
      <div className="container flex min-h-screen items-center justify-center">
        <Card className="card-elevated max-w-md p-8 text-center">
          <Wrench className="mx-auto mb-4 h-10 w-10 text-warning" />
          <h1 className="mb-2 text-2xl font-bold">Under maintenance</h1>
          <p className="text-muted-foreground">System is under maintenance. Please try again later.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="card-elevated w-full max-w-xl p-6 sm:p-8">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <img src={logo} alt="CS&SE App" className="h-9 w-9 rounded-lg" />
          <span className="font-bold">CS&amp;SE App</span>
        </Link>
        <h1 className="mb-1 text-2xl font-bold">Create your student account</h1>
        <p className="mb-6 text-sm text-muted-foreground">An admin will review your photo and ID card before approval.</p>

        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          {/* Passport photo */}
          <div className="md:col-span-2">
            <Label className="mb-2 block">Passport-size photo</Label>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                {photoPreview ? (
                  <img src={photoPreview} alt="preview" className="h-24 w-24 rounded-2xl object-cover ring-2 ring-border" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 text-muted-foreground">
                    <Camera className="h-7 w-7" />
                  </div>
                )}
                {photoPreview && (
                  <button
                    type="button"
                    onClick={() => onPhotoPick(null)}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                    title="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <input ref={photoRef} type="file" accept="image/*" hidden onChange={(e) => onPhotoPick(e.target.files?.[0] || null)} />
                <Button type="button" variant="outline" size="sm" onClick={() => photoRef.current?.click()}>
                  <Camera className="mr-2 h-4 w-4" /> {photo ? "Change photo" : "Upload photo"}
                </Button>
                <p className="text-[11px] text-muted-foreground">JPG/PNG, max 4 MB. Used as your profile picture.</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} required maxLength={100} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} required maxLength={255} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" autoComplete="new-password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={8} />
          </div>
          <div>
            <Label htmlFor="student_id">Registration number</Label>
            <Input id="student_id" value={form.student_id} onChange={(e) => update("student_id", e.target.value)} required maxLength={50} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} maxLength={30} />
          </div>
          <div>
            <Label htmlFor="department">Department / Course</Label>
            <Input id="department" value={form.department} onChange={(e) => update("department", e.target.value)} maxLength={100} />
          </div>
          <div>
            <Label htmlFor="dob">Date of birth</Label>
            <Input id="dob" type="date" value={form.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="idcard">Student ID card (image or PDF)</Label>
            <label htmlFor="idcard" className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border p-3 text-sm hover:bg-muted">
              <Upload className="h-4 w-4 text-primary" />
              <span className="flex-1 truncate">{idCard ? idCard.name : "Click to upload your ID card (max 10MB)"}</span>
            </label>
            <Input id="idcard" type="file" accept="image/*,application/pdf" className="hidden"
              onChange={(e) => setIdCard(e.target.files?.[0] || null)} />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" className="w-full gradient-primary text-primary-foreground hover:opacity-90" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create account
            </Button>
          </div>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </Card>
    </div>
  );
};

export default Register;
