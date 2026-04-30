import { useState } from "react";
import { CommStatus } from "@/data/onboardingData";
import { Mail, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  comms: CommStatus[];
}

export function CommunicationTriggers({ comms }: Props) {
  const [open, setOpen] = useState(false);
  const sentCount = comms.filter((c) => c.sent).length;
  const total = comms.length;

  return (
    <div className="bg-white rounded-lg" style={{ border: "1px solid #dee2e6" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-[#f8f9fa] rounded-lg"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Mail size={14} style={{ color: "#003c7e" }} />
          <span className="text-sm font-semibold truncate" style={{ color: "#003c7e" }}>
            Automated Emails
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#e9ecef", color: "#495057" }}>
            {sentCount}/{total} sent
          </span>
        </div>
        {open ? (
          <ChevronDown size={14} style={{ color: "#6c757d" }} />
        ) : (
          <ChevronRight size={14} style={{ color: "#6c757d" }} />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-1.5 border-t" style={{ borderColor: "#f1f3f5" }}>
          <p className="text-xs pt-2" style={{ color: "#6c757d" }}>
            These will fire automatically when each step completes (wiring coming later).
          </p>
          {comms.map((c) => (
            <div key={c.key} className="flex items-center gap-2 py-1.5 text-xs">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: c.sent ? "#20c997" : "#ced4da" }}
              />
              <span className="flex-1 min-w-0 truncate" style={{ color: c.sent ? "#212529" : "#6c757d" }}>
                {c.name}
              </span>
              <span style={{ color: "#adb5bd" }}>{c.triggerLabel}</span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                style={{
                  backgroundColor: c.sent ? "#e6f9f1" : "#f8f9fa",
                  color: c.sent ? "#0f7a5a" : "#6c757d",
                }}
              >
                {c.sent ? "Sent" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
