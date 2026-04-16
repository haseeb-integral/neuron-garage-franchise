import { Clock } from "lucide-react";

interface Props {
  fddSentDate?: string;
}

export function FddCountdown({ fddSentDate }: Props) {
  if (!fddSentDate) {
    return (
      <div className="rounded-lg p-4" style={{ backgroundColor: "#fff8e1", border: "1px solid #ffca28" }}>
        <div className="flex items-center gap-2">
          <Clock size={16} style={{ color: "#b08600" }} />
          <span className="text-sm font-semibold" style={{ color: "#b08600" }}>FDD not yet sent</span>
        </div>
        <p className="text-xs mt-1" style={{ color: "#6c757d" }}>
          Set the FDD Sent Date below to start the mandatory 16-day waiting period.
        </p>
      </div>
    );
  }

  const sent = new Date(fddSentDate);
  const earliest = new Date(sent);
  earliest.setDate(earliest.getDate() + 16);
  const today = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.max(0, Math.ceil((earliest.getTime() - today.getTime()) / msPerDay));
  const isReady = daysRemaining === 0;

  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: isReady ? "#e6f9f1" : "#e7f1ff",
        border: `1px solid ${isReady ? "#20c997" : "#003c7e"}`,
      }}
    >
      <div className="flex items-start gap-3">
        <Clock size={18} style={{ color: isReady ? "#0f7a5a" : "#003c7e" }} className="mt-0.5" />
        <div className="flex-1">
          <h5 className="text-sm font-semibold" style={{ color: isReady ? "#0f7a5a" : "#003c7e" }}>
            16-Day FDD Waiting Period
          </h5>
          <p className="text-xs mt-1" style={{ color: "#495057" }}>
            FDD sent on <strong>{fmt(sent)}</strong> — earliest Step 5 date: <strong>{fmt(earliest)}</strong>
          </p>
          <p className="text-xs mt-2 font-semibold" style={{ color: isReady ? "#0f7a5a" : "#fd7e14" }}>
            {isReady ? "✓ Cooling-off period complete — ready to advance" : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`}
          </p>
        </div>
      </div>
    </div>
  );
}
