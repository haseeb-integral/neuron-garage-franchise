import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { initialPasswordSetupLink } from "@/lib/passwordSetupLink";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import logo from "@/assets/neuron-garage-logo.png";

const schema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "invalid" | "connection">("loading");
  const [saveError, setSaveError] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");
  const isPortal = new URLSearchParams(window.location.search).get("portal") === "1";
  const ready = status === "ready";

  useEffect(() => {
    document.title = "Reset password · Neuron Garage";

    if (initialPasswordSetupLink === "invalid") {
      setStatus("invalid");
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      active = false;
      setStatus("connection");
    }, 12000);
    const validate = async () => {
      try {
        const initialized = await supabase.auth.initialize();
        if (initialized.error) {
          if (active) setStatus("invalid");
          return;
        }
        const { data, error } = await supabase.auth.getUser();
        if (active) setStatus(error || !data.user ? "invalid" : "ready");
      } catch {
        if (active) setStatus("connection");
      } finally {
        window.clearTimeout(timer);
      }
    };
    void validate();
    return () => { active = false; window.clearTimeout(timer); };
  }, []);

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSendError("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password${isPortal ? "?portal=1" : ""}`,
      });
      if (error) throw error;
      setSent(true);
    } catch {
      setSendError("We couldn’t send the link. Please try again in a few minutes.");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || submitting) return;
    setSaveError("");
    const parsed = schema.safeParse({ password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user) {
        setStatus("invalid");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(isPortal ? "Password saved. Welcome!" : "Password updated. You're now signed in.");
      navigate(isPortal ? "/portal" : "/", { replace: true });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "We couldn’t save your password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <img src={logo} alt="Neuron Garage" className="w-10 h-10" />
          <span className="text-xl font-bold text-primary">Neuron Garage</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{status === "invalid" ? "You need a new password link" : isPortal ? "Welcome! Create your password" : "Set a new password"}</CardTitle>
            <CardDescription>
              {ready
                ? isPortal
                  ? "Choose a password to open your Path to Ownership."
                  : "Enter a new password for your account."
                : status === "invalid"
                  ? "This link is missing, has expired, or has already been used. Request a new link below and use the newest email."
                  : status === "connection"
                    ? "We couldn’t check your link. Please reload this page or request a new link below."
                    : "Validating reset link…"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === "invalid" || status === "connection" ? (
              <form onSubmit={requestLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email address</Label>
                  <Input id="reset-email" type="email" autoComplete="email" required maxLength={255} value={email} onChange={e => setEmail(e.target.value)} disabled={sending} />
                </div>
                {sendError && <p role="alert" className="text-sm text-destructive">{sendError}</p>}
                {sent && <p role="status" className="text-sm text-success">If an account uses this email, you’ll receive a new password link. Check your inbox and use the newest email.</p>}
                <Button type="submit" className="w-full" disabled={sending}>{sending ? "Sending…" : "Send new password link"}</Button>
                {status === "connection" && <Button type="button" variant="outline" className="w-full" onClick={() => window.location.reload()}>Retry checking link</Button>}
              </form>
            ) : <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={!ready || submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  disabled={!ready || submitting}
                />
              </div>
              {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
              <Button type="submit" className="w-full" disabled={submitting || !ready}>
                {submitting ? "Saving…" : isPortal ? "Save password" : "Update password"}
              </Button>
            </form>}
            <Button type="button" variant="link" onClick={() => navigate(isPortal ? "/portal/sign-in" : "/auth")} className="mt-3 w-full text-xs text-muted-foreground">Back to sign in</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
