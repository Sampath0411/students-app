import { useEffect, useState, FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, FileText, Award } from "lucide-react";
import { toast } from "sonner";

const AdminAssignments = () => {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due_date: "" });
  const [file, setFile] = useState<File | null>(null);

  // grading
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
    <AppShell kind="admin">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="text-sm text-muted-foreground">Post tasks and grade student submissions.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" /> New assignment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Post new assignment</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>Due date</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div>
                <Label>Attachment (PDF, doc, etc.)</Label>
                <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
              <Button type="submit" disabled={saving} className="w-full gradient-primary text-primary-foreground hover:opacity-90">
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
                <div className="flex gap-2">
                  <Input
                    type="number" placeholder="Score /100" className="w-32"
                    value={grades[s.id]?.score || ""}
                    onChange={(e) => setGrades({ ...grades, [s.id]: { ...grades[s.id], score: e.target.value, feedback: grades[s.id]?.feedback || "" } })}
                  />
                  <Input
                    placeholder="Feedback (optional)"
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
    </AppShell>
  );
};

export default AdminAssignments;
