import { useEffect, useState, FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

const AdminRecords = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [form, setForm] = useState({ student_id: "", subject: "", term: "", score: "", max_score: "100", remarks: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, student_id").eq("status", "approved").order("full_name"),
      supabase.from("records").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setStudents(s || []);
    setRecords(r || []);
  };
  useEffect(() => { load(); }, []);

  const nameOf = (id: string) => students.find((s) => s.id === id)?.full_name || "—";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("records").insert({
      student_id: form.student_id,
      subject: form.subject,
      term: form.term || null,
      score: form.score ? Number(form.score) : null,
      max_score: Number(form.max_score) || 100,
      remarks: form.remarks || null,
      created_by: user!.id,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Record added");
      setForm({ student_id: "", subject: "", term: "", score: "", max_score: "100", remarks: "" });
      load();
    }
  };

  return (
    <AppShell kind="admin">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Academic Records</h1>
        <p className="text-sm text-muted-foreground">Add per-subject marks for any student.</p>
      </div>

      <Card className="card-elevated mb-6 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Plus className="h-5 w-5 text-primary" /> New record</h2>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <Label>Student</Label>
            <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.student_id})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Subject</Label><Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
          <div><Label>Term</Label><Input placeholder="e.g. Term 1" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} /></div>
          <div><Label>Score</Label><Input type="number" required value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} /></div>
          <div><Label>Max score</Label><Input type="number" value={form.max_score} onChange={(e) => setForm({ ...form, max_score: e.target.value })} /></div>
          <div><Label>Remarks</Label><Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></div>
          <div className="md:col-span-3">
            <Button type="submit" disabled={saving || !form.student_id} className="gradient-primary text-primary-foreground hover:opacity-90">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save record
            </Button>
          </div>
        </form>
      </Card>

      <Card className="card-elevated p-6">
        <h2 className="mb-4 text-lg font-semibold">Recent records</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead><TableHead>Subject</TableHead><TableHead>Term</TableHead><TableHead>Score</TableHead><TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{nameOf(r.student_id)}</TableCell>
                <TableCell>{r.subject}</TableCell>
                <TableCell>{r.term || "—"}</TableCell>
                <TableCell className="font-semibold text-primary">{r.score}/{r.max_score}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </AppShell>
  );
};

export default AdminRecords;
