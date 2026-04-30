import { ActivityEvent } from "@/data/onboardingData";
import { MessageSquare, CheckCircle2, Mail, Upload, ListChecks } from "lucide-react";

const iconFor = (type: ActivityEvent["type"]) => {
  if (type === "step_complete") return CheckCircle2;
  if (type === "email_sent") return Mail;
  if (type === "file_upload") return Upload;
  if (type === "task_complete") return ListChecks;
  return MessageSquare;
};

interface Props {
  activity: ActivityEvent[];
}

export function ActivityLog({ activity }: Props) {
  const sorted = [...activity].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return (
    <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
      <h4 className="font-semibold mb-3 text-sm" style={{ color: "#003c7e" }}>Activity Log</h4>
      <div className="space-y-3">
        {sorted.map((a) => {
          const Icon = iconFor(a.type);
          return (
            <div key={a.id} className="flex gap-3 pb-3" style={{ borderBottom: "1px solid #f1f3f5" }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#e7f1ff" }}
              >
                <Icon size={14} style={{ color: "#003c7e" }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{a.author}</span>
                  <span className="text-xs" style={{ color: "#6c757d" }}>{a.timestamp}</span>
                </div>
                <p className="text-sm mt-1">{a.content}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
