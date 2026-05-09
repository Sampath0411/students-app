import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, History as HistoryIcon, Search } from "lucide-react";
import { toast } from "sonner";

type Status = "present" | "absent" | "late";

const AdminAttendance = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [timetable, setTimetable] = useState<any[]>([]);
  const [periodId, setPeriodId] = useState<string>("none");
  const [audit, setAudit] = useState<any[]>([]);

  const dow = new Date(date).getDay();
  const periodsForDay = useMemo(() => timetable.filter((t) => t.day_of_week === dow), [timetable, dow]);

  const load = async () => {
    const [{ data: studs }, { data: tt }] = await Promise.all([
      supabase.from("profiles").select("*").eq("status", "approved").order("full_name"),
      supabase.from("timetable").select("*").order("day_of_week").order("start_time"),
    ]);
    setStudents(studs || []);
    setTimetable(tt || []);
    await loadMarks(studs || []);
  };

  const loadMarks = async (studs?: any[]) => {
    const list = studs || students;
    let q = supabase.from("attendance").select("*").eq("date", date);
    if (periodId === "none") q = q.is("timetable_id", null);
    else q = q.eq("timetable_id", periodId);
    const { data: att } = await q;
    const m: Record<string, Status> = {};
    (att || []).forEach((a: any) => (m[a.student_id] = a.status));
    setMarks(m);
    // load audit for the day (recent 50)
    const { data: ad } = await supabase
      .from("attendance_audit")
      .select("*")
      .eq("date", date)
      .order("created_at", { ascending: false })
      .limit(50);
    setAudit(ad || []);
    // Also recompute set
    void list;
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { loadMarks(); /* eslint-disable-next-line */ }, [date, periodId]);

  const filtered = useMemo(() => students.filter((s) =>
    [s.full_name, s.email, s.student_id, s.department].some((v) => v?.toLowerCase().includes(search.toLowerCase())),
  ), [students, search]);

  const period = useMemo(() => timetable.find((t) => t.id === periodId), [timetable, periodId]);
  const periodLabel = period
    ? `${period.subject} (${period.start_time?.slice(0, 5)}–${period.end_time?.slice(0, 5)})`
    : null;

  const mark = async (studentId: string, status: Status) => {
    const row: any = {
      student_id: studentId, date, status, marked_by: user?.id,
      timetable_id: periodId === "none" ? null : periodId,
      subject: period?.subject ?? null,
      period_label: periodLabel,
    };
    // Find existing
    let q = supabase.from("attendance").select("id").eq("student_id", studentId).eq("date", date);
    q = periodId === "none" ? q.is("timetable_id", null) : q.eq("timetable_id", periodId);
    const { data: existing } = await q.maybeSingle();

    let error;
    if (existing?.id) {
      ({ error } = await supabase.from("attendance").update(row).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("attendance").insert(row));
    }
    if (error) return toast.error(error.message);
    setMarks((m) => ({ ...m, [studentId]: status }));
  };

  const markAll = async (status: Status) => {
    const rows = filtered.map((s) => ({
      student_id: s.id, date, status, marked_by: user?.id,
      timetable_id: periodId === "none" ? null : periodId,
      subject: period?.subject ?? null,
      period_label: periodLabel,
    }));
    if (rows.length === 0) return;
    const onConflict = periodId === "none" ? "student_id,date" : undefined;
    const { error } = onConflict
      ? await supabase.from("attendance").upsert(rows as any, { onConflict })
      : await (async () => {
          // For per-period entries, insert one by one (unique key may not exist)
          for (const r of rows) {
            const { data: ex } = await supabase
              .from("attendance").select("id")
              .eq("student_id", r.student_id).eq("date", r.date).eq("timetable_id", r.timetable_id!)
              .maybeSingle();
            if (ex?.id) await supabase.from("attendance").update(r).eq("id", ex.id);
            else await supabase.from("attendance").insert(r);
          }
          return { error: null as any };
        })();
    if (error) return toast.error(error.message);
    toast.success(`Marked all visible as ${status}`);
    loadMarks();
  };

  const presentCount = Object.values(marks).filter((v) => v === "present").length;
  const lateCount = Object.values(marks).filter((v) => v === "late").length;
  const absentCount = Object.values(marks).filter((v) => v === "absent").length;

  const StatusBadge = ({ s }: { s?: Status }) => {
    if (!s) return <span className="text-xs text-muted-foreground">—</span>;
    const map: Record<Status, string> = {
      present: "bg-success/15 text-success",
      late: "bg-warning/15 text-warning",
      absent: "bg-destructive/15 text-destructive",
    };
    return <Badge className={`${map[s]} hover:${map[s]}`}>{s}</Badge>;
  };

  return (
    <AppShell kind="admin">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-sm text-muted-foreground">Mark, edit and review attendance in one place.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
          <div>
            <label className="text-xs text-muted-foreground">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Period</label>
            <Select value={periodId} onValueChange={setPeriodId}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Whole day</SelectItem>
                {periodsForDay.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.subject} • {p.start_time?.slice(0, 5)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2"><CheckCircle2 className="h-4 w-4 text-success" /></div>
            <div><div className="text-xs text-muted-foreground">Present</div><div className="text-xl font-semibold">{presentCount}</div></div>
          </div>
        </Card>
        <Card className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning/10 p-2"><Clock className="h-4 w-4 text-warning" /></div>
            <div><div className="text-xs text-muted-foreground">Late</div><div className="text-xl font-semibold">{lateCount}</div></div>
          </div>
        </Card>
        <Card className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-destructive/10 p-2"><XCircle className="h-4 w-4 text-destructive" /></div>
            <div><div className="text-xs text-muted-foreground">Absent</div><div className="text-xl font-semibold">{absentCount}</div></div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="mark" className="w-full">
        <TabsList>
          <TabsTrigger value="mark">Mark / Edit</TabsTrigger>
          <TabsTrigger value="audit"><HistoryIcon className="mr-1.5 h-3.5 w-3.5" /> Edit history</TabsTrigger>
        </TabsList>

        <TabsContent value="mark" className="mt-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search students…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" onClick={() => markAll("present")}>All present</Button>
            <Button variant="outline" size="sm" onClick={() => markAll("absent")}>All absent</Button>
          </div>

          <Card className="card-elevated overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Reg. number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Mark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const cur = marks[s.id];
                  return (
                    <TableRow key={s.id} className={cur === "present" ? "bg-success/5" : undefined}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.student_id}</TableCell>
                      <TableCell><StatusBadge s={cur} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button size="sm" variant={cur === "present" ? "default" : "outline"} onClick={() => mark(s.id, "present")}>Present</Button>
                          <Button size="sm" variant={cur === "late" ? "default" : "outline"} onClick={() => mark(s.id, "late")}>Late</Button>
                          <Button size="sm" variant={cur === "absent" ? "destructive" : "outline"} onClick={() => mark(s.id, "absent")}>Absent</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No approved students match your search.
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card className="card-elevated overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.map((a: any) => {
                  const sName = students.find((s) => s.id === a.student_id)?.full_name || a.student_id.slice(0, 8);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</TableCell>
                      <TableCell>{sName}</TableCell>
                      <TableCell className="text-muted-foreground">{a.period_label || a.subject || "Whole day"}</TableCell>
                      <TableCell><Badge variant="outline">{a.action}</Badge></TableCell>
                      <TableCell>
                        <span className="text-xs">
                          {a.old_status ? <span className="text-muted-foreground line-through mr-1">{a.old_status}</span> : null}
                          <StatusBadge s={a.new_status} />
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {audit.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No edits yet for this date.
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

export default AdminAttendance;
