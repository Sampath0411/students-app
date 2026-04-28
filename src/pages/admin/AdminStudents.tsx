import { useEffect, useState, FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, UserPlus, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const empty = { email: "", password: "", full_name: "", student_id: "", phone: "", department: "", date_of_birth: "" };

const AdminStudents = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);

  const load = () =>
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data || []));

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) =>
    [r.full_name, r.email, r.student_id, r.department].some((v) => v?.toLowerCase().includes(q.toLowerCase())),
  );

  const statusBadge = (s: string) =>
    s === "approved" ? <Badge className="bg-success/15 text-success">Approved</Badge>
      : s === "pending" ? <Badge className="bg-warning/15 text-warning">Pending</Badge>
      : <Badge className="bg-destructive/15 text-destructive">Rejected</Badge>;

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-create-student", { body: form });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed");
      return;
    }
    toast.success("Student created");
    setForm(empty);
    setOpen(false);
    load();
  };

  const exportStudents = () => {
    const data = filtered.map((r) => ({
      Name: r.full_name,
      Email: r.email,
      "Student ID": r.student_id,
      Phone: r.phone || "",
      Department: r.department || "",
      "Date of birth": r.date_of_birth || "",
      Status: r.status,
      Created: new Date(r.created_at).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `students-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <AppShell kind="admin">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">All students</h1>
          <p className="text-sm text-muted-foreground">{rows.length} registered</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Button variant="outline" onClick={exportStudents}><Download className="mr-2 h-4 w-4" /> Export Excel</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground"><UserPlus className="mr-2 h-4 w-4" /> Add student</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add new student</DialogTitle></DialogHeader>
              <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Temp password</Label><Input required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
                <div><Label>Student ID</Label><Input required value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
                <div><Label>Date of birth</Label><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" disabled={submitting} className="gradient-primary text-primary-foreground">
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No students found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </AppShell>
  );
};

export default AdminStudents;
