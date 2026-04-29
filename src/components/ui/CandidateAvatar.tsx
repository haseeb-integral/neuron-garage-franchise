import { useState } from "react";

interface Props {
  name: string;
  photoUrl?: string;
  size?: number;
  title?: string;
  className?: string;
}

// Navy / teal / slate palette only — avoids red/green which signal status.
const PALETTE = [
  "#003c7e",
  "#0d4f8b",
  "#1a5fa3",
  "#17506b",
  "#1f6f8b",
  "#2c7a7b",
  "#274060",
  "#3b5998",
  "#4a6fa5",
  "#475569",
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
  const bg = colorFor(name);
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
        <span className="font-bold text-white" style={{ fontSize, lineHeight: 1 }}>
          {initials}
        </span>
      )}
    </div>
  );
}
