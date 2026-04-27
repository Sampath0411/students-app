import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, LayoutDashboard, Users, CalendarDays, ClipboardCheck, UserCheck, Bell, FileText, BookOpen, Megaphone, User, QrCode, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";

const studentNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/assignments", label: "Assignments", icon: FileText },
  { to: "/records", label: "Records", icon: BookOpen },
  { to: "/announcements", label: "Announcements", icon: Megaphone },
  { to: "/profile", label: "Profile & QR", icon: User },
];
const adminNav = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/pending", label: "Pending", icon: UserCheck },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/admin/scan", label: "Scan QR", icon: ScanLine },
  { to: "/admin/timetable", label: "Timetable", icon: CalendarDays },
  { to: "/admin/assignments", label: "Assignments", icon: FileText },
  { to: "/admin/records", label: "Records", icon: BookOpen },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
];

export const AppShell = ({ children, kind }: { children: ReactNode; kind: "admin" | "student" }) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const items = kind === "admin" ? adminNav : studentNav;

  const onSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card/40 p-4 md:flex">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-bold">Scholaris</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {kind} portal
            </div>
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 rounded-lg border border-border bg-card/60 p-3">
          <div className="mb-2 truncate text-xs text-muted-foreground">{user?.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <header className="flex items-center justify-between border-b border-border px-6 py-4 md:hidden">
          <span className="font-bold">Scholaris</span>
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <div className="p-6 md:p-10">{children}</div>
      </main>
    </div>
  );
};
