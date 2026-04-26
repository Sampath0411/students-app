import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

const AdminAttendance = () => {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});

  const load = async () => {
    const { data: studs } = await supabase
      .from("profiles")
      .select("*")
      .eq("status", "approved")
      .order("full_name");
    setStudents(studs || []);
    const { data: att } = await supabase.from("attendance").select("*").eq("date", date);
    const m: Record<string, string> = {};
    (att || []).forEach((a: any) => (m[a.student_id] = a.status));
    setMarks(m);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const mark = async (studentId: string, status: "present" | "absent" | "late") => {
    const { error } = await supabase
      .from("attendance")
      .upsert(
        { student_id: studentId, date, status, marked_by: user?.id },
        { onConflict: "student_id,date" },
      );
    if (error) return toast.error(error.message);
    setMarks((m) => ({ ...m, [studentId]: status }));
  };

  const markAll = async (status: "present" | "absent") => {
    const rows = students.map((s) => ({ student_id: s.id, date, status, marked_by: user?.id }));
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,date" });
    if (error) return toast.error(error.message);
    toast.success(`Marked all ${status}`);
    load();
  };

  return (
    <AppShell kind="admin">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-sm text-muted-foreground">Mark and review daily attendance.</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => markAll("present")}>All present</Button>
          <Button variant="outline" onClick={() => markAll("absent")}>All absent</Button>
        </div>
      </div>
      <Card className="card-elevated overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Mark</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => {
              const cur = marks[s.id];
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.student_id}</TableCell>
                  <TableCell>
                    {cur ? (
                      <Badge
                        className={
                          cur === "present"
                            ? "bg-success/15 text-success hover:bg-success/15"
                            : cur === "late"
                              ? "bg-warning/15 text-warning hover:bg-warning/15"
                              : "bg-destructive/15 text-destructive hover:bg-destructive/15"
                        }
                      >
                        {cur}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant={cur === "present" ? "default" : "outline"} onClick={() => mark(s.id, "present")}>
                        Present
                      </Button>
                      <Button size="sm" variant={cur === "late" ? "default" : "outline"} onClick={() => mark(s.id, "late")}>
                        Late
                      </Button>
                      <Button size="sm" variant={cur === "absent" ? "destructive" : "outline"} onClick={() => mark(s.id, "absent")}>
                        Absent
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  No approved students yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </AppShell>
  );
};

export default AdminAttendance;
