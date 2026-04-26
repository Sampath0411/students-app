import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AdminStudents = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data || []));
  }, []);

  const filtered = rows.filter((r) =>
    [r.full_name, r.email, r.student_id, r.department].some((v) => v?.toLowerCase().includes(q.toLowerCase())),
  );

  const statusBadge = (s: string) =>
    s === "approved" ? (
      <Badge className="bg-success/15 text-success hover:bg-success/15">Approved</Badge>
    ) : s === "pending" ? (
      <Badge className="bg-warning/15 text-warning hover:bg-warning/15">Pending</Badge>
    ) : (
      <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/15">Rejected</Badge>
    );

  return (
    <AppShell kind="admin">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">All students</h1>
          <p className="text-sm text-muted-foreground">{rows.length} registered</p>
        </div>
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      </div>
      <Card className="card-elevated overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Student ID</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>DOB</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.full_name}</TableCell>
                <TableCell className="text-muted-foreground">{r.email}</TableCell>
                <TableCell>{r.student_id}</TableCell>
                <TableCell>{r.phone || "—"}</TableCell>
                <TableCell>{r.department || "—"}</TableCell>
                <TableCell>{r.date_of_birth || "—"}</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No students found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </AppShell>
  );
};

export default AdminStudents;
