import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = ({
  children,
  requireRole,
}: {
  children: ReactNode;
  requireRole?: "admin" | "student";
}) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (requireRole && role !== requireRole) {
    return <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />;
  }
  return <>{children}</>;
};
