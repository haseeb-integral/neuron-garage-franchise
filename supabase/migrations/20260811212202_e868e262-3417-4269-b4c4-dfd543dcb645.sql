DELETE FROM public.watchlist_items a
USING public.watchlist_items b
WHERE a.city_id = b.city_id
  AND (a.created_at, a.id) > (b.created_at, b.id);

ALTER TABLE public.watchlist_items DROP CONSTRAINT IF EXISTS watchlist_items_user_id_city_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS watchlist_items_city_id_key ON public.watchlist_items (city_id);
CREATE INDEX IF NOT EXISTS watchlist_items_created_idx ON public.watchlist_items (created_at DESC);

DROP POLICY IF EXISTS "Users can view own watchlist" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can insert own watchlist" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can delete own watchlist" ON public.watchlist_items;

CREATE POLICY "Staff can view team watchlist"
  ON public.watchlist_items FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can add to team watchlist"
  ON public.watchlist_items FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Staff can remove from team watchlist"
  ON public.watchlist_items FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));