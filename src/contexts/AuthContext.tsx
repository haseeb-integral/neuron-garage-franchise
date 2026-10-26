import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "manager";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  /** Candidate id when this user is a portal prospect. */
  portalCandidateId: string | null;
  /** True once role + portal link have been loaded for the current user. */
  accessChecked: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [portalCandidateId, setPortalCandidateId] = useState<string | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let requestId = 0;

    const applySession = (newSession: Session | null) => {
      if (!active) return;
      const currentRequest = ++requestId;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      // Never combine the new session with the previous account's access.
      setProfile(null);
      setRole(null);
      setPortalCandidateId(null);
      setAccessChecked(!newSession?.user);
      setLoading(false);
      const userId = newSession?.user.id;
      if (!userId) return;

      // Defer DB calls to avoid deadlock inside the auth callback.
      setTimeout(async () => {
        if (!active || currentRequest !== requestId) return;
        try {
          const [profileResult, roleResult, portalResult] = await Promise.all([
            supabase.from("profiles").select("id, email, full_name").eq("id", userId).maybeSingle(),
            supabase.from("user_roles").select("role").eq("user_id", userId).order("role", { ascending: true }).limit(1).maybeSingle(),
            supabase.from("candidate_portal_users").select("candidate_id").eq("user_id", userId).maybeSingle(),
          ]);
          if (!active || currentRequest !== requestId) return;
          // Failed access checks must never grant staff access.
          if (roleResult.error || portalResult.error) return;
          setProfile(profileResult.data ?? null);
          const nextRole = roleResult.data?.role;
          setRole(nextRole === "admin" || nextRole === "manager" ? nextRole : null);
          setPortalCandidateId(portalResult.data?.candidate_id ?? null);
          setAccessChecked(true);
        } catch {
          // Leave protected pages hidden until access can be confirmed.
        }
      }, 0);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      applySession(newSession);
    });
    const initialRequest = requestId;
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      if (active && requestId === initialRequest) applySession(existing);
    });

    return () => {
      active = false;
      requestId++;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, role, portalCandidateId, accessChecked, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
