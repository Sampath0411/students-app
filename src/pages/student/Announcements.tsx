import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Megaphone } from "lucide-react";

const Announcements = () => {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("announcements").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setItems(data || []));
  }, []);
  return (
    <AppShell kind="student">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Announcements</h1>
        <p className="text-sm text-muted-foreground">Notices from administration.</p>
      </div>
      {items.length === 0 ? (
        <Card className="card-elevated p-10 text-center">
          <Megaphone className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id} className="card-elevated p-5">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="font-semibold">{a.title}</h3>
                <span className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
};

export default Announcements;
