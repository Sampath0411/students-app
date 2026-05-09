import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/** Watches the browser's online status and redirects to /offline when connection drops. */
export const OfflineWatcher = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const handleOffline = () => {
      if (pathname !== "/offline") navigate("/offline", { replace: true });
    };
    const handleOnline = () => {
      if (pathname === "/offline") navigate("/", { replace: true });
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    if (!navigator.onLine && pathname !== "/offline") {
      navigate("/offline", { replace: true });
    }
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [navigate, pathname]);

  return null;
};
