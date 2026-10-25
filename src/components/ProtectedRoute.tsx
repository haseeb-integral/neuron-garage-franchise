import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

/** Staff-only gate. Prospects go to their portal; accounts with no staff role see a "no access" screen. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, role, portalCandidateId, accessChecked, signOut } = useAuth();
  const location = useLocation();

  if (loading || (session && !accessChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  if (!role && portalCandidateId) {
    return <Navigate to="/portal" replace />;
  }

  if (!role) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-lg font-semibold">Your account is waiting for access</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          An admin needs to give your account staff access before you can use this app.
        </p>
        <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
      </div>
    );
  }

  return <>{children}</>;
}
