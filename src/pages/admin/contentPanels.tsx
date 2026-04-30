import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, FileText, Award } from "lucide-react";
import { toast } from "sonner";

export const AssignmentsPanel = () => {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due_date: "" });
  const [file, setFile] = useState<File | null>(null);
  const [gradeFor, setGradeFor] = useState<any>(null);
  const [grades, setGrades] = useState<Record<string, { score: string; feedback: string; id?: string }>>({});

  const load = async () => {
    const [{ data: a }, { data: s }] = await Promise.all([
      supabase.from("assignments").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, student_id").eq("status", "approved").order("full_name"),
    ]);
    setList(a || []);
    setStudents(s || []);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let file_url: string | null = null;
    let file_name: string | null = null;
    if (file) {
      const path = `${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("assignments").upload(path, file);
      if (upErr) { toast.error(upErr.message); setSaving(false); return; }
      const { data: pub } = supabase.storage.from("assignments").getPublicUrl(path);
      file_url = pub.publicUrl;
      file_name = file.name;
    }
    const { error } = await supabase.from("assignments").insert({
      title: form.title,
      description: form.description || null,
      due_date: form.due_date || null,
      file_url, file_name,
      created_by: user!.id,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Assignment posted");
      setOpen(false);
      setForm({ title: "", description: "", due_date: "" });
      setFile(null);
      load();
    }
  };

  const openGrade = async (a: any) => {
    setGradeFor(a);
    const { data } = await supabase.from("assignment_grades").select("*").eq("assignment_id", a.id);
    const map: any = {};
    (data || []).forEach((g) => {
      map[g.student_id] = { id: g.id, score: g.score?.toString() ?? "", feedback: g.feedback ?? "" };
    });
    setGrades(map);
  };

  const saveGrade = async (sid: string) => {
    const g = grades[sid];
    if (!g?.score) { toast.error("Enter a score"); return; }
    const payload = {
      assignment_id: gradeFor.id,
      student_id: sid,
      score: Number(g.score),
      feedback: g.feedback || null,
      graded_by: user!.id,
      graded_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("assignment_grades").upsert(payload, { onConflict: "assignment_id,student_id" });
    if (error) toast.error(error.message);
    else toast.success("Grade saved");
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Post tasks and grade student submissions.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" /> New assignment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Post new assignment</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              <div><Label>Attachment</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
              <Button type="submit" disabled={saving} className="w-full gradient-primary text-primary-foreground">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Publish
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {list.length === 0 ? (
        <Card className="card-elevated p-10 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No assignments yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((a) => (
            <Card key={a.id} className="card-elevated p-5">
              <h3 className="font-semibold">{a.title}</h3>
              {a.description && <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {a.due_date ? `Due ${new Date(a.due_date).toLocaleDateString()}` : "No due date"}
                </span>
                <Button size="sm" variant="outline" onClick={() => openGrade(a)}>
                  <Award className="mr-1.5 h-3.5 w-3.5" /> Grade
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={!!gradeFor} onOpenChange={(o) => !o && setGradeFor(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Grade: {gradeFor?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {students.map((s) => (
              <div key={s.id} className="rounded-lg border border-border p-3">
                <div className="mb-2 text-sm font-medium">{s.full_name} <span className="text-xs text-muted-foreground">({s.student_id})</span></div>
                <div className="flex flex-wrap gap-2">
                  <Input type="number" placeholder="Score /100" className="w-32"
                    value={grades[s.id]?.score || ""}
                    onChange={(e) => setGrades({ ...grades, [s.id]: { ...grades[s.id], score: e.target.value, feedback: grades[s.id]?.feedback || "" } })}
                  />
                  <Input placeholder="Feedback (optional)" className="flex-1 min-w-[180px]"
                    value={grades[s.id]?.feedback || ""}
                    onChange={(e) => setGrades({ ...grades, [s.id]: { ...grades[s.id], feedback: e.target.value, score: grades[s.id]?.score || "" } })}
                  />
                  <Button size="sm" onClick={() => saveGrade(s.id)}>Save</Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const RecordsPanel = () => {
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
    <div>
      <Card className="card-elevated mb-6 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Plus className="h-5 w-5 text-primary" /> New record</h2>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <Label>Student</Label>
            <select className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm" required
              value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
              <option value="">Select student</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.student_id})</option>)}
            </select>
          </div>
          <div><Label>Subject</Label><Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
          <div><Label>Term</Label><Input placeholder="e.g. Term 1" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} /></div>
          <div><Label>Score</Label><Input type="number" required value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} /></div>
          <div><Label>Max score</Label><Input type="number" value={form.max_score} onChange={(e) => setForm({ ...form, max_score: e.target.value })} /></div>
          <div><Label>Remarks</Label><Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></div>
          <div className="md:col-span-3">
            <Button type="submit" disabled={saving || !form.student_id} className="gradient-primary text-primary-foreground">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save record
            </Button>
          </div>
        </form>
      </Card>
      <Card className="card-elevated p-6 overflow-x-auto">
        <h2 className="mb-4 text-lg font-semibold">Recent records</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-2">Student</th><th>Subject</th><th>Term</th><th>Score</th><th>Date</th>
          </tr></thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="py-2">{nameOf(r.student_id)}</td>
                <td>{r.subject}</td>
                <td>{r.term || "—"}</td>
                <td className="font-semibold text-primary">{r.score}/{r.max_score}</td>
                <td className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export const AnnouncementsPanel = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", body: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("announcements").insert({ ...form, created_by: user!.id });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Posted"); setForm({ title: "", body: "" }); load(); }
  };

  const remove = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <Card className="card-elevated mb-6 p-6">
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Body</Label><Textarea required rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
          <Button type="submit" disabled={saving} className="gradient-primary text-primary-foreground">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Publish
          </Button>
        </form>
      </Card>
      <div className="space-y-3">
        {items.map((a) => (
          <Card key={a.id} className="card-elevated p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-semibold">{a.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
                <span className="mt-2 block text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>
                ✕
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
