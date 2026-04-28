import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ScanLine, CheckCircle2, Camera, CameraOff, Unlock } from "lucide-react";
import { toast } from "sonner";
import { Scanner } from "@yudiel/react-qr-scanner";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const AdminScan = () => {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"present" | "late" | "absent">("present");
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState<any>(null);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [periodId, setPeriodId] = useState<string>("");
  const [camOn, setCamOn] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("timetable").select("*").order("day_of_week").order("start_time");
      setTimetable(data || []);
      // Auto-pick current period for today if any
      const now = new Date();
      const dow = now.getDay();
      const hhmm = now.toTimeString().slice(0, 5);
      const current = (data || []).find(
        (p: any) => p.day_of_week === dow && p.start_time?.slice(0, 5) <= hhmm && hhmm <= p.end_time?.slice(0, 5),
      );
      if (current) setPeriodId(current.id);
    })();
  }, []);

  const todayPeriods = useMemo(() => {
    const dow = new Date().getDay();
    return timetable.filter((t) => t.day_of_week === dow);
  }, [timetable]);

  const submit = async (rawCode?: string) => {
    const useCode = (rawCode ?? code).replace(/\D/g, "").slice(0, 12);
    if (useCode.length !== 12) {
      toast.error("Code must be 12 digits");
      return;
    }
    if (!periodId) {
      toast.error("Select a period first");
      return;
    }
    setLoading(true);
    const period = timetable.find((t) => t.id === periodId);
    const { data: lc } = await supabase
      .from("login_codes")
      .select("user_id, locked")
      .eq("code", useCode)
      .maybeSingle();
    if (!lc) {
      setLoading(false);
      toast.error("No student found for that code");
      return;
    }
    if ((lc as any).locked) {
      setLoading(false);
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, student_id")
        .eq("id", lc.user_id)
        .maybeSingle();
      setLast({ ...prof, user_id: lc.user_id, status: "locked", period_label: "QR locked", locked: true });
      toast.error(`${prof?.full_name || "Student"}'s QR is locked. Unlock to re-scan.`);
      return;
    }
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, student_id")
      .eq("id", lc.user_id)
      .maybeSingle();
    const today = new Date().toISOString().slice(0, 10);
    const periodLabel = period
      ? `${period.subject} (${period.start_time?.slice(0, 5)}–${period.end_time?.slice(0, 5)})`
      : null;

    // Manual upsert by (student_id, date, timetable_id)
    const existingQuery: any = supabase
      .from("attendance")
      .select("id")
      .eq("student_id", lc.user_id)
      .eq("date", today)
      .eq("timetable_id", periodId)
      .maybeSingle();
    const { data: existing } = await existingQuery;

    let error;
    if (existing?.id) {
      ({ error } = await supabase
        .from("attendance")
        .update({
          status,
          marked_by: user!.id,
          subject: period?.subject ?? null,
          period_label: periodLabel,
        } as any)
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("attendance").insert({
        student_id: lc.user_id,
        date: today,
        status,
        marked_by: user!.id,
        timetable_id: periodId,
        subject: period?.subject ?? null,
        period_label: periodLabel,
      } as any));
    }

    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${prof?.full_name || "Student"} · ${period?.subject || "period"} → ${status}`);
    setLast({ ...prof, user_id: lc.user_id, status, period_label: periodLabel, locked: true });
    setCode("");
  };

  const unlockStudent = async (userId: string) => {
    const { error } = await supabase
      .from("login_codes")
      .update({ locked: false, locked_at: null, locked_reason: null } as any)
      .eq("user_id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("QR unlocked");
    setLast((l: any) => (l ? { ...l, locked: false } : l));
  };

  const onCodeChange = (v: string) => {
    try {
      const parsed = JSON.parse(v);
      if (parsed?.code && /^\d{12}$/.test(parsed.code)) {
        setCode(parsed.code);
        return;
      }
    } catch {
      // not JSON
    }
    setCode(v.replace(/\D/g, "").slice(0, 12));
  };

  const handleScan = (results: { rawValue: string }[]) => {
    if (!results?.length) return;
    const raw = results[0].rawValue;
    let extracted = "";
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.code && /^\d{12}$/.test(parsed.code)) extracted = parsed.code;
    } catch {
      const digits = raw.replace(/\D/g, "");
      if (/^\d{12}$/.test(digits)) extracted = digits;
    }
    if (!extracted) return;
    if (loading) return;
    setCode(extracted);
    submit(extracted);
  };

  return (
    <AppShell kind="admin">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Scan QR / Code</h1>
        <p className="text-sm text-muted-foreground">
          Pick a period, then scan the student's QR code via camera or enter the 12-digit code manually.
        </p>
      </div>

      <Card className="card-elevated mx-auto max-w-xl p-6 md:p-8">
        <ScanLine className="mx-auto mb-4 h-12 w-12 text-primary" />

        <div className="space-y-4">
          <div>
            <Label>Period (today)</Label>
            <Select value={periodId} onValueChange={setPeriodId}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {todayPeriods.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No classes scheduled today</div>
                )}
                {todayPeriods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {DAYS[p.day_of_week]} · {p.start_time?.slice(0, 5)}–{p.end_time?.slice(0, 5)} · {p.subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <Label className="m-0">Camera scanner</Label>
              <Button
                size="sm"
                variant={camOn ? "destructive" : "outline"}
                onClick={() => setCamOn((v) => !v)}
                disabled={!periodId}
              >
                {camOn ? (
                  <>
                    <CameraOff className="mr-2 h-4 w-4" /> Stop
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" /> Open camera
                  </>
                )}
              </Button>
            </div>
            {camOn ? (
              <div className="overflow-hidden rounded-md bg-black">
                <Scanner
                  onScan={handleScan}
                  onError={(e) => toast.error((e as Error)?.message || "Camera error")}
                  constraints={{ facingMode: "environment" }}
                  styles={{ container: { width: "100%" } }}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Tap "Open camera" to scan a student's QR.</p>
            )}
          </div>

          <div>
            <Label>Or enter 12-digit code</Label>
            <Input
              placeholder="000000000000"
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              className="text-center font-mono text-lg tracking-widest"
            />
          </div>

          <Button
            onClick={() => submit()}
            disabled={loading || code.length !== 12 || !periodId}
            className="w-full gradient-primary text-primary-foreground hover:opacity-90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Mark attendance
          </Button>
        </div>

        {last && (
          <div
            className={`mt-6 rounded-lg border p-4 text-center ${
              last.locked ? "border-warning/40 bg-warning/5" : "border-success/30 bg-success/5"
            }`}
          >
            {last.locked ? (
              <Unlock className="mx-auto mb-2 h-6 w-6 text-warning" />
            ) : (
              <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-success" />
            )}
            <div className="font-semibold">{last.full_name}</div>
            <div className="text-xs text-muted-foreground">
              {last.student_id} · {last.period_label} · marked {last.status}
            </div>
            {last.locked && last.user_id && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => unlockStudent(last.user_id)}
              >
                <Unlock className="mr-2 h-4 w-4" /> Unlock QR
              </Button>
            )}
          </div>
        )}
      </Card>
    </AppShell>
  );
};

export default AdminScan;
