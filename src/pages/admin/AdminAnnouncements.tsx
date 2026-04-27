import { useEffect, useState, FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";

const AdminAnnouncements = () => {
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
    <AppShell kind="admin">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Announcements</h1>
        <p className="text-sm text-muted-foreground">Broadcast notices to all students.</p>
      </div>

      <Card className="card-elevated mb-6 p-6">
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Body</Label><Textarea required rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
          <Button type="submit" disabled={saving} className="gradient-primary text-primary-foreground hover:opacity-90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} <Megaphone className="mr-2 h-4 w-4" /> Publish
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
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
};

export default AdminAnnouncements;
