import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CalendarCheck, Clock, AlertCircle, CheckCircle2, TrendingDown } from "lucide-react";

const StudentDashboard = () => {
  const { user, status } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [todayAtt, setTodayAtt] = useState<any[]>([]);
  const [allAtt, setAllAtt] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    (async () => {
      const [{ data: prof }, { data: att }, { data: tt }, { data: all }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("attendance").select("*").eq("student_id", user.id).eq("date", todayStr),
        supabase.from("timetable").select("*").order("day_of_week").order("start_time"),
        supabase.from("attendance").select("status, subject").eq("student_id", user.id),
      ]);
      setProfile(prof);
      setTodayAtt(att || []);
      setTimetable(tt || []);
      setAllAtt(all || []);
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

  // Overall %
  const total = allAtt.length;
  const present = allAtt.filter((a) => a.status === "present" || a.status === "late").length;
  const overallPct = total ? Math.round((present / total) * 100) : 0;

  // Per-subject breakdown
  const subjectMap = new Map<string, { total: number; present: number }>();
  allAtt.forEach((a) => {
    const key = a.subject || "General";
    const cur = subjectMap.get(key) || { total: 0, present: 0 };
    cur.total++;
    if (a.status === "present" || a.status === "late") cur.present++;
    subjectMap.set(key, cur);
  });
  const subjects = Array.from(subjectMap.entries())
    .map(([name, v]) => ({ name, pct: v.total ? Math.round((v.present / v.total) * 100) : 0, ...v }))
    .sort((a, b) => a.pct - b.pct);
  const lowest = subjects.filter((s) => s.pct < 75);

  const attByPeriod = new Map<string, any>();
  todayAtt.forEach((a) => { if (a.timetable_id) attByPeriod.set(a.timetable_id, a); });
  const todaySummary = todayAtt.length
    ? `${todayAtt.filter((a) => a.status !== "absent").length}/${todayClasses.length || todayAtt.length} marked`
    : null;

  const statusColor = (s?: string) =>
    s === "present" ? "bg-success/15 text-success hover:bg-success/15"
    : s === "late" ? "bg-warning/15 text-warning hover:bg-warning/15"
    : s === "absent" ? "bg-destructive/15 text-destructive hover:bg-destructive/15" : "";

  const pctColor = overallPct >= 85 ? "text-success" : overallPct >= 75 ? "text-warning" : "text-destructive";

  return (
    <AppShell kind="student">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="text-3xl font-bold">{profile?.full_name || "Student"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ID: {profile?.student_id} {profile?.department && `· ${profile.department}`}
        </p>
      </div>

      {/* Attendance percentage card */}
      <Card className="card-elevated mb-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Overall attendance</div>
            <div className={`mt-1 text-5xl font-bold ${pctColor}`}>{overallPct}%</div>
            <div className="mt-1 text-xs text-muted-foreground">{present} of {total} classes attended</div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <CalendarCheck className="h-4 w-4 text-primary" />
            <div className="text-xs">
              <div className="font-medium">Today</div>
              <div className="text-muted-foreground">{todaySummary || "Not marked yet"}</div>
            </div>
          </div>
        </div>
        <Progress value={overallPct} className="mt-4 h-2" />
        <div className="mt-2 text-[11px] text-muted-foreground">Target: 75% to stay in good standing.</div>
      </Card>

      {/* Low-attendance subjects */}
      <Card className="card-elevated mb-6 p-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <TrendingDown className="h-5 w-5 text-destructive" /> Low attendance subjects
        </h2>
        {subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attendance recorded yet.</p>
        ) : lowest.length === 0 ? (
          <p className="text-sm text-success">Great — every subject is above 75%.</p>
        ) : (
          <ul className="space-y-3">
            {lowest.map((s) => (
              <li key={s.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className={s.pct < 60 ? "text-destructive font-semibold" : "text-warning font-semibold"}>
                    {s.pct}% <span className="text-xs text-muted-foreground">({s.present}/{s.total})</span>
                  </span>
                </div>
                <Progress value={s.pct} className="h-1.5" />
              </li>
            ))}
          </ul>
        )}
      </Card>

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
                <li key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3">
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
    </AppShell>
  );
};

export default StudentDashboard;
