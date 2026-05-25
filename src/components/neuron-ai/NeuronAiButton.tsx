import { Sparkles } from "lucide-react";
import { useNeuronAi } from "./NeuronAiProvider";
import { useSidebarCollapsed } from "@/lib/sidebarState";

// Lives in the sidebar header next to the collapse chevron. Sparkle pill when
// expanded, sparkle-only square when collapsed. Click → opens the panel.
// Keyboard hint shown on hover (⌘K / Ctrl+K).
export function NeuronAiButton() {
  const { setOpen } = useNeuronAi();
  const [collapsed] = useSidebarCollapsed();
  const shortcut = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform) ? "⌘K" : "Ctrl+K";

  if (collapsed) {
    return (
      <button
        onClick={() => setOpen(true)}
        title={`Neuron AI (${shortcut})`}
        aria-label="Open Neuron AI"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-[#d6cdf5] bg-gradient-to-br from-[#f4f0ff] to-[#eaf0ff] text-[#7c3aed] shadow-[0_4px_10px_rgba(124,58,237,0.12)] hover:from-[#ede4ff] hover:to-[#dde7ff]"
      >
        <Sparkles size={15} />
      </button>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      title={`Neuron AI (${shortcut})`}
      aria-label="Open Neuron AI"
      className="group flex h-8 flex-shrink-0 items-center gap-1.5 rounded-xl border border-[#d6cdf5] bg-gradient-to-r from-[#f4f0ff] to-[#eaf0ff] px-2.5 text-[#5b3fbf] shadow-[0_4px_10px_rgba(124,58,237,0.12)] hover:from-[#ede4ff] hover:to-[#dde7ff]"
    >
      <Sparkles size={14} className="text-[#7c3aed]" />
      <span className="text-[11px] font-bold tracking-wide">Neuron AI</span>
      <span className="ml-1 hidden text-[9px] font-mono text-[#8b7fbf] group-hover:inline">{shortcut}</span>
    </button>
  );
}
