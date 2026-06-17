// Manager-added cities that extend the built-in MVS shortlist.
// Backed by public.mvs_shortlist_cities. Read by Market Validation +
// City Scoring Console so a city added in one place shows up everywhere.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ShortlistAddition {
  id: string;
  city: string;   // e.g. "Denver"
  state: string;  // e.g. "CO"
  added_at: string;
}

export function useShortlistAdditions() {
  const [rows, setRows] = useState<ShortlistAddition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mvs_shortlist_cities")
      .select("id, city, state, added_at")
      .order("added_at", { ascending: true });
    if (error) setError(error.message);
    else {
      setError(null);
      setRows((data ?? []) as ShortlistAddition[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const addCity = useCallback(async (city: string, state: string) => {
    const cleanCity = city.trim();
    const cleanState = state.trim().toUpperCase();
    if (!cleanCity || cleanState.length !== 2) {
      throw new Error("Enter a city and a 2-letter state code.");
    }
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id;
    if (!uid) throw new Error("You must be signed in.");
    const { error } = await supabase
      .from("mvs_shortlist_cities")
      .insert({ city: cleanCity, state: cleanState, added_by: uid });
    if (error) throw new Error(error.message);
    await refresh();
  }, [refresh]);

  const removeCity = useCallback(async (id: string) => {
    const { error } = await supabase.from("mvs_shortlist_cities").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await refresh();
  }, [refresh]);

  return { rows, loading, error, refresh, addCity, removeCity };
}
