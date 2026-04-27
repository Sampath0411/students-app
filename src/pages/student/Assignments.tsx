import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Award } from "lucide-react";

const Assignments = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: assigns }, { data: grades }] = await Promise.all([
        supabase.from("assignments").select("*").order("created_at", { ascending: false }),
        supabase.from("assignment_grades").select("*").eq("student_id", user.id),
      ]);
      const gradeMap = new Map((grades || []).map((g) => [g.assignment_id, g]));
      setRows((assigns || []).map((a) => ({ ...a, grade: gradeMap.get(a.id) })));
    })();
  }, [user]);

  return (
    <AppShell kind="student">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Assignments</h1>
        <p className="text-sm text-muted-foreground">View tasks and your graded results.</p>
      </div>
      {rows.length === 0 ? (
        <Card className="card-elevated p-10 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No assignments posted yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((a) => (
            <Card key={a.id} className="card-elevated p-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="font-semibold">{a.title}</h3>
                {a.due_date && (
                  <Badge variant="outline" className="whitespace-nowrap text-xs">
                    Due {new Date(a.due_date).toLocaleDateString()}
                  </Badge>
                )}
              </div>
              {a.description && <p className="mb-3 text-sm text-muted-foreground">{a.description}</p>}
              {a.file_url && (
                <a
                  href={a.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Download className="h-3.5 w-3.5" /> {a.file_name || "Download attachment"}
                </a>
              )}
              {a.grade ? (
                <div className="mt-3 rounded-lg border border-success/30 bg-success/5 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-success">
                    <Award className="h-4 w-4" /> Graded: {a.grade.score}/{a.grade.max_score}
                  </div>
                  {a.grade.feedback && (
                    <p className="mt-1 text-xs text-muted-foreground">{a.grade.feedback}</p>
                  )}
                </div>
              ) : (
                <Badge variant="outline" className="text-xs">Awaiting grade</Badge>
              )}
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
};

export default Assignments;
