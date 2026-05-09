import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CalendarCheck, BarChart3, ArrowRight, Users } from "lucide-react";
import logo from "@/assets/logo.png";

const Landing = () => {
  return (
    <div className="min-h-screen">
      <header className="container flex items-center justify-between gap-4 py-6">
        <div className="flex items-center gap-2">
          <img src={logo} alt="CS&SE App" className="h-9 w-9 rounded-lg" />
          <span className="text-lg font-bold">CS&amp;SE App</span>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          <Link to="/login">
            <Button variant="outline" size="sm" className="gap-1">
              <Users className="h-4 w-4" /> Student login
            </Button>
          </Link>
          <Link to="/admin/login">
            <Button size="sm" className="gap-1 gradient-primary text-primary-foreground hover:opacity-90">
              <ShieldCheck className="h-4 w-4" /> Admin login
            </Button>
          </Link>
        </nav>
      </header>

      <section className="container py-20 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            Built for modern campuses
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Student management,{" "}
            <span className="text-gradient">reimagined.</span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground">
            Track attendance, manage timetables, and oversee approvals — all from a single, beautifully simple workspace.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register">
              <Button size="lg" className="gradient-primary text-primary-foreground hover:opacity-90">
                Create student account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/admin/login">
              <Button size="lg" variant="outline">
                Admin sign in
              </Button>
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-24 grid max-w-5xl gap-6 md:grid-cols-3">
          {[
            { icon: CalendarCheck, title: "Daily attendance", desc: "Real-time presence tracking with a single tap." },
            { icon: BarChart3, title: "Live insights", desc: "Stats, trends and overviews at a glance." },
            { icon: Users, title: "Approval workflows", desc: "Review and approve registrations effortlessly." },
          ].map((f) => (
            <div key={f.title} className="card-elevated rounded-xl p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-1 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="container border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} CS&amp;SE App — Crafted for great schools.
      </footer>
    </div>
  );
};

export default Landing;
