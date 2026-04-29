import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, FileText, Eye } from "lucide-react";

const AdminPending = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").eq("status", "pending").order("created_at");
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const decide = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Student ${status}`);
    load();
  };

  const viewIdCard = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from("id-cards").createSignedUrl(path, 600);
    if (error || !data) return toast.error("Failed to load ID card");
    setPreviewUrl(data.signedUrl);
    setPreviewName(name || "ID card");
  };

  const isPdf = previewName.toLowerCase().endsWith(".pdf") || previewUrl?.includes(".pdf");

  return (
    <AppShell kind="admin">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Pending registrations</h1>
        <p className="text-sm text-muted-foreground">Review ID cards and approve students.</p>
      </div>
      <Card className="card-elevated overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No pending registrations 🎉</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>ID card</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.email}</TableCell>
                  <TableCell>{r.student_id}</TableCell>
                  <TableCell>{r.department || "—"}</TableCell>
                  <TableCell>
                    {r.id_card_url ? (
                      <Button size="sm" variant="outline" onClick={() => viewIdCard(r.id_card_url, r.id_card_name || "")}>
                        <Eye className="mr-1 h-3.5 w-3.5" /> View
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground"><FileText className="mr-1 inline h-3.5 w-3.5" /> none</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" className="bg-success text-background hover:bg-success/90" onClick={() => decide(r.id, "approved")}>
                        <Check className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => decide(r.id, "rejected")}>
                        <X className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{previewName}</DialogTitle></DialogHeader>
          {previewUrl && (
            isPdf ? (
              <iframe src={previewUrl} className="h-[70vh] w-full rounded-md border border-border" title="ID card" />
            ) : (
              <img src={previewUrl} alt="ID card" className="max-h-[70vh] w-full rounded-md border border-border object-contain" />
            )
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default AdminPending;
