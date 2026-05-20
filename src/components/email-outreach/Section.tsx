import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Collapsible workflow section wrapper for Email Outreach.
 * Persists open/closed state in localStorage per `storageKey`.
 */
export function Section({
  step,
  title,
  subtitle,
  storageKey,
  defaultOpen = true,
  right,
  children,
}: {
  step: number;
  title: string;
  subtitle?: string;
  storageKey: string;
  defaultOpen?: boolean;
  right?: ReactNode;
  children: ReactNode;
}) {
  const fullKey = `eo_section_${storageKey}`;
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return defaultOpen;
    const v = localStorage.getItem(fullKey);
    return v === null ? defaultOpen : v === "1";
  });
  useEffect(() => {
    try { localStorage.setItem(fullKey, open ? "1" : "0"); } catch { /* noop */ }
  }, [open, fullKey]);

  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="group flex items-center gap-2 text-left"
          aria-expanded={open}
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#07142f] text-[11px] font-black text-white">
            {step}
          </span>
          <span className="text-[13px] font-black uppercase tracking-wider text-[#07142f]">{title}</span>
          {subtitle && <span className="text-[11px] font-semibold text-[#8794ab]">— {subtitle}</span>}
          <ChevronDown size={14} className={`text-[#526078] transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {right && <div className="ml-auto">{right}</div>}
      </div>
      {open && <div className="space-y-3">{children}</div>}
    </section>
  );
}
