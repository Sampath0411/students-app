import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

const Notifications = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems(data || []);
  };

  useEffect(() => {
    load();
  }, [user]);

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    toast.success("All caught up");
    load();
  };

  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    load();
  };

  const unread = items.filter((i) => !i.read).length;

  return (
    <AppShell kind="student">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">{unread} unread</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAll}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <Card className="card-elevated p-10 text-center">
          <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <Card
              key={n.id}
              className={`card-elevated cursor-pointer p-4 transition ${!n.read ? "border-primary/40" : ""}`}
              onClick={() => !n.read && markOne(n.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase">{n.category}</Badge>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <h3 className="mt-1.5 font-semibold">{n.title}</h3>
                  {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(n.created_at).toLocaleDateString()}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
};

export default Notifications;
