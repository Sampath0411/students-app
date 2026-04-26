import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const email = "admin@demo.com";
    const password = "Admin@12345";

    // Check if user exists
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list.users.find((u) => u.email === email);

    let userId = existing?.id;
    if (!existing) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { is_admin: true, full_name: "Demo Admin" },
      });
      if (error) throw error;
      userId = created.user.id;
    }

    // Ensure admin role exists
    if (userId) {
      await admin.from("user_roles").upsert(
        { user_id: userId, role: "admin" },
        { onConflict: "user_id,role" },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, email, password, note: "Use these credentials on the admin login page." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
