import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";

const Login = ({ admin = false }: { admin?: boolean }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState(admin ? "admin@demo.com" : "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    // Check role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    setLoading(false);
    const isAdmin = roles?.some((r) => r.role === "admin");
    if (admin && !isAdmin) {
      await supabase.auth.signOut();
      toast.error("This account is not an admin.");
      return;
    }
    // Generate fresh 12-digit login code for students
    if (!isAdmin) {
      const code = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
      await supabase.from("login_codes").upsert(
        { user_id: data.user.id, code, generated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    }
    toast.success("Welcome back!");
    navigate(isAdmin ? "/admin" : "/dashboard");
  };

  const seedAdmin = async () => {
    const { data, error } = await supabase.functions.invoke("seed-admin");
    if (error) toast.error(error.message);
    else toast.success(`Admin ready. Email: ${data.email} • Password: ${data.password}`);
  };

  return (
    <div className="container flex min-h-screen items-center justify-center">
      <Card className="card-elevated w-full max-w-md p-8">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold">Scholaris</span>
        </Link>
        <h1 className="mb-1 text-2xl font-bold">{admin ? "Admin sign in" : "Welcome back"}</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {admin ? "Restricted to administrators." : "Sign in to your student dashboard."}
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full gradient-primary text-primary-foreground hover:opacity-90" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>
        {admin ? (
          <div className="mt-6 space-y-3 text-center text-sm">
            <button onClick={seedAdmin} className="text-primary hover:underline">
              Seed / reset demo admin
            </button>
            <p className="text-muted-foreground">
              Default: <code className="rounded bg-muted px-1.5 py-0.5">admin@demo.com</code> /{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">Admin@12345</code>
            </p>
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/register" className="text-primary hover:underline">Create an account</Link>
          </p>
        )}
      </Card>
    </div>
  );
};

export default Login;
