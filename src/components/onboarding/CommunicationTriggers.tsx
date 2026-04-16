import { CommStatus } from "@/data/onboardingData";
import { Mail } from "lucide-react";

interface Props {
  comms: CommStatus[];
}

export function CommunicationTriggers({ comms }: Props) {
  return (
    <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
      <h4 className="font-semibold mb-1 text-sm" style={{ color: "#003c7e" }}>Automated Communication Triggers</h4>
      <p className="text-xs mb-3" style={{ color: "#6c757d" }}>
        Emails fire automatically when each step completes.
      </p>
      <div className="space-y-2">
        {comms.map((c) => (
          <div
            key={c.key}
            className="flex items-center gap-3 p-2.5 rounded"
            style={{ backgroundColor: "#f8f9fa" }}
          >
            <div
              className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: c.sent ? "#e6f9f1" : "#fff" }}
            >
              <Mail size={13} style={{ color: c.sent ? "#0f7a5a" : "#6c757d" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{c.name}</div>
              <div className="text-xs" style={{ color: "#6c757d" }}>{c.triggerLabel}</div>
            </div>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: c.sent ? "#20c997" : "#e9ecef",
                color: c.sent ? "#fff" : "#6c757d",
              }}
            >
              {c.sent ? "Sent" : "Pending"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
