import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw } from "lucide-react";
import logo from "@/assets/logo.png";

const Offline = () => {
  const navigate = useNavigate();
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (online) {
      // auto-redirect home when connection restored
      const t = setTimeout(() => navigate("/"), 800);
      return () => clearTimeout(t);
    }
  }, [online, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="card-elevated max-w-md rounded-2xl border border-border p-10 text-center">
        <img src={logo} alt="CS&SE App" className="mx-auto mb-6 h-14 w-14 rounded-xl" />
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <WifiOff className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">You're offline</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {online
            ? "Reconnected — taking you back…"
            : "Check your network connection. The app will resume automatically when you're back online."}
        </p>
        <Button
          onClick={() => location.reload()}
          className="gradient-primary text-primary-foreground hover:opacity-90"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Try again
        </Button>
      </div>
    </div>
  );
};

export default Offline;
