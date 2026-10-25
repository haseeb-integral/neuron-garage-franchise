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
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (!newSession?.user) {
        setProfile(null);
        setRole(null);
        setPortalCandidateId(null);
      } else {
        // Defer DB calls to avoid deadlock inside the callback
        setTimeout(() => fetchProfileAndRole(newSession.user.id), 0);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        fetchProfileAndRole(existing.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfileAndRole = async (userId: string) => {
    const [{ data: profileData }, { data: roleData }, { data: portalData }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId).order("role", { ascending: true }).limit(1).maybeSingle(),
      supabase.from("candidate_portal_users").select("candidate_id").eq("user_id", userId).maybeSingle(),
    ]);
    setPortalCandidateId(portalData?.candidate_id ?? null);
    setProfile(profileData ?? null);
    setRole((roleData?.role as AppRole) ?? null);
    setAccessChecked(true);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
    setPortalCandidateId(null);
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
