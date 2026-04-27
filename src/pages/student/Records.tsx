import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen } from "lucide-react";

const Records = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("records").select("*").eq("student_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setRows(data || []));
  }, [user]);

  return (
    <AppShell kind="student">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Academic Records</h1>
        <p className="text-sm text-muted-foreground">Your subject-wise marks and remarks.</p>
      </div>
      <Card className="card-elevated p-6">
        {rows.length === 0 ? (
          <div className="py-10 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No records published yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.subject}</TableCell>
                  <TableCell>{r.term || "—"}</TableCell>
                  <TableCell className="font-semibold text-primary">
                    {r.score}/{r.max_score}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.remarks || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppShell>
  );
};

export default Records;
