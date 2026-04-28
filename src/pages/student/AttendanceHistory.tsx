import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, History } from "lucide-react";

const StudentAttendanceHistory = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", user.id)
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      setRows(data || []);
      setLoading(false);
    })();
  }, [user, from, to]);

  const stats = useMemo(() => {
    const total = rows.length;
    const present = rows.filter((r) => r.status === "present").length;
    const late = rows.filter((r) => r.status === "late").length;
    const absent = rows.filter((r) => r.status === "absent").length;
    const pct = total ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, pct };
  }, [rows]);

  const badge = (s: string) =>
    s === "present"
      ? "bg-success/15 text-success"
      : s === "late"
        ? "bg-warning/15 text-warning"
        : "bg-destructive/15 text-destructive";

  return (
    <AppShell kind="student">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My attendance</h1>
          <p className="text-sm text-muted-foreground">Period-by-period attendance log.</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card className="card-elevated p-4"><div className="text-xs text-muted-foreground">Periods</div><div className="text-2xl font-bold">{stats.total}</div></Card>
        <Card className="card-elevated p-4"><div className="text-xs text-muted-foreground">Present</div><div className="text-2xl font-bold text-success">{stats.present}</div></Card>
        <Card className="card-elevated p-4"><div className="text-xs text-muted-foreground">Late</div><div className="text-2xl font-bold text-warning">{stats.late}</div></Card>
        <Card className="card-elevated p-4"><div className="text-xs text-muted-foreground">Attendance %</div><div className="text-2xl font-bold">{stats.pct}%</div></Card>
      </div>

      <Card className="card-elevated overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Marked at</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground"><History className="mx-auto mb-2 h-6 w-6" />No records in this range.</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.date}</TableCell>
                <TableCell className="text-muted-foreground">{r.period_label || "—"}</TableCell>
                <TableCell>{r.subject || "—"}</TableCell>
                <TableCell><Badge className={badge(r.status)}>{r.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </AppShell>
  );
};

export default StudentAttendanceHistory;
