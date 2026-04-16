import { TeacherTag } from "@/data/teacherData";

interface Props {
  tag: TeacherTag;
}

const tagStyles: Record<TeacherTag, { bg: string; fg: string }> = {
  "High Potential": { bg: "#d8f5ea", fg: "#0d7a4e" },
  "Follow-Up": { bg: "#fff4d1", fg: "#7a5a00" },
  "Not a Fit": { bg: "#e9ecef", fg: "#6c757d" },
  "Untagged": { bg: "#f1f3f5", fg: "#868e96" },
};

export function TagBadge({ tag }: Props) {
  const s = tagStyles[tag];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      {tag}
    </span>
  );
}
