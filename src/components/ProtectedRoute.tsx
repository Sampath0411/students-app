import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";
import { Loader2, Wrench } from "lucide-react";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const ProtectedRoute = ({
  children,
  requireRole,
}: {
  children: ReactNode;
  requireRole?: "admin" | "student";
}) => {
  const { user, role, loading } = useAuth();
  const { enabled: maintenance, loading: maintLoading } = useMaintenanceMode();
  const location = useLocation();

  if (loading || maintLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Maintenance: block students
  if (maintenance && role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="card-elevated max-w-md p-8 text-center">
          <Wrench className="mx-auto mb-4 h-10 w-10 text-warning" />
          <h1 className="mb-2 text-2xl font-bold">Under maintenance</h1>
          <p className="mb-4 text-muted-foreground">System is under maintenance. Please try again later.</p>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>Sign out</Button>
        </Card>
      </div>
    );
  }

  if (requireRole && role !== requireRole) {
    return <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />;
  }
  return <>{children}</>;
};
