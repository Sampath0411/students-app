import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LogOut, LayoutDashboard, Users, CalendarDays, ClipboardCheck,
  UserCheck, Bell, FileText, BookOpen, Megaphone, User, ScanLine, History,
  FileSpreadsheet, MessageCircle, Settings, MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/logo.png";

const studentNav = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/attendance", label: "Attendance", icon: History },
  { to: "/chatbot", label: "Chat", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
];
const studentMore = [
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/assignments", label: "Assignments", icon: FileText },
  { to: "/records", label: "Records", icon: BookOpen },
  { to: "/announcements", label: "Announcements", icon: Megaphone },
  { to: "/settings", label: "Settings", icon: Settings },
];
const adminNavMain = [
  { to: "/admin", label: "Home", icon: LayoutDashboard },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/scan", label: "Scan", icon: ScanLine },
  { to: "/admin/pending", label: "Pending", icon: UserCheck },
];
const adminMore = [
  { to: "/admin/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/admin/reports", label: "Reports & Export", icon: FileSpreadsheet },
  { to: "/admin/timetable", label: "Timetable", icon: CalendarDays },
  { to: "/admin/content", label: "Content hub", icon: FileText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export const AppShell = ({ children, kind }: { children: ReactNode; kind: "admin" | "student" }) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const sidebarItems = kind === "admin" ? [...adminNavMain, ...adminMore] : [...studentNav, ...studentMore];
  const bottomMain = kind === "admin" ? adminNavMain : studentNav;
  const moreItems = kind === "admin" ? adminMore : studentMore;

  const onSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card/40 p-4 md:flex">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2">
          <img src={logo} alt="CS&SE App" className="h-9 w-9 rounded-lg" />
          <div>
            <div className="text-sm font-bold">CS&amp;SE App</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{kind} portal</div>
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
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

      <main className="flex-1 overflow-x-hidden pb-20 md:pb-0">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="CS&SE App" className="h-8 w-8 rounded-lg" />
            <span className="font-bold">CS&amp;SE App</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <div className="p-4 md:p-10">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-card/95 backdrop-blur md:hidden">
        {bottomMain.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium text-muted-foreground">
              <MoreHorizontal className="h-5 w-5" /> More
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <div className="grid grid-cols-3 gap-2 pt-4">
              {moreItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex flex-col items-center gap-1 rounded-lg border border-border p-3 text-xs text-foreground hover:bg-muted"
                >
                  <item.icon className="h-5 w-5 text-primary" />
                  <span className="text-center">{item.label}</span>
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
};
