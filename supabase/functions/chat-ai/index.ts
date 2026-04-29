// Student-personalized chatbot streaming via Lovable AI
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const uid = userData.user.id;
    const body = await req.json();
    const { messages, conversation_id, bot_name } = body as {
      messages: { role: string; content: string }[];
      conversation_id: string;
      bot_name?: string;
    };

    // Pull student profile for personalization (RLS-scoped to self)
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, student_id, department, status")
      .eq("id", uid)
      .maybeSingle();

    const systemPrompt = `You are ${bot_name || "Buddy"}, a friendly study assistant chatting with a student named ${profile?.full_name || "there"}.
Tone: warm, conversational, like a helpful friend. Keep replies clear and concise.
Focus: study help — explanations, concepts, problem-solving, planning. Politely redirect off-topic chats back to studies.
Never reveal information about other users. Only answer using the conversation context the student shares.
Format with markdown when helpful (lists, code blocks).`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please retry shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Lovable workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const txt = await aiResp.text();
      console.error("AI error", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tee the stream: pass to client AND collect full text to persist
    let fullText = "";
    const transform = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        try {
          const txt = new TextDecoder().decode(chunk);
          for (const line of txt.split("\n")) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const json = t.slice(5).trim();
            if (json === "[DONE]") continue;
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) fullText += c;
          }
        } catch { /* partial chunk */ }
      },
      async flush() {
        if (fullText && conversation_id) {
          await supabase.from("chat_messages").insert({
            conversation_id,
            user_id: uid,
            role: "assistant",
            content: fullText,
          });
          await supabase.from("chat_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversation_id)
            .eq("user_id", uid);
        }
      },
    });

    return new Response(aiResp.body!.pipeThrough(transform), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-ai err", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
