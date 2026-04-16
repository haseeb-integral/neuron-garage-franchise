import { Checkbox } from "@/components/ui/checkbox";

interface Task { id: string; label: string; done: boolean }

interface Props {
  tasks: Task[];
  onToggle: (id: string) => void;
}

export function TaskChecklist({ tasks, onToggle }: Props) {
  const completed = tasks.filter((t) => t.done).length;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold" style={{ color: "#003c7e" }}>Tasks</h4>
        <span className="text-xs" style={{ color: "#6c757d" }}>{completed} / {tasks.length} complete</span>
      </div>
      <div className="space-y-2">
        {tasks.map((t) => (
          <label key={t.id} className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-[#f8f9fa]">
            <Checkbox checked={t.done} onCheckedChange={() => onToggle(t.id)} className="mt-0.5" />
            <span
              className="text-sm flex-1"
              style={{ color: t.done ? "#6c757d" : "#212529", textDecoration: t.done ? "line-through" : "none" }}
            >
              {t.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
