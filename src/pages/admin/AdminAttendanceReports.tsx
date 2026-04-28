import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

const ranges = [
  { id: "daily", label: "Daily (today)" },
  { id: "weekly", label: "Weekly (last 7d)" },
  { id: "monthly", label: "Monthly (last 30d)" },
  { id: "custom", label: "Custom range" },
] as const;

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const AdminAttendanceReports = () => {
  const [range, setRange] = useState<(typeof ranges)[number]["id"]>("daily");
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState<any[]>([]);
  const [students, setStudents] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (range === "daily") { setFrom(today()); setTo(today()); }
    else if (range === "weekly") { setFrom(daysAgo(6)); setTo(today()); }
    else if (range === "monthly") { setFrom(daysAgo(29)); setTo(today()); }
  }, [range]);

  const load = async () => {
    setLoading(true);
    const [{ data: att }, { data: profs }] = await Promise.all([
      supabase.from("attendance").select("*").gte("date", from).lte("date", to).order("date", { ascending: false }),
      supabase.from("profiles").select("id,full_name,student_id,department,email"),
    ]);
    const m: Record<string, any> = {};
    (profs || []).forEach((p: any) => (m[p.id] = p));
    setStudents(m);
    setRows(att || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [from, to]);

  const stats = useMemo(() => {
    const total = rows.length;
    const present = rows.filter((r) => r.status === "present").length;
    const late = rows.filter((r) => r.status === "late").length;
    const absent = rows.filter((r) => r.status === "absent").length;
    return { total, present, late, absent };
  }, [rows]);

  const exportXlsx = () => {
    const detail = rows.map((r) => ({
      Date: r.date,
      "Student ID": students[r.student_id]?.student_id || "",
      Name: students[r.student_id]?.full_name || "",
      Department: students[r.student_id]?.department || "",
      Subject: r.subject || "",
      Period: r.period_label || "",
      Status: r.status,
      "Marked at": new Date(r.created_at).toLocaleString(),
    }));
    // Per-student summary
    const sumMap: Record<string, any> = {};
    rows.forEach((r) => {
      const key = r.student_id;
      if (!sumMap[key]) sumMap[key] = { Name: students[key]?.full_name || "", "Student ID": students[key]?.student_id || "", Present: 0, Late: 0, Absent: 0, Total: 0 };
      sumMap[key].Total += 1;
      if (r.status === "present") sumMap[key].Present += 1;
      else if (r.status === "late") sumMap[key].Late += 1;
      else if (r.status === "absent") sumMap[key].Absent += 1;
    });
    const summary = Object.values(sumMap).map((s: any) => ({
      ...s,
      "Attendance %": s.Total ? Math.round(((s.Present + s.Late) / s.Total) * 100) : 0,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), "Detail");
    XLSX.writeFile(wb, `attendance-${range}-${from}_to_${to}.xlsx`);
  };

  return (
    <AppShell kind="admin">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Attendance reports</h1>
          <p className="text-sm text-muted-foreground">Filter by range and export to Excel.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label>Range</Label>
            <Select value={range} onValueChange={(v: any) => setRange(v)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{ranges.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>From</Label><Input type="date" value={from} onChange={(e) => { setRange("custom"); setFrom(e.target.value); }} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e) => { setRange("custom"); setTo(e.target.value); }} /></div>
          <Button onClick={exportXlsx} className="gradient-primary text-primary-foreground"><Download className="mr-2 h-4 w-4" />Export Excel</Button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card className="card-elevated p-4"><div className="text-xs text-muted-foreground">Records</div><div className="text-2xl font-bold">{stats.total}</div></Card>
        <Card className="card-elevated p-4"><div className="text-xs text-muted-foreground">Present</div><div className="text-2xl font-bold text-success">{stats.present}</div></Card>
        <Card className="card-elevated p-4"><div className="text-xs text-muted-foreground">Late</div><div className="text-2xl font-bold text-warning">{stats.late}</div></Card>
        <Card className="card-elevated p-4"><div className="text-xs text-muted-foreground">Absent</div><div className="text-2xl font-bold text-destructive">{stats.absent}</div></Card>
      </div>

      <Card className="card-elevated overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead><TableHead>Student</TableHead><TableHead>Subject</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead><TableHead>Marked at</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No records.</TableCell></TableRow>
            ) : rows.slice(0, 200).map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.date}</TableCell>
                <TableCell>{students[r.student_id]?.full_name || r.student_id}</TableCell>
                <TableCell>{r.subject || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.period_label || "—"}</TableCell>
                <TableCell><Badge className={r.status === "present" ? "bg-success/15 text-success" : r.status === "late" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"}>{r.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length > 200 && <div className="border-t border-border p-3 text-center text-xs text-muted-foreground">Showing first 200 — export to see all {rows.length}.</div>}
      </Card>
    </AppShell>
  );
};

export default AdminAttendanceReports;
