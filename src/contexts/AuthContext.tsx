import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "student" | null;
type ProfileStatus = "pending" | "approved" | "rejected" | null;

interface AuthCtx {
  user: User | null;
  session: Session | null;
  role: Role;
  status: ProfileStatus;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [status, setStatus] = useState<ProfileStatus>(null);
  const [loading, setLoading] = useState(true);

  const loadMeta = async (uid: string) => {
    const [{ data: roles }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("status").eq("id", uid).maybeSingle(),
    ]);
    const r: Role = roles?.some((x) => x.role === "admin")
      ? "admin"
      : roles?.some((x) => x.role === "student")
        ? "student"
        : null;
    setRole(r);
    setStatus((prof?.status as ProfileStatus) ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadMeta(sess.user.id), 0);
      } else {
        setRole(null);
        setStatus(null);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadMeta(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setStatus(null);
  };

  const refresh = async () => {
    if (user) await loadMeta(user.id);
  };

  return (
    <Ctx.Provider value={{ user, session, role, status, loading, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
