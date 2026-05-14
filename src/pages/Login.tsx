import { useState, FormEvent, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Wrench, KeyRound, Mail } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import logo from "@/assets/logo.png";

// Configurable admin email - set VITE_ADMIN_EMAIL in .env or use default
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "sampathlox@gmail.com";

const Login = ({ admin = false }: { admin?: boolean }) => {
  const navigate = useNavigate();
  const { enabled: maintenance } = useMaintenanceMode();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Admin-specific OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");

  // Ensure the master admin account exists once.
  useEffect(() => {
    if (admin) {
      supabase.functions.invoke("seed-admin").catch(() => {});
    }
  }, [admin]);

  const finalizeLogin = async (userId: string) => {
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = roles?.some((r) => r.role === "admin");
    if (maintenance && !isAdmin) {
      await supabase.auth.signOut();
      toast.error("System is under maintenance. Please try again later.");
      return;
    }
    if (admin && !isAdmin) {
      await supabase.auth.signOut();
      toast.error("This account is not an admin.");
      return;
    }
    if (!isAdmin) {
      const code = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
      await supabase.from("login_codes").upsert(
        { user_id: userId, code, generated_at: new Date().toISOString(), locked: false, locked_at: null, locked_reason: null },
        { onConflict: "user_id" },
      );
    }
    toast.success("Welcome back!");
    navigate(isAdmin ? "/admin" : "/dashboard");
  };

  const onStudentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return toast.error(error.message);
    await finalizeLogin(data.user.id);
  };

  const sendAdminOtp = async () => {
    setOtpSending(true);
    // Make sure the admin account exists before requesting an OTP.
    await supabase.functions.invoke("seed-admin").catch(() => {});
    const { error } = await supabase.auth.signInWithOtp({
      email: ADMIN_EMAIL,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/admin` },
    });
    setOtpSending(false);
    if (error) return toast.error(error.message);
    setOtpSent(true);
    toast.success(`Code sent to ${ADMIN_EMAIL}`);
  };

  const verifyAdminOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return toast.error("Enter the code from your email");
    setOtpVerifying(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: ADMIN_EMAIL,
      token: otp.trim(),
      type: "email",
    });
    setOtpVerifying(false);
    if (error || !data.user) return toast.error(error?.message || "Invalid code");
    await finalizeLogin(data.user.id);
  };

  const onAdminPwdSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.functions.invoke("seed-admin").catch(() => {});
    const { data, error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: adminPwd,
    });
    setLoading(false);
    if (error || !data.user) return toast.error(error?.message || "Invalid password");
    await finalizeLogin(data.user.id);
  };

  if (maintenance && !admin) {
    return (
      <div className="container flex min-h-screen items-center justify-center">
        <Card className="card-elevated max-w-md p-8 text-center">
          <Wrench className="mx-auto mb-4 h-10 w-10 text-warning" />
          <h1 className="mb-2 text-2xl font-bold">Under maintenance</h1>
          <p className="mb-4 text-muted-foreground">System is under maintenance. Please try again later.</p>
          <Link to="/admin/login" className="text-sm text-primary hover:underline">Admin sign in →</Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="card-elevated w-full max-w-md p-6 sm:p-8">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <img src={logo} alt="CS&SE App" className="h-9 w-9 rounded-lg" />
          <span className="font-bold">CS&amp;SE App</span>
        </Link>

        {admin ? (
          <>
            <h1 className="mb-1 text-2xl font-bold">Admin sign in</h1>
            <p className="mb-6 text-sm text-muted-foreground">Restricted to administrators only.</p>

            <Tabs defaultValue="code" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="code"><Mail className="mr-1.5 h-4 w-4" /> Email code</TabsTrigger>
                <TabsTrigger value="password"><KeyRound className="mr-1.5 h-4 w-4" /> Password</TabsTrigger>
              </TabsList>

              <TabsContent value="code" className="mt-5">
                {!otpSent ? (
                  <div className="space-y-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      A one-time code will be sent to{" "}
                      <span className="font-medium text-foreground">{ADMIN_EMAIL}</span>.
                    </p>
                    <Button
                      onClick={sendAdminOtp}
                      disabled={otpSending}
                      className="w-full gradient-primary text-primary-foreground hover:opacity-90"
                    >
                      {otpSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Send code
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={verifyAdminOtp} className="space-y-4">
                    <div>
                      <Label htmlFor="otp">Enter 6-digit code</Label>
                      <Input
                        id="otp"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        className="text-center text-lg tracking-[0.5em]"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={otpVerifying}
                      className="w-full gradient-primary text-primary-foreground hover:opacity-90"
                    >
                      {otpVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Verify & sign in
                    </Button>
                    <button
                      type="button"
                      onClick={sendAdminOtp}
                      disabled={otpSending}
                      className="w-full text-xs text-primary hover:underline"
                    >
                      {otpSending ? "Sending…" : "Resend code"}
                    </button>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="password" className="mt-5">
                <form onSubmit={onAdminPwdSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="apwd">Admin password</Label>
                    <PasswordInput
                      id="apwd"
                      value={adminPwd}
                      onChange={(e) => setAdminPwd(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Fallback when email code isn't available.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full gradient-primary text-primary-foreground hover:opacity-90"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <>
            <h1 className="mb-1 text-2xl font-bold">Welcome</h1>
            <p className="mb-6 text-sm text-muted-foreground">Sign in or create your student account.</p>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="create">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-5">
                <form onSubmit={onStudentSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <PasswordInput id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <Button
                    type="submit"
                    className="w-full gradient-primary text-primary-foreground hover:opacity-90"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="create" className="mt-5">
                <div className="space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    New student? Set up your account with your registration details, photo and ID card.
                  </p>
                  <Link to="/register" className="block">
                    <Button className="w-full gradient-primary text-primary-foreground hover:opacity-90">
                      Create student account
                    </Button>
                  </Link>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </Card>
    </div>
  );
};

export default Login;
