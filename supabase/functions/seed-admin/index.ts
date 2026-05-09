import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Master admin used by the application.
const ADMIN_EMAIL = "sampathlox@gmail.com";
const ADMIN_PASSWORD = "Sampath@9291";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list.users.find((u) => u.email === ADMIN_EMAIL);

    let userId = existing?.id;
    if (!existing) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { is_admin: true, full_name: "Administrator" },
      });
      if (error) throw error;
      userId = created.user.id;
    } else {
      // Ensure password matches and email is confirmed (idempotent).
      await admin.auth.admin.updateUserById(existing.id, {
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { ...(existing.user_metadata || {}), is_admin: true },
      });
    }

    if (userId) {
      await admin.from("user_roles").upsert(
        { user_id: userId, role: "admin" },
        { onConflict: "user_id,role" },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, email: ADMIN_EMAIL }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
