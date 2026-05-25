import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, MailX } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State =
  | { kind: "validating" }
  | { kind: "ready" }
  | { kind: "already" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "validating" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "error", message: "Missing unsubscribe token." });
      return;
    }
    (async () => {
      try {
        const r = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } }
        );
        const data = await r.json();
        if (!r.ok) {
          setState({ kind: "error", message: data?.error ?? "Invalid token." });
        } else if (data?.valid === false && data?.reason === "already_unsubscribed") {
          setState({ kind: "already" });
        } else if (data?.valid) {
          setState({ kind: "ready" });
        } else {
          setState({ kind: "error", message: "Invalid or expired link." });
        }
      } catch (e) {
        setState({ kind: "error", message: e instanceof Error ? e.message : "Network error" });
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState({ kind: "submitting" });
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON },
        body: JSON.stringify({ token }),
      });
      const data = await r.json();
      if (!r.ok) {
        setState({ kind: "error", message: data?.error ?? "Could not unsubscribe." });
        return;
      }
      if (data?.success || data?.reason === "already_unsubscribed") {
        setState({ kind: "success" });
      } else {
        setState({ kind: "error", message: "Could not unsubscribe." });
      }
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Network error" });
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8 text-center space-y-4">
        {state.kind === "validating" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Validating your link…</p>
          </>
        )}
        {state.kind === "ready" && (
          <>
            <MailX className="h-10 w-10 mx-auto text-primary" />
            <h1 className="text-xl font-semibold">Unsubscribe from emails</h1>
            <p className="text-sm text-muted-foreground">
              You'll stop receiving Neuron Garage notification emails at this address.
            </p>
            <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>
          </>
        )}
        {state.kind === "submitting" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Updating preferences…</p>
          </>
        )}
        {state.kind === "success" && (
          <>
            <CheckCircle2 className="h-10 w-10 mx-auto text-primary" />
            <h1 className="text-xl font-semibold">You're unsubscribed</h1>
            <p className="text-sm text-muted-foreground">
              You will no longer receive notification emails from Neuron Garage.
            </p>
          </>
        )}
        {state.kind === "already" && (
          <>
            <CheckCircle2 className="h-10 w-10 mx-auto text-primary" />
            <h1 className="text-xl font-semibold">Already unsubscribed</h1>
            <p className="text-sm text-muted-foreground">
              This address is already opted out of notification emails.
            </p>
          </>
        )}
        {state.kind === "error" && (
          <>
            <XCircle className="h-10 w-10 mx-auto text-destructive" />
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">{state.message}</p>
          </>
        )}
      </Card>
    </main>
  );
}
