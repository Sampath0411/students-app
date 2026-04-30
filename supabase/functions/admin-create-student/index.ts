// Edge function: admin manages student accounts (create / update / delete)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") || "";

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: udata, error: uerr } = await userClient.auth.getUser();
    if (uerr || !udata.user) return new Response(JSON.stringify({ error: "Not signed in" }), { status: 401, headers: cors });

    const admin = createClient(url, svc);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", udata.user.id);
    if (!roles?.some((r: any) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: cors });
    }

    const body = await req.json();
    const action = body.action || "create";

    if (action === "delete") {
      const { id } = body;
      if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: cors });
      const { error: dErr } = await admin.auth.admin.deleteUser(id);
      if (dErr) return new Response(JSON.stringify({ error: dErr.message }), { status: 400, headers: cors });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (action === "update") {
      const { id, full_name, email, student_id, phone, department, date_of_birth, password } = body;
      if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: cors });
      // Update auth email/password if provided
      const authPatch: any = {};
      if (email) authPatch.email = email;
      if (password) authPatch.password = password;
      if (Object.keys(authPatch).length) {
        const { error: aErr } = await admin.auth.admin.updateUserById(id, authPatch);
        if (aErr) return new Response(JSON.stringify({ error: aErr.message }), { status: 400, headers: cors });
      }
      const { error: pErr } = await admin
        .from("profiles")
        .update({
          full_name,
          email: email ?? undefined,
          student_id,
          phone: phone || null,
          department: department || null,
          date_of_birth: date_of_birth || null,
        })
        .eq("id", id);
      if (pErr) return new Response(JSON.stringify({ error: pErr.message }), { status: 400, headers: cors });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // create
    const { email, password, full_name, student_id, phone, department, date_of_birth } = body;
    if (!email || !password || !full_name || !student_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: cors });
    }

    const { data: created, error: cerr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, student_id, phone, department, date_of_birth },
    });
    if (cerr) return new Response(JSON.stringify({ error: cerr.message }), { status: 400, headers: cors });

    await admin.from("profiles").update({ status: "approved" }).eq("id", created.user!.id);

    return new Response(JSON.stringify({ ok: true, id: created.user!.id }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});
