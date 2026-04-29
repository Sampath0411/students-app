import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Send, Plus, MessageCircle, Copy, Check, Trash2, Bot, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Conv = { id: string; title: string; updated_at: string };
type Msg = { id?: string; role: "user" | "assistant"; content: string };

const greetingPrefix = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
};

const Chatbot = () => {
  const { user } = useAuth();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [botName, setBotName] = useState<string>("");
  const [studentName, setStudentName] = useState("");
  const [askName, setAskName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load settings, profile, conversations
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: cs }, { data: profile }, { data: cv }] = await Promise.all([
        supabase.from("chat_settings").select("bot_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("chat_conversations").select("id,title,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }),
      ]);
      setStudentName(profile?.full_name?.split(" ")[0] || "");
      setConvs(cv || []);
      if (!cs?.bot_name) {
        setAskName(true);
      } else {
        setBotName(cs.bot_name);
      }
    })();
  }, [user]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id,role,content")
        .eq("conversation_id", activeId)
        .order("created_at");
      setMessages((data || []) as Msg[]);
    })();
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const saveName = async () => {
    if (!user || !nameDraft.trim()) return;
    const name = nameDraft.trim().slice(0, 40);
    await supabase.from("chat_settings").upsert({ user_id: user.id, bot_name: name });
    setBotName(name);
    setAskName(false);
    setNameDraft("");
  };

  const newChat = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({ user_id: user.id, title: "New chat" })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setConvs((c) => [data as Conv, ...c]);
    setActiveId(data.id);
    const greeting = `${greetingPrefix()}, ${studentName || "friend"}! I'm ${botName || "your study buddy"}. How can I help you today?`;
    setMessages([{ role: "assistant", content: greeting }]);
  };

  const deleteChat = async (id: string) => {
    await supabase.from("chat_conversations").delete().eq("id", id);
    setConvs((c) => c.filter((x) => x.id !== id));
    if (activeId === id) { setActiveId(null); setMessages([]); }
  };

  const send = async () => {
    if (!input.trim() || streaming || !user) return;
    let convId = activeId;
    if (!convId) {
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({ user_id: user.id, title: input.slice(0, 40) })
        .select().single();
      if (error) return toast.error(error.message);
      convId = data.id;
      setActiveId(convId);
      setConvs((c) => [data as Conv, ...c]);
    } else if (messages.length <= 1) {
      // first user message — set title
      await supabase.from("chat_conversations").update({ title: input.slice(0, 40) }).eq("id", convId);
      setConvs((c) => c.map((x) => x.id === convId ? { ...x, title: input.slice(0, 40) } : x));
    }

    const userMsg: Msg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    // Persist user message
    await supabase.from("chat_messages").insert({
      conversation_id: convId, user_id: user.id, role: "user", content: userMsg.content,
    });

    try {
      const sessionResp = await supabase.auth.getSession();
      const token = sessionResp.data.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          conversation_id: convId,
          bot_name: botName,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (resp.status === 429) { toast.error("Rate limited. Try again shortly."); setStreaming(false); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); setStreaming(false); return; }
      if (!resp.ok || !resp.body) { toast.error("AI error"); setStreaming(false); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistant = "";
      let done = false;

      while (!done) {
        const { value, done: rDone } = await reader.read();
        if (rDone) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data:")) continue;
          const json = line.slice(5).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              assistant += c;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: assistant };
                return copy;
              });
            }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Chat failed");
    } finally {
      setStreaming(false);
    }
  };

  const copy = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <AppShell kind="student">
      <Dialog open={askName} onOpenChange={setAskName}>
        <DialogContent>
          <DialogHeader><DialogTitle>What would you like to call me?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Pick a name for your study assistant. You can always change it later.</p>
          <Input autoFocus placeholder="e.g. Buddy, Athena, Spark…" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
          <Button onClick={saveName} disabled={!nameDraft.trim()} className="gradient-primary text-primary-foreground">Save</Button>
        </DialogContent>
      </Dialog>

      <div className="grid h-[calc(100vh-9rem)] gap-4 md:grid-cols-[260px_1fr] md:h-[calc(100vh-6rem)]">
        {/* Conversation list */}
        <Card className="flex flex-col overflow-hidden p-3">
          <Button onClick={newChat} className="mb-3 gradient-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" /> New chat</Button>
          <ScrollArea className="flex-1">
            {convs.length === 0 && <p className="px-2 py-6 text-center text-xs text-muted-foreground">No chats yet</p>}
            <div className="space-y-1">
              {convs.map((c) => (
                <div key={c.id} className={`group flex items-center justify-between rounded-md px-2 py-2 text-sm ${activeId === c.id ? "bg-primary/15 text-primary" : "hover:bg-muted"}`}>
                  <button onClick={() => setActiveId(c.id)} className="flex-1 truncate text-left">
                    <MessageCircle className="mr-2 inline h-3.5 w-3.5" />{c.title}
                  </button>
                  <button onClick={() => deleteChat(c.id)} className="opacity-0 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
                </div>
              ))}
            </div>
          </ScrollArea>
          {botName && (
            <button className="mt-2 rounded-md border border-border p-2 text-xs text-muted-foreground hover:bg-muted" onClick={() => { setNameDraft(botName); setAskName(true); }}>
              Bot name: <span className="font-medium text-foreground">{botName}</span>
            </button>
          )}
        </Card>

        {/* Chat area */}
        <Card className="flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full gradient-primary">
                  <Bot className="h-7 w-7 text-primary-foreground" />
                </div>
                <h2 className="text-xl font-semibold">{greetingPrefix()}, {studentName || "friend"}!</h2>
                <p className="text-sm text-muted-foreground">I'm {botName || "your study buddy"}. Ask me anything about your studies.</p>
                <Button onClick={newChat} variant="outline">Start a new chat</Button>
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-primary text-primary-foreground" : "gradient-primary text-primary-foreground"}`}>
                      {m.role === "user" ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={`group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-muted"}`}>
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-pre:my-2">
                          <ReactMarkdown>{m.content || (streaming && i === messages.length - 1 ? "▍" : "")}</ReactMarkdown>
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{m.content}</span>
                      )}
                      {m.role === "assistant" && m.content && (
                        <button onClick={() => copy(m.content, i)} className="absolute -bottom-3 -right-2 rounded-full border border-border bg-background p-1.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100" aria-label="Copy">
                          {copiedIdx === i ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {streaming && messages[messages.length - 1]?.content === "" && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…</div>
                )}
              </div>
            )}
          </div>
          <div className="border-t border-border p-3">
            <div className="mx-auto flex max-w-3xl items-end gap-2">
              <Input
                placeholder={`Message ${botName || "your study buddy"}…`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                disabled={streaming || askName}
                className="rounded-full"
              />
              <Button size="icon" onClick={send} disabled={!input.trim() || streaming || askName} className="h-10 w-10 shrink-0 rounded-full gradient-primary text-primary-foreground">
                {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
};

export default Chatbot;
