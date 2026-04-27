import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ScanLine, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const AdminScan = () => {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"present" | "late" | "absent">("present");
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState<any>(null);

  const submit = async () => {
    if (code.length !== 12) { toast.error("Code must be 12 digits"); return; }
    setLoading(true);
    // Find student by login code
    const { data: lc } = await supabase.from("login_codes").select("user_id").eq("code", code).maybeSingle();
    if (!lc) { setLoading(false); toast.error("No student found for that code"); return; }
    const { data: prof } = await supabase.from("profiles").select("full_name, student_id").eq("id", lc.user_id).maybeSingle();
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("attendance").upsert(
      { student_id: lc.user_id, date: today, status, marked_by: user!.id },
      { onConflict: "student_id,date" } as any,
    );
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked ${prof?.full_name || "student"} as ${status}`);
    setLast({ ...prof, status });
    setCode("");
  };

  // Try parse JSON QR payload pasted in
  const onCodeChange = (v: string) => {
    try {
      const parsed = JSON.parse(v);
      if (parsed?.code && /^\d{12}$/.test(parsed.code)) { setCode(parsed.code); return; }
    } catch {}
    setCode(v.replace(/\D/g, "").slice(0, 12));
  };

  return (
    <AppShell kind="admin">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Scan QR / Code</h1>
        <p className="text-sm text-muted-foreground">Enter the 12-digit code shown on the student's profile to mark attendance.</p>
      </div>

      <Card className="card-elevated mx-auto max-w-md p-8">
        <ScanLine className="mx-auto mb-4 h-12 w-12 text-primary" />
        <div className="space-y-4">
          <div>
            <Label>12-digit session code</Label>
            <Input
              autoFocus
              placeholder="000000000000"
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              className="text-center font-mono text-lg tracking-widest"
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={submit} disabled={loading || code.length !== 12} className="w-full gradient-primary text-primary-foreground hover:opacity-90">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Mark attendance
          </Button>
        </div>
        {last && (
          <div className="mt-6 rounded-lg border border-success/30 bg-success/5 p-4 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-success" />
            <div className="font-semibold">{last.full_name}</div>
            <div className="text-xs text-muted-foreground">{last.student_id} · marked {last.status}</div>
          </div>
        )}
      </Card>
    </AppShell>
  );
};

export default AdminScan;
