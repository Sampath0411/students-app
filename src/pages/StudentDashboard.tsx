import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const StudentDashboard = () => {
  const { user, status } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [todayAtt, setTodayAtt] = useState<any[]>([]);
  const [recentAtt, setRecentAtt] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0 });

  useEffect(() => {
    if (!user) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    (async () => {
      const [{ data: prof }, { data: att }, { data: tt }, { data: all }, { data: recent }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("attendance").select("*").eq("student_id", user.id).eq("date", todayStr),
        supabase.from("timetable").select("*").order("day_of_week").order("start_time"),
        supabase.from("attendance").select("status").eq("student_id", user.id),
        supabase
          .from("attendance")
          .select("*")
          .eq("student_id", user.id)
          .order("date", { ascending: false })
          .limit(20),
      ]);
      setProfile(prof);
      setTodayAtt(att || []);
      setTimetable(tt || []);
      setRecentAtt(recent || []);
      const s = { present: 0, absent: 0, late: 0 };
      (all || []).forEach((a: any) => {
        s[a.status as keyof typeof s]++;
      });
      setStats(s);
    })();
  }, [user]);

  const todayDow = new Date().getDay();
  const todayClasses = timetable.filter((t) => t.day_of_week === todayDow);

  if (status === "pending") {
    return (
      <AppShell kind="student">
        <div className="mx-auto max-w-xl">
          <Card className="card-elevated p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <h2 className="mb-2 text-xl font-bold">Awaiting approval</h2>
            <p className="text-sm text-muted-foreground">
              Your account is pending admin review. You'll get full access once it's approved.
            </p>
          </Card>
        </div>
      </AppShell>
    );
  }
  if (status === "rejected") {
    return (
      <AppShell kind="student">
        <Card className="card-elevated p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
          <h2 className="text-xl font-bold">Registration rejected</h2>
          <p className="text-sm text-muted-foreground">Please contact the administration.</p>
        </Card>
      </AppShell>
    );
  }

  const attByPeriod = new Map<string, any>();
  todayAtt.forEach((a) => {
    if (a.timetable_id) attByPeriod.set(a.timetable_id, a);
  });
  const todaySummary = todayAtt.length
    ? todayAtt.some((a) => a.status === "present" || a.status === "late")
      ? `${todayAtt.filter((a) => a.status !== "absent").length}/${todayClasses.length || todayAtt.length} marked`
      : "Absent"
    : null;

  const statusColor = (s?: string) =>
    s === "present"
      ? "bg-success/15 text-success hover:bg-success/15"
      : s === "late"
        ? "bg-warning/15 text-warning hover:bg-warning/15"
        : s === "absent"
          ? "bg-destructive/15 text-destructive hover:bg-destructive/15"
          : "";

  const statusBadge = todaySummary ? (
    <Badge className="bg-primary/15 text-primary hover:bg-primary/15">{todaySummary}</Badge>
  ) : (
    <Badge variant="outline">Not marked yet</Badge>
  );

  return (
    <AppShell kind="student">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="text-3xl font-bold">{profile?.full_name || "Student"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ID: {profile?.student_id} {profile?.department && `· ${profile.department}`}
        </p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Card className="card-elevated p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Today</span>
            <CalendarCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2">{statusBadge}</div>
        </Card>
        <Card className="card-elevated p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Present</div>
          <div className="mt-2 text-3xl font-bold text-success">{stats.present}</div>
        </Card>
        <Card className="card-elevated p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Late</div>
          <div className="mt-2 text-3xl font-bold text-warning">{stats.late}</div>
        </Card>
        <Card className="card-elevated p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Absent</div>
          <div className="mt-2 text-3xl font-bold text-destructive">{stats.absent}</div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-elevated p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Today's classes
          </h2>
          {todayClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes scheduled today.</p>
          ) : (
            <ul className="space-y-3">
              {todayClasses.map((c) => {
                const a = attByPeriod.get(c.id);
                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <div className="font-medium">{c.subject}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.start_time?.slice(0, 5)} – {c.end_time?.slice(0, 5)}
                        {c.room && ` · Room ${c.room}`}
                        {c.teacher && ` · ${c.teacher}`}
                      </div>
                    </div>
                    {a ? (
                      <Badge className={statusColor(a.status)}>{a.status.toUpperCase()}</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="card-elevated p-6">
          <h2 className="mb-4 text-lg font-semibold">Recent attendance</h2>
          {recentAtt.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance records yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentAtt.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{a.period_label || a.subject || "General"}</div>
                    <div className="text-xs text-muted-foreground">{a.date}</div>
                  </div>
                  <Badge className={statusColor(a.status)}>{a.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="card-elevated mt-6 p-6">
        <h2 className="mb-4 text-lg font-semibold">Weekly timetable</h2>
          {timetable.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timetable entries yet.</p>
          ) : (
            <div className="space-y-4">
              {DAYS.map((day, idx) => {
                const items = timetable.filter((t) => t.day_of_week === idx);
                if (items.length === 0) return null;
                return (
                  <div key={day}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {day}
                    </div>
                    <div className="space-y-1.5">
                      {items.map((c) => (
                        <div key={c.id} className="flex justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                          <span>{c.subject}</span>
                          <span className="text-muted-foreground">
                            {c.start_time?.slice(0, 5)}–{c.end_time?.slice(0, 5)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
    </AppShell>
  );
};

export default StudentDashboard;
