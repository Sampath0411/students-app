import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CalendarCheck, BarChart3, ArrowRight, Users } from "lucide-react";
import logo from "@/assets/logo.png";

const Landing = () => {
  return (
    <div className="min-h-screen">
      <header className="container flex items-center justify-between gap-4 px-4 py-4 sm:py-6">
        <div className="flex items-center gap-2">
          <img src={logo} alt="CS&SE App" className="h-8 w-8 rounded-lg sm:h-9 sm:w-9" />
          <span className="text-base font-bold sm:text-lg">CS&amp;SE App</span>
        </div>
        <Link to="/login">
          <Button size="sm" className="gap-1 gradient-primary text-primary-foreground hover:opacity-90">
            <span className="hidden sm:inline">Get started</span>
            <span className="sm:hidden">Sign in</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </header>

      <section className="container px-4 py-12 sm:py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur sm:px-4 sm:py-1.5 sm:text-xs">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            Built for modern campuses
          </div>
          <h1 className="mb-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-7xl">
            Student management,{" "}
            <span className="text-gradient">reimagined.</span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-base text-muted-foreground sm:mb-10 sm:text-lg">
            Track attendance, manage timetables, and stay connected — all from one beautifully simple workspace.
          </p>
          <div className="flex justify-center">
            <Link to="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full gradient-primary text-primary-foreground hover:opacity-90 sm:w-auto">
                Sign in or create account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-4 sm:mt-24 sm:gap-6 md:grid-cols-3">
          {[
            { icon: CalendarCheck, title: "Daily attendance", desc: "Real-time presence tracking with a single tap." },
            { icon: BarChart3, title: "Live insights", desc: "Stats, trends and overviews at a glance." },
            { icon: Users, title: "Stay connected", desc: "Announcements, assignments and records in one place." },
          ].map((f) => (
            <div key={f.title} className="card-elevated rounded-xl p-5 sm:p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 sm:mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-1 text-base font-semibold sm:text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="container border-t border-border px-4 py-6 text-center text-xs text-muted-foreground sm:py-8 sm:text-sm">
        © {new Date().getFullYear()} CS&amp;SE App — Crafted for great schools.
      </footer>
    </div>
  );
};

export default Landing;
