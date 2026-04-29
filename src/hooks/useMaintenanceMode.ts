import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useMaintenanceMode = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("app_settings").select("value").eq("key", "maintenance").maybeSingle();
    setEnabled(!!(data?.value as any)?.enabled);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("app_settings_maint")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings", filter: "key=eq.maintenance" }, (payload: any) => {
        setEnabled(!!payload.new?.value?.enabled);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return { enabled, loading, refresh: load };
};
