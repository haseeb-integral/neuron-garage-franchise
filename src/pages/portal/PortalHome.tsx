import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

/** Prospect portal home. Phase 1 placeholder — the "Path to Ownership" page arrives in Phase 3. */
export default function PortalHome() {
  const { session, loading, accessChecked, role, portalCandidateId, signOut } = useAuth();

  useEffect(() => {
    if (portalCandidateId) supabase.rpc("portal_mark_activated").then(() => {});
  }, [portalCandidateId]);

  if (loading || (session && !accessChecked)) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!session) return <Navigate to="/auth" replace state={{ from: "/portal" }} />;
  if (!portalCandidateId) return <Navigate to={role ? "/" : "/auth"} replace />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold">Your Path to Ownership</h1>
      <p className="max-w-md text-sm text-muted-foreground">Your journey page is coming soon.</p>
      <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
    </div>
  );
}
