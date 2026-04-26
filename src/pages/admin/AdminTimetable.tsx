import { useEffect, useState, FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const AdminTimetable = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({
    day_of_week: "1",
    start_time: "09:00",
    end_time: "10:00",
    subject: "",
    room: "",
    teacher: "",
  });

  const load = async () => {
    const { data } = await supabase.from("timetable").select("*").order("day_of_week").order("start_time");
    setRows(data || []);
  };
  useEffect(() => {
    load();
  }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim()) return toast.error("Subject required");
    const { error } = await supabase.from("timetable").insert({
      day_of_week: parseInt(form.day_of_week),
      start_time: form.start_time,
      end_time: form.end_time,
      subject: form.subject,
      room: form.room || null,
      teacher: form.teacher || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Class added");
    setForm({ ...form, subject: "", room: "", teacher: "" });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("timetable").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <AppShell kind="admin">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Timetable</h1>
        <p className="text-sm text-muted-foreground">Manage the global weekly schedule.</p>
      </div>

      <Card className="card-elevated mb-6 p-6">
        <h2 className="mb-4 text-lg font-semibold">Add a class</h2>
        <form onSubmit={add} className="grid gap-4 md:grid-cols-6">
          <div>
            <Label>Day</Label>
            <Select value={form.day_of_week} onValueChange={(v) => setForm({ ...form, day_of_week: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Start</Label>
            <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          </div>
          <div>
            <Label>End</Label>
            <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <Label>Room</Label>
            <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
          </div>
          <div>
            <Label>Teacher</Label>
            <Input value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} />
          </div>
          <div className="md:col-span-6">
            <Button type="submit" className="gradient-primary text-primary-foreground hover:opacity-90">Add class</Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {DAYS.map((d, idx) => {
          const items = rows.filter((r) => r.day_of_week === idx);
          return (
            <Card key={d} className="card-elevated p-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">{d}</h3>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground">No classes.</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium">{c.subject}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.start_time?.slice(0, 5)}–{c.end_time?.slice(0, 5)}
                          {c.room && ` · ${c.room}`}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => remove(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
};

export default AdminTimetable;
