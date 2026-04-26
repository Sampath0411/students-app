import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, UserCheck, ClipboardCheck, TrendingUp } from "lucide-react";

const AdminOverview = () => {
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, presentToday: 0, totalToday: 0 });

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    (async () => {
      const [{ count: total }, { count: pending }, { count: approved }, { data: att }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("attendance").select("status").eq("date", today),
      ]);
      const present = (att || []).filter((a: any) => a.status === "present" || a.status === "late").length;
      setStats({
        total: total || 0,
        pending: pending || 0,
        approved: approved || 0,
        presentToday: present,
        totalToday: att?.length || 0,
      });
    })();
  }, []);

  const cards = [
    { label: "Total students", value: stats.total, icon: Users, color: "text-primary" },
    { label: "Pending approvals", value: stats.pending, icon: UserCheck, color: "text-warning" },
    { label: "Approved students", value: stats.approved, icon: TrendingUp, color: "text-success" },
    {
      label: "Marked today",
      value: `${stats.presentToday}/${stats.totalToday || stats.approved}`,
      icon: ClipboardCheck,
      color: "text-accent",
    },
  ];

  return (
    <AppShell kind="admin">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground">Key stats for your campus.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="card-elevated p-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</span>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <div className="text-3xl font-bold">{c.value}</div>
          </Card>
        ))}
      </div>

      <Card className="card-elevated mt-8 p-8">
        <h2 className="mb-2 text-xl font-semibold">Welcome, admin</h2>
        <p className="text-sm text-muted-foreground">
          Use the sidebar to manage pending registrations, mark attendance, edit the global timetable, and view all
          registered students.
        </p>
      </Card>
    </AppShell>
  );
};

export default AdminOverview;
