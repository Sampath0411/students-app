import { useEffect, useState, FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PasswordInput } from "@/components/PasswordInput";
import { Loader2, Moon, Sun, Bell, KeyRound, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const THEME_KEY = "scholaris.theme";
const NOTIF_KEY = "scholaris.notifications";

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [notif, setNotif] = useState(true);
  const [pwd, setPwd] = useState({ next: "", confirm: "" });
  const [savingPwd, setSavingPwd] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const t = (localStorage.getItem(THEME_KEY) as any) || (document.documentElement.classList.contains("dark") ? "dark" : "light");
    setTheme(t);
    setNotif(localStorage.getItem(NOTIF_KEY) !== "false");
  }, []);

  const applyTheme = (t: "light" | "dark") => {
    setTheme(t);
    localStorage.setItem(THEME_KEY, t);
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.classList.toggle("light", t === "light");
  };

  const toggleNotif = (v: boolean) => {
    setNotif(v);
    localStorage.setItem(NOTIF_KEY, String(v));
    toast.success(v ? "Notifications enabled" : "Notifications muted");
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (pwd.next.length < 6) return toast.error("Password must be at least 6 characters");
    if (pwd.next !== pwd.confirm) return toast.error("Passwords do not match");
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    setSavingPwd(false);
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setPwd({ next: "", confirm: "" }); }
  };

  const clearChat = async () => {
    if (!user) return;
    setClearing(true);
    await supabase.from("chat_messages").delete().eq("user_id", user.id);
    await supabase.from("chat_conversations").delete().eq("user_id", user.id);
    setClearing(false);
    toast.success("Chat history cleared");
  };

  const logout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <AppShell kind="student">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your preferences and account.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-elevated p-6">
          <h2 className="mb-4 text-lg font-semibold">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Theme</Label>
              <p className="text-xs text-muted-foreground">Switch between light and dark mode.</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={theme === "light" ? "default" : "outline"} onClick={() => applyTheme("light")}>
                <Sun className="mr-1 h-4 w-4" /> Light
              </Button>
              <Button size="sm" variant={theme === "dark" ? "default" : "outline"} onClick={() => applyTheme("dark")}>
                <Moon className="mr-1 h-4 w-4" /> Dark
              </Button>
            </div>
          </div>
        </Card>

        <Card className="card-elevated p-6">
          <h2 className="mb-4 text-lg font-semibold">Notifications</h2>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> In-app notifications</Label>
              <p className="text-xs text-muted-foreground">Toast alerts for assignments, grades, announcements.</p>
            </div>
            <Switch checked={notif} onCheckedChange={toggleNotif} />
          </div>
        </Card>

        <Card className="card-elevated p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><KeyRound className="h-5 w-5 text-primary" /> Change password</h2>
          <form onSubmit={changePassword} className="space-y-3">
            <div>
              <Label>New password</Label>
              <PasswordInput value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} minLength={6} required />
            </div>
            <div>
              <Label>Confirm new password</Label>
              <PasswordInput value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} minLength={6} required />
            </div>
            <Button type="submit" disabled={savingPwd} className="gradient-primary text-primary-foreground">
              {savingPwd && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update password
            </Button>
          </form>
        </Card>

        <Card className="card-elevated p-6">
          <h2 className="mb-4 text-lg font-semibold">Privacy & data</h2>
          <p className="mb-3 text-xs text-muted-foreground">Manage your account data.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={clearChat} disabled={clearing}>
              {clearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Clear chat history
            </Button>
            <Button variant="outline" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
          <div className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            Signed in as <span className="font-mono">{user?.email}</span>
          </div>
        </Card>
      </div>
    </AppShell>
  );
};

export default Settings;
