// ============================================================================
// Tiny role hook. Returns whether the current authenticated user has the
// 'manager' or 'admin' role in public.user_roles. We use it to gate the
// /db-health page and the global debug footer.
// ============================================================================

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ManagerCheck = {
  loading: boolean;
  isManager: boolean;
  isAdmin: boolean;
  userId: string | null;
};

export function useIsManager(): ManagerCheck {
  const [state, setState] = useState<ManagerCheck>({
    loading: true,
    isManager: false,
    isAdmin: false,
    userId: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionRes } = await supabase.auth.getSession();
      const userId = sessionRes.session?.user?.id ?? null;
      if (!userId) {
        if (!cancelled) setState({ loading: false, isManager: false, isAdmin: false, userId: null });
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const roles = (data ?? []).map((r: any) => r.role);
      if (!cancelled) {
        setState({
          loading: false,
          isManager: roles.includes("manager") || roles.includes("admin"),
          isAdmin: roles.includes("admin"),
          userId,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
