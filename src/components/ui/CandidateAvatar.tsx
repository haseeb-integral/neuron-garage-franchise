import { useState } from "react";

interface Props {
  name: string;
  photoUrl?: string;
  size?: number;
  title?: string;
  className?: string;
}

// Soft tinted pairs (bg + text), Linear/Notion/Vercel pattern.
const PALETTE: Array<{ bg: string; fg: string }> = [
  { bg: "#dbeafe", fg: "#1d4ed8" },
  { bg: "#e0e7ff", fg: "#4338ca" },
  { bg: "#cffafe", fg: "#0e7490" },
  { bg: "#ccfbf1", fg: "#0f766e" },
  { bg: "#dcfce7", fg: "#15803d" },
  { bg: "#fef3c7", fg: "#a16207" },
  { bg: "#fee2e2", fg: "#b91c1c" },
  { bg: "#fce7f3", fg: "#be185d" },
  { bg: "#ede9fe", fg: "#6d28d9" },
  { bg: "#f1f5f9", fg: "#475569" },
];

const initialsFor = (name: string) => {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
};

const colorFor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

export function CandidateAvatar({ name, photoUrl, size = 40, title, className = "" }: Props) {
  const [errored, setErrored] = useState(false);
  const showPhoto = !!photoUrl && !errored;
  const { bg, fg } = colorFor(name);
  const initials = initialsFor(name);
  const fontSize = Math.max(9, Math.round(size * 0.4));

  return (
    <div
      className={`rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden select-none ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: showPhoto ? "transparent" : bg,
      }}
      title={title ?? name}
      aria-label={title ?? name}
    >
      {showPhoto ? (
        <img
          src={photoUrl}
          alt={name}
          onError={() => setErrored(true)}
          className="w-full h-full object-cover"
          style={{ borderRadius: "50%" }}
        />
      ) : (
        <span className="font-semibold" style={{ fontSize, lineHeight: 1, color: fg }}>
          {initials}
        </span>
      )}
    </div>
  );
}
