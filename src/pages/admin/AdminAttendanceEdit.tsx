import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, History } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const AdminAttendanceEdit = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [student, setStudent] = useState<any>(null);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [status, setStatus] = useState<"present" | "late" | "absent">("present");
  const [history, setHistory] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("timetable").select("*").order("day_of_week").order("start_time").then(({ data }) => setTimetable(data || []));
  }, []);

  const dow = new Date(date).getDay();
  const periodsForDay = useMemo(() => timetable.filter((t) => t.day_of_week === dow), [timetable, dow]);

  const findStudent = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    let foundUserId: string | null = null;
    if (/^\d{12}$/.test(q)) {
      const { data: lc } = await supabase.from("login_codes").select("user_id").eq("code", q).maybeSingle();
      foundUserId = lc?.user_id || null;
    }
    if (!foundUserId) {
      const { data: prof } = await supabase.from("profiles").select("*").eq("student_id", q).maybeSingle();
      if (prof) foundUserId = prof.id;
    }
    if (!foundUserId) {
      const { data: prof } = await supabase.from("profiles").select("*").or(`full_name.ilike.%${q}%,email.ilike.%${q}%`).limit(1).maybeSingle();
      if (prof) foundUserId = prof.id;
    }
    if (!foundUserId) {
      setStudent(null);
      setLoading(false);
      toast.error("No student found");
      return;
    }
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", foundUserId).maybeSingle();
    setStudent(prof);
    await loadHistory(foundUserId);
    setLoading(false);
  };

  const loadHistory = async (sid: string) => {
    const [{ data: att }, { data: ad }] = await Promise.all([
      supabase.from("attendance").select("*").eq("student_id", sid).eq("date", date).order("created_at", { ascending: false }),
      supabase.from("attendance_audit").select("*").eq("student_id", sid).eq("date", date).order("created_at", { ascending: false }),
    ]);
    setHistory(att || []);
    setAudit(ad || []);
  };

  useEffect(() => {
    if (student) loadHistory(student.id);
    // eslint-disable-next-line
  }, [date]);

  const apply = async () => {
    if (!student || !periodId) return toast.error("Pick student & period");
    const period = timetable.find((t) => t.id === periodId);
    const periodLabel = period ? `${period.subject} (${period.start_time?.slice(0, 5)}–${period.end_time?.slice(0, 5)})` : null;

    const { data: existing } = await supabase
      .from("attendance").select("id").eq("student_id", student.id).eq("date", date).eq("timetable_id", periodId).maybeSingle();

    let error;
    if (existing?.id) {
      ({ error } = await supabase.from("attendance").update({
        status, marked_by: user!.id, subject: period?.subject ?? null, period_label: periodLabel,
      } as any).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("attendance").insert({
        student_id: student.id, date, status, marked_by: user!.id, timetable_id: periodId,
        subject: period?.subject ?? null, period_label: periodLabel,
      } as any));
    }
    if (error) return toast.error(error.message);
    toast.success("Attendance updated");
    loadHistory(student.id);
  };

  const badge = (s: string) => s === "present" ? "bg-success/15 text-success" : s === "late" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive";

  return (
    <AppShell kind="admin">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit attendance</h1>
        <p className="text-sm text-muted-foreground">Search by student ID, name, email, or 12-digit code, then update without rescanning.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <Card className="card-elevated p-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Student ID / name / 12-digit code" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && findStudent()} />
              <Button onClick={findStudent} disabled={loading} className="gradient-primary text-primary-foreground">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {student && (
              <div className="rounded-lg border border-border bg-card/40 p-3">
                <div className="font-semibold">{student.full_name}</div>
                <div className="text-xs text-muted-foreground">{student.student_id} · {student.email}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div>
                <Label>Period</Label>
                <Select value={periodId} onValueChange={setPeriodId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {periodsForDay.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">No classes that day</div>}
                    {periodsForDay.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{DAYS[p.day_of_week]} · {p.start_time?.slice(0,5)}–{p.end_time?.slice(0,5)} · {p.subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

            <Button onClick={apply} disabled={!student || !periodId} className="w-full gradient-primary text-primary-foreground">Save change</Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="card-elevated overflow-hidden">
            <div className="border-b border-border p-3 text-sm font-semibold">Today's marks ({date})</div>
            <Table>
              <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Status</TableHead><TableHead>At</TableHead></TableRow></TableHeader>
              <TableBody>
                {history.length === 0 ? <TableRow><TableCell colSpan={3} className="py-6 text-center text-xs text-muted-foreground">No marks yet.</TableCell></TableRow>
                  : history.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.period_label || "—"}</TableCell>
                      <TableCell><Badge className={badge(r.status)}>{r.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleTimeString()}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>

          <Card className="card-elevated overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border p-3 text-sm font-semibold"><History className="h-4 w-4" /> Audit log</div>
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Action</TableHead><TableHead>Period</TableHead><TableHead>Change</TableHead></TableRow></TableHeader>
              <TableBody>
                {audit.length === 0 ? <TableRow><TableCell colSpan={4} className="py-6 text-center text-xs text-muted-foreground">No audit entries.</TableCell></TableRow>
                  : audit.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">{new Date(a.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-xs uppercase">{a.action}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.period_label || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {a.old_status ? <span className="text-muted-foreground">{a.old_status} →</span> : <span className="text-muted-foreground">— →</span>} <Badge className={badge(a.new_status)}>{a.new_status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </AppShell>
  );
};

export default AdminAttendanceEdit;
