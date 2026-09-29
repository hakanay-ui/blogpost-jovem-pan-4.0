import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { checkUserActive, validateSignup } from "@/utils/auth.functions";

export type AppRole = "admin" | "editor" | "user";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  status: "online" | "offline" | "away" | "busy";
  is_active: boolean;
  is_approved: boolean;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isApproved: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<{
    error: Error | null;
    requiresApproval?: boolean;
  }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadProfileAndRole(userId: string) {
  const [profileRes, roleRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,full_name,email,avatar_url,status,is_active,is_approved")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .order("role", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    profile: (profileRes.data as Profile | null) ?? null,
    role: (roleRes.data?.role as AppRole | null) ?? null,
  };
}

async function updateOwnStatus(userId: string, status: Profile["status"]) {
  try {
    await supabase.from("profiles").update({ status }).eq("id", userId);
  } catch (e) {
    console.error("Failed updating status:", e);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const lastCheckedRef = useRef<number>(0);

  const hydrate = useCallback(async (s: Session | null) => {
    setSession(s);
    setUser(s?.user ?? null);
    if (!s?.user) {
      setProfile(null);
      setRole(null);
      return;
    }
    const { profile: p, role: r } = await loadProfileAndRole(s.user.id);
    setProfile(p);
    setRole(r);
  }, []);

  // Initial load + auth subscription
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        // defer to avoid deadlocks inside the callback
        setTimeout(() => {
          void hydrate(newSession);
        }, 0);
      },
    );

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      await hydrate(s);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [hydrate]);

  // Periodic active check (throttled)
  useEffect(() => {
    if (!session?.access_token) return;
    const token = session.access_token;
    const run = async () => {
      const now = Date.now();
      if (now - lastCheckedRef.current < 30_000) return;
      lastCheckedRef.current = now;
      try {
        const res = await checkUserActive({
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.active || !res.approved) {
          await supabase.auth.signOut();
        }
      } catch (e) {
        console.error("checkUserActive failed:", e instanceof Error ? e.message : e);
      }
    };
    void run();
    const onFocus = () => void run();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [session]);

  // Status -> online on login; offline on tab close
  useEffect(() => {
    if (!user) return;
    void updateOwnStatus(user.id, "online");
    const handleUnload = () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`;
        const body = JSON.stringify({ status: "offline" });
        const headers = {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
          Authorization: `Bearer ${session?.access_token ?? ""}`,
          Prefer: "return=minimal",
        };
        fetch(url, { method: "PATCH", headers, body, keepalive: true });
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [user, session]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (fullName: string, email: string, password: string) => {
    try {
      const validation = await validateSignup({ data: { email } });
      if (!validation.allowed) {
        return {
          error: new Error(
            validation.message ??
              "Cadastro não permitido para este email.",
          ),
        };
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
          data: { full_name: fullName },
        },
      });
      if (error) return { error };
      return { error: null, requiresApproval: validation.requiresApproval };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error("Erro no cadastro.") };
    }
  };

  const signOut = async () => {
    if (user) await updateOwnStatus(user.id, "offline");
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (!user) return;
    const { profile: p, role: r } = await loadProfileAndRole(user.id);
    setProfile(p);
    setRole(r);
  };

  const value: AuthContextValue = {
    user,
    session,
    profile,
    role,
    loading,
    isAdmin: role === "admin",
    isEditor: role === "editor",
    isApproved: profile?.is_approved === true,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
