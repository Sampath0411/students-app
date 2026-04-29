import { useEffect, useMemo, useState, FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, UserPlus, Download, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const empty = { email: "", password: "", full_name: "", student_id: "", phone: "", department: "", date_of_birth: "" };

const ALL_FIELDS: { key: string; label: string; map: (r: any) => any }[] = [
  { key: "full_name", label: "Name", map: (r) => r.full_name },
  { key: "email", label: "Email", map: (r) => r.email },
  { key: "student_id", label: "Student ID / Registration", map: (r) => r.student_id },
  { key: "phone", label: "Phone", map: (r) => r.phone || "" },
  { key: "department", label: "Department", map: (r) => r.department || "" },
  { key: "date_of_birth", label: "Date of birth", map: (r) => r.date_of_birth || "" },
  { key: "status", label: "Status", map: (r) => r.status },
  { key: "created_at", label: "Created", map: (r) => new Date(r.created_at).toLocaleString() },
];

const AdminStudents = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [codes, setCodes] = useState<Record<string, { locked: boolean; code?: string }>>({});
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFields, setExportFields] = useState<Set<string>>(new Set(ALL_FIELDS.map((f) => f.key)));
  const [exportScope, setExportScope] = useState<"all" | "selected">("all");

  const load = async () => {
    const [{ data: profiles }, { data: lcs }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("login_codes").select("user_id, code, locked"),
    ]);
    setRows(profiles || []);
    const map: Record<string, { locked: boolean; code?: string }> = {};
    (lcs || []).forEach((c: any) => { map[c.user_id] = { locked: !!c.locked, code: c.code }; });
    setCodes(map);
  };

  useEffect(() => { load(); }, []);

  // Real-time updates for QR locks
  useEffect(() => {
    const ch = supabase
      .channel("admin_login_codes")
      .on("postgres_changes", { event: "*", schema: "public", table: "login_codes" }, (payload: any) => {
        const row = payload.new || payload.old;
        if (!row?.user_id) return;
        setCodes((prev) => ({ ...prev, [row.user_id]: { locked: !!payload.new?.locked, code: payload.new?.code } }));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => rows.filter((r) =>
    [r.full_name, r.email, r.student_id, r.department].some((v) => v?.toLowerCase().includes(q.toLowerCase())),
  ), [rows, q]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const toggleAll = () => {
    if (allFilteredSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const statusBadge = (s: string) =>
    s === "approved" ? <Badge className="bg-success/15 text-success">Approved</Badge>
      : s === "pending" ? <Badge className="bg-warning/15 text-warning">Pending</Badge>
      : <Badge className="bg-destructive/15 text-destructive">Rejected</Badge>;

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-create-student", { body: form });
    setSubmitting(false);
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || "Failed"); return; }
    toast.success("Student created");
    setForm(empty); setOpen(false); load();
  };

  const toggleLock = async (uid: string, currentlyLocked: boolean) => {
    const { error } = await supabase
      .from("login_codes")
      .update({
        locked: !currentlyLocked,
        locked_at: !currentlyLocked ? new Date().toISOString() : null,
        locked_reason: !currentlyLocked ? "admin_locked" : null,
      })
      .eq("user_id", uid);
    if (error) toast.error(error.message);
    else toast.success(`QR ${!currentlyLocked ? "locked" : "unlocked"}`);
  };

  const runExport = () => {
    const fields = ALL_FIELDS.filter((f) => exportFields.has(f.key));
    if (fields.length === 0) return toast.error("Pick at least one field");
    const source = exportScope === "selected" ? rows.filter((r) => selected.has(r.id)) : filtered;
    if (source.length === 0) return toast.error("No students to export");
    const data = source.map((r) => Object.fromEntries(fields.map((f) => [f.label, f.map(r)])));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `students-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setExportOpen(false);
  };

  const toggleField = (k: string) => setExportFields((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <AppShell kind="admin">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">All students</h1>
          <p className="text-sm text-muted-foreground">{rows.length} registered • {selected.size} selected</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export Excel</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Export students</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Scope</Label>
                  <div className="flex gap-2">
                    <Button size="sm" variant={exportScope === "all" ? "default" : "outline"} onClick={() => setExportScope("all")}>
                      All visible ({filtered.length})
                    </Button>
                    <Button size="sm" variant={exportScope === "selected" ? "default" : "outline"} onClick={() => setExportScope("selected")}>
                      Selected ({selected.size})
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Fields to include</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_FIELDS.map((f) => (
                      <label key={f.key} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                        <Checkbox checked={exportFields.has(f.key)} onCheckedChange={() => toggleField(f.key)} />
                        {f.label}
                      </label>
                    ))}
                  </div>
                </div>
                <Button onClick={runExport} className="w-full gradient-primary text-primary-foreground"><Download className="mr-2 h-4 w-4" /> Download .xlsx</Button>
              </div>
            </DialogContent>
          </Dialog>
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
      <Card className="card-elevated overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Student ID</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>QR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => {
              const lc = codes[r.id];
              const locked = !!lc?.locked;
              return (
                <TableRow key={r.id} className={selected.has(r.id) ? "bg-primary/5" : undefined}>
                  <TableCell><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleOne(r.id)} /></TableCell>
                  <TableCell className="font-medium">{r.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.email}</TableCell>
                  <TableCell>{r.student_id}</TableCell>
                  <TableCell>{r.department || "—"}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell>
                    {lc?.code ? (
                      <Button size="sm" variant={locked ? "destructive" : "outline"} onClick={() => toggleLock(r.id, locked)}>
                        {locked ? <><Unlock className="mr-1 h-3.5 w-3.5" /> Unlock</> : <><Lock className="mr-1 h-3.5 w-3.5" /> Lock</>}
                      </Button>
                    ) : <span className="text-xs text-muted-foreground">no code</span>}
                  </TableCell>
                </TableRow>
              );
            })}
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
