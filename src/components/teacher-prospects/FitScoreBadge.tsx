interface Props {
  score: number | null | undefined;
}

export function FitScoreBadge({ score }: Props) {
  if (score == null) {
    return (
      <span
        className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold min-w-[40px]"
        style={{ backgroundColor: "#eef2f7", color: "#8794ab" }}
        title="Not yet scored"
      >
        —
      </span>
    );
  }
  const bg = score >= 80 ? "#20c997" : score >= 50 ? "#ffca28" : "#ff4438";
  const fg = score >= 50 && score < 80 ? "#7a5a00" : "#ffffff";
  return (
    <span
      className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold min-w-[40px]"
      style={{ backgroundColor: bg, color: fg }}
    >
      {score}
    </span>
  );
}
