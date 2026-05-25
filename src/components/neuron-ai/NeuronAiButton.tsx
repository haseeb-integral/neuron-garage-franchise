import { Sparkles } from "lucide-react";
import { useNeuronAi } from "./NeuronAiProvider";

// Pill button — sparkle + "Neuron AI" + ⌘K hint. Designed to sit on a
// white app header (e.g. City Search top bar). The ⌘K shortcut also
// opens the panel globally.
export function NeuronAiButton({ compact = false }: { compact?: boolean }) {
  const { setOpen } = useNeuronAi();
  const shortcut = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform) ? "⌘K" : "Ctrl+K";

  if (compact) {
    return (
      <button
        onClick={() => setOpen(true)}
        title={`Neuron AI (${shortcut})`}
        aria-label="Open Neuron AI"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e0d6ff] bg-gradient-to-br from-[#f4f0ff] to-[#eaf0ff] text-[#7c3aed] transition-all hover:from-[#ede4ff] hover:to-[#dde7ff] hover:shadow-[0_2px_8px_rgba(124,58,237,0.18)]"
      >
        <Sparkles size={16} />
      </button>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      title={`Neuron AI (${shortcut})`}
      aria-label="Open Neuron AI"
      className="group flex h-10 items-center gap-2 rounded-full border border-[#e0d6ff] bg-gradient-to-r from-[#f4f0ff] via-[#efeaff] to-[#eaf0ff] px-3.5 text-[#5b3fbf] transition-all hover:from-[#ede4ff] hover:to-[#dde7ff] hover:shadow-[0_2px_10px_rgba(124,58,237,0.18)]"
    >
      <Sparkles size={15} className="text-[#7c3aed]" />
      <span className="text-[13px] font-semibold tracking-tight">Neuron AI</span>
      <kbd className="ml-1 hidden rounded border border-[#d6cdf5] bg-white/70 px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#7c6bbf] md:inline">{shortcut}</kbd>
    </button>
  );
}
