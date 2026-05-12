import { useState, FormEvent, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertCircle, Loader2, Upload, Wrench, Camera, X, Mail } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { ImageCropper } from "@/components/ImageCropper";
import logo from "@/assets/logo.png";

type SignupDiagnostic = {
  stage: string;
  summary: string;
  details?: string;
};

const readableError = (error: unknown) => {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const source = error as Record<string, unknown>;
    const parts = ["message", "code", "status", "name", "details", "hint"]
      .map((key) => (source[key] ? `${key}: ${String(source[key])}` : ""))
      .filter(Boolean);
    if (parts.length) return parts.join(" | ");
    try { return JSON.stringify(error); } catch { return String(error); }
  }
  return String(error);
};

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
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [signupDiagnostic, setSignupDiagnostic] = useState<SignupDiagnostic | null>(null);
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", student_id: "", phone: "", department: "", date_of_birth: "",
  });

  // OTP verification step
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const logServer = async (
    stage: string,
    success: boolean,
    message?: string,
    extra?: Record<string, unknown>,
    userId?: string
  ) => {
    try {
      await supabase.rpc("log_signup_event" as any, {
        _stage: stage,
        _success: success,
        _email: form.email?.trim().toLowerCase() || null,
        _student_id: form.student_id?.trim() || null,
        _user_id: userId || null,
        _message: message?.slice(0, 1000) || null,
        _details: extra ? (extra as any) : null,
      });
    } catch (e) { console.warn("signup log failed", e); }
  };

  const failSignup = (diagnostic: SignupDiagnostic, toastMessage?: string) => {
    setSignupDiagnostic(diagnostic);
    toast.error(toastMessage || diagnostic.summary);
    void logServer(`client.${diagnostic.stage}`, false, diagnostic.summary, { details: diagnostic.details });
  };

  const onPhotoPick = (file: File | null) => {
    if (!file) { setPhotoBlob(null); setPhotoPreview(""); return; }
    if (!file.type.startsWith("image/")) { toast.error("Photo must be an image"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Photo must be under 8 MB"); return; }
    setCropFile(file);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSignupDiagnostic(null);
    if (maintenance) { failSignup({ stage: "Before submit", summary: "System is under maintenance." }, "System is under maintenance. Please try again later."); return; }
    if (!photoBlob) { failSignup({ stage: "Photo validation", summary: "Passport-size photo is missing." }, "Please upload a passport-size photo."); return; }
    if (!idCard) { failSignup({ stage: "ID card validation", summary: "Student ID card file is missing." }, "Please upload your Student ID card."); return; }
    if (idCard.size > 10 * 1024 * 1024) { failSignup({ stage: "ID card validation", summary: "ID card file is larger than 10 MB.", details: `Selected size: ${(idCard.size / 1024 / 1024).toFixed(2)} MB` }, "ID card must be under 10MB."); return; }

    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      failSignup({ stage: "Form validation", summary: parsed.error.errors[0].message, details: parsed.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join(" | ") });
      return;
    }
    const email = parsed.data.email.trim().toLowerCase();
    const registrationNumber = parsed.data.student_id.trim();

    setLoading(true);
    void logServer("client.submit", true, "Submit started", { email, registrationNumber });

    const { data: taken, error: checkError } = await supabase.rpc("student_id_taken" as any, { _sid: registrationNumber });
    if (checkError) {
      setLoading(false);
      failSignup({
        stage: "Registration number duplicate check",
        summary: "Could not verify whether this registration number is already used.",
        details: readableError(checkError),
      }, "Could not verify registration number. Please try again.");
      return;
    }
    void logServer("client.rpc.student_id_taken", true, `taken=${!!taken}`);
    if (taken) {
      setLoading(false);
      failSignup({
        stage: "Registration number duplicate check",
        summary: "That registration number is already registered.",
        details: `registration_number: ${registrationNumber}`,
      });
      return;
    }

    void logServer("client.auth.signUp.start", true, "Calling supabase.auth.signUp");
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        data: {
          full_name: parsed.data.full_name.trim(),
          student_id: registrationNumber,
          phone: parsed.data.phone?.trim() || "",
          department: parsed.data.department?.trim() || "",
          date_of_birth: parsed.data.date_of_birth || "",
        },
      },
    });
    setLoading(false);
    if (error) {
      const message = /database error saving new user/i.test(error.message)
        ? "This registration could not be created. Please check the registration number and try again."
        : /duplicate|already/i.test(error.message)
          ? "Account with this email exists."
          : error.message;
      failSignup({
        stage: "Account creation / database profile trigger",
        summary: message,
        details: readableError(error),
      }, message);
      return;
    }
    void logServer("client.auth.signUp.ok", true, "signUp returned", { userId: signUpData.user?.id }, signUpData.user?.id);
    setSignupDiagnostic(null);
    toast.success(`We sent a 6-digit code to ${email}`);
    setOtpStep(true);
  };

  const verifyAndUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (otp.trim().length < 6) return toast.error("Enter the 6-digit code");
    setVerifying(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: form.email.trim(),
      token: otp.trim(),
      type: "email",
    });
    if (error || !data.user) {
      setVerifying(false);
      return failSignup({
        stage: "Email OTP verification",
        summary: error?.message || "Invalid or expired code",
        details: readableError(error) || "No user session returned after OTP verification.",
      }, error?.message || "Invalid or expired code");
    }
    const uid = data.user.id;

    // Upload passport photo → set as avatar
    try {
      const photoPath = `${uid}/avatar-${Date.now()}.jpg`;
      const { error: pErr } = await supabase.storage.from("avatars").upload(photoPath, photoBlob!, {
        upsert: true, contentType: "image/jpeg",
      });
      if (!pErr) {
        const { data: pub } = supabase.storage.from("avatars").getPublicUrl(photoPath);
        const { error: profilePhotoError } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl } as any).eq("id", uid);
        if (profilePhotoError) {
          setSignupDiagnostic({ stage: "Profile photo save", summary: "Photo uploaded, but profile photo URL could not be saved.", details: readableError(profilePhotoError) });
        }
      } else {
        setSignupDiagnostic({ stage: "Passport photo upload", summary: "Email verified, but passport photo upload failed.", details: readableError(pErr) });
      }
    } catch (err) { console.error(err); setSignupDiagnostic({ stage: "Passport photo upload", summary: "Unexpected photo upload error.", details: readableError(err) }); }

    // Upload ID card
    try {
      const ext = (idCard!.name.split(".").pop() || "bin").toLowerCase();
      const path = `${uid}/id-card.${ext}`;
      const { error: upErr } = await supabase.storage.from("id-cards").upload(path, idCard!, {
        upsert: true, contentType: idCard!.type,
      });
      if (upErr) {
        setSignupDiagnostic({ stage: "ID card upload", summary: "Account verified but ID card upload failed.", details: readableError(upErr) });
        toast.warning("Account verified but ID card upload failed. Please re-upload from your profile.");
      } else {
        const { error: idProfileError } = await supabase.from("profiles").update({ id_card_url: path, id_card_name: idCard!.name }).eq("id", uid);
        if (idProfileError) {
          setSignupDiagnostic({ stage: "ID card save", summary: "ID card uploaded, but profile record could not be updated.", details: readableError(idProfileError) });
        }
      }
    } catch (err) { console.error(err); setSignupDiagnostic({ stage: "ID card upload", summary: "Unexpected ID card upload error.", details: readableError(err) }); }

    setVerifying(false);
    toast.success("Email verified! Pending admin approval.");
    navigate("/dashboard");
  };

  const resendOtp = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: form.email.trim() });
    setResending(false);
    if (error) toast.error(error.message);
    else toast.success("New code sent");
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

  if (otpStep) {
    return (
      <div className="container flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="card-elevated w-full max-w-md p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-2">
            <img src={logo} alt="CS&SE App" className="h-9 w-9 rounded-lg" />
            <span className="font-bold">CS&amp;SE App</span>
          </div>
          <div className="mb-5 flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Verify your email</h1>
          </div>
          <p className="mb-5 text-sm text-muted-foreground">
            We sent a 6-digit code to <span className="font-medium text-foreground">{form.email}</span>.
            Enter it below to finish creating your account.
          </p>
          {signupDiagnostic && (
            <Alert variant="destructive" className="mb-5">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Signup failed at: {signupDiagnostic.stage}</AlertTitle>
              <AlertDescription className="space-y-1">
                <p>{signupDiagnostic.summary}</p>
                {signupDiagnostic.details && <p className="break-words font-mono text-xs">{signupDiagnostic.details}</p>}
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={verifyAndUpload} className="space-y-4">
            <div>
              <Label htmlFor="otp">6-digit code</Label>
              <Input
                id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="text-center text-lg tracking-[0.5em]" required
              />
            </div>
            <Button type="submit" disabled={verifying} className="w-full gradient-primary text-primary-foreground hover:opacity-90">
              {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & finish
            </Button>
            <button type="button" onClick={resendOtp} disabled={resending}
              className="w-full text-xs text-primary hover:underline">
              {resending ? "Sending…" : "Resend code"}
            </button>
          </form>
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

        {signupDiagnostic && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Signup failed at: {signupDiagnostic.stage}</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>{signupDiagnostic.summary}</p>
              {signupDiagnostic.details && <p className="break-words font-mono text-xs">{signupDiagnostic.details}</p>}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
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
                  <button type="button" onClick={() => onPhotoPick(null)}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                    title="Remove">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <input ref={photoRef} type="file" accept="image/*" hidden
                  onChange={(e) => onPhotoPick(e.target.files?.[0] || null)} />
                <Button type="button" variant="outline" size="sm" onClick={() => photoRef.current?.click()}>
                  <Camera className="mr-2 h-4 w-4" /> {photoBlob ? "Change photo" : "Upload & crop"}
                </Button>
                <p className="text-[11px] text-muted-foreground">JPG/PNG. You'll be able to crop it before submitting.</p>
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
              Send verification code
            </Button>
          </div>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </Card>

      <ImageCropper
        file={cropFile}
        onClose={() => { setCropFile(null); if (photoRef.current) photoRef.current.value = ""; }}
        onCropped={(blob, url) => { setPhotoBlob(blob); setPhotoPreview(url); }}
      />
    </div>
  );
};

export default Register;
