import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/neuron-garage-logo.png";

export default function PortalSignIn() {
  const { session, loading, accessChecked, role, portalCandidateId, signOut } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reset, setReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => { document.title = "Prospect sign in · Neuron Garage"; }, []);

  if (loading || (session && !accessChecked)) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (session && accessChecked && role) return <Navigate to="/" replace />;
  if (session && accessChecked && portalCandidateId) {
    const from: unknown = location.state?.from;
    const destination = typeof from === "string" && /^\/portal\/form\/[a-z0-9_-]+$/.test(from) ? from : "/portal";
    return <Navigate to={destination} replace />;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSent(false);
    try {
      if (reset) {
        const result = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (result.error) throw result.error;
        setSent(true);
      } else {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) throw result.error;
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "We couldn’t sign you in. Please try again.";
      setError(message === "Invalid login credentials" ? "That email and password don’t match. Please try again." : message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-portal-navy text-portal-navy-foreground">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-6">
          <img src={logo} alt="Neuron Garage" className="h-12 w-auto rounded bg-background p-1" />
          <div><p className="text-lg font-bold">Neuron Garage</p><p className="text-sm text-portal-yellow">Your Path to Ownership</p></div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md px-5 py-12 sm:py-16">
        {session ? (
          <div className="space-y-5">
            <h1 className="text-3xl font-extrabold text-portal-navy">Your portal is not ready yet</h1>
            <p className="text-muted-foreground">This account is not linked to a prospect. Please contact your Neuron Garage team or sign in with the email from your invitation.</p>
            <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold text-portal-navy">{reset ? "Reset your password" : "Welcome back"}</h1>
            <p className="mt-3 text-muted-foreground">{reset ? "Enter your email, and we’ll send you a link to set a new password." : "Sign in to continue your Neuron Garage conversations and homework."}</p>
            <form onSubmit={submit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="portal-email">Email address</Label>
                <Input id="portal-email" type="email" autoComplete="email" required maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
              </div>
              {!reset && <div className="space-y-2">
                <Label htmlFor="portal-password">Password</Label>
                <PasswordInput id="portal-password" autoComplete="current-password" required maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
              </div>}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              {sent && <p role="status" className="text-sm text-success">If an account uses this email, you’ll receive a password reset link. Please check your inbox.</p>}
              <Button type="submit" disabled={busy} className="w-full bg-portal-red text-portal-red-foreground hover:bg-portal-red/90">
                {!reset && <LogIn className="mr-2 h-4 w-4" />}
                {busy ? (reset ? "Sending…" : "Signing in…") : reset ? "Send reset link" : "Sign In"}
              </Button>
              <Button type="button" variant="link" className="h-auto px-0 text-portal-navy" disabled={busy} onClick={() => { setReset(!reset); setError(""); setSent(false); setPassword(""); }}>
                {reset ? "Back to sign in" : "Forgot password?"}
              </Button>
            </form>
            <p className="mt-8 border-t pt-5 text-sm text-muted-foreground">Your Neuron Garage team will invite you after your first conversation. Use the email address from your invitation.</p>
          </>
        )}
      </main>
    </div>
  );
}