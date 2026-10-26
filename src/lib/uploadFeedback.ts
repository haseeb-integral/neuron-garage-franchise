import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** How long the success pop-up stays up (default sonner is ~4s — too easy to miss). */
export const UPLOAD_TOAST_MS = 8000;
/** How long a freshly uploaded row stays highlighted in the list. */
export const UPLOAD_FLASH_MS = 6000;

/**
 * One shared "your file landed" pop-up for every upload surface, so staff and
 * prospects always see the same clear confirmation naming the actual files.
 */
export function toastUploadSuccess(title: string, names: string[], description?: string) {
  const shown = names.slice(0, 3).join(", ");
  const more = names.length > 3 ? ` +${names.length - 3} more` : "";
  const desc = [shown ? `${shown}${more}` : "", description ?? ""].filter(Boolean).join(" · ");
  toast.success(title, {
    description: desc || undefined,
    duration: UPLOAD_TOAST_MS,
    richColors: true,
  });
}

/**
 * Remembers the keys (file paths or names) that just landed so the list right
 * below the button can highlight them for a few seconds. Cleared automatically.
 */
export function useUploadFlash(ms: number = UPLOAD_FLASH_MS) {
  const [flashed, setFlashed] = useState<Set<string>>(() => new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const flash = useCallback((keys: string[]) => {
    setFlashed(new Set(keys));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlashed(new Set()), ms);
  }, [ms]);

  const isFlashed = useCallback((key: string) => flashed.has(key), [flashed]);

  return { flashed, flash, isFlashed };
}
