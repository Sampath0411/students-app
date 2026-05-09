import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, AlertTriangle } from "lucide-react";
import logo from "@/assets/logo.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="card-elevated max-w-md rounded-2xl border border-border p-10 text-center">
        <img src={logo} alt="CS&SE App" className="mx-auto mb-6 h-14 w-14 rounded-xl" />
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
          <AlertTriangle className="h-6 w-6 text-warning" />
        </div>
        <h1 className="mb-2 text-5xl font-bold tracking-tight">404</h1>
        <p className="mb-1 text-lg font-medium">Page not found</p>
        <p className="mb-6 text-sm text-muted-foreground">
          We couldn't find <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{location.pathname}</code>.
        </p>
        <Link to="/">
          <Button className="gradient-primary text-primary-foreground hover:opacity-90">
            <Home className="mr-2 h-4 w-4" /> Go home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
