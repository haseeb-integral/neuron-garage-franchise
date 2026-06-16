import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cachedToken: string | null = null;
let inflight: Promise<string | null> | null = null;

async function fetchToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-mapbox-token", { body: {} });
      if (error) throw error;
      const t = (data as { token?: string })?.token ?? null;
      if (t) cachedToken = t;
      return t;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Returns the public Mapbox token. Cached for the lifetime of the page. */
export function useMapboxToken(): string | null {
  const [token, setToken] = useState<string | null>(cachedToken);
  useEffect(() => {
    if (token) return;
    let cancelled = false;
    fetchToken().then((t) => {
      if (!cancelled) setToken(t);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);
  return token;
}
