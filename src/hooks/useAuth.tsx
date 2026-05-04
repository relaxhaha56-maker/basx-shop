import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = { id: string; username: string | null; display_name: string | null; wallet_balance: number; points: number };
type AuthCtx = { user: User | null; session: Session | null; profile: Profile | null; isAdmin: boolean; loading: boolean; refreshProfile: () => Promise<void>; signOut: () => Promise<void>; };

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadExtras = async (uid: string) => {
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile(prof as Profile | null);
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setIsAdmin(!!roles?.some((r: any) => r.role === "admin"));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) setTimeout(() => loadExtras(sess.user.id), 0);
      else { setProfile(null); setIsAdmin(false); }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadExtras(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Realtime: keep wallet balance in sync across the app
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`profile_${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (p) => setProfile((prev) => prev ? { ...prev, ...(p.new as any) } : (p.new as any)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const refreshProfile = async () => { if (user) await loadExtras(user.id); };
  const signOut = async () => { await supabase.auth.signOut(); };

  return <Ctx.Provider value={{ user, session, profile, isAdmin, loading, refreshProfile, signOut }}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);
