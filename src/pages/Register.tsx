import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { GraduationCap, Loader2, Upload, Wrench } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  student_id: z.string().trim().min(1).max(50),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  department: z.string().trim().max(100).optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
});

const Register = () => {
  const navigate = useNavigate();
  const { enabled: maintenance } = useMaintenanceMode();
  const [loading, setLoading] = useState(false);
  const [idCard, setIdCard] = useState<File | null>(null);
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", student_id: "", phone: "", department: "", date_of_birth: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (maintenance) {
      toast.error("System is under maintenance. Please try again later.");
      return;
    }
    if (!idCard) { toast.error("Please upload your Student ID card."); return; }
    if (idCard.size > 10 * 1024 * 1024) { toast.error("ID card must be under 10MB."); return; }

    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }

    setLoading(true);
    const { data: existing } = await supabase
      .from("profiles").select("id").eq("student_id", form.student_id.trim()).maybeSingle();
    if (existing) { setLoading(false); toast.error("That Student ID is already registered."); return; }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: form.full_name.trim(), student_id: form.student_id.trim(),
          phone: form.phone.trim(), department: form.department.trim(), date_of_birth: form.date_of_birth,
        },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(/duplicate|already/i.test(error.message) ? "Account with this email exists." : error.message);
      return;
    }
    // Upload ID card (requires session — Supabase auto-signs in if email confirm is off)
    const uid = signUpData.user?.id;
    if (uid) {
      const ext = idCard.name.split(".").pop() || "bin";
      const path = `${uid}/id-card.${ext}`;
      const { error: upErr } = await supabase.storage.from("id-cards").upload(path, idCard, { upsert: true, contentType: idCard.type });
      if (upErr) {
        console.error("ID upload failed", upErr);
        toast.warning("Account created but ID card upload failed. Please re-upload from your profile.");
      } else {
        await supabase.from("profiles").update({ id_card_url: path, id_card_name: idCard.name }).eq("id", uid);
      }
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
    <div className="container flex min-h-screen items-center justify-center py-10">
      <Card className="card-elevated w-full max-w-xl p-8">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold">Scholaris</span>
        </Link>
        <h1 className="mb-1 text-2xl font-bold">Create your student account</h1>
        <p className="mb-6 text-sm text-muted-foreground">An admin will review your ID card before approval.</p>
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" value={form.password} onChange={(e) => update("password", e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="student_id">Student ID</Label>
            <Input id="student_id" value={form.student_id} onChange={(e) => update("student_id", e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="department">Department / Course</Label>
            <Input id="department" value={form.department} onChange={(e) => update("department", e.target.value)} />
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
