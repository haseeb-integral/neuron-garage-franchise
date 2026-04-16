const tierColors: Record<string, string> = {
  A: '#20c997',
  B: '#4ba0ff',
  C: '#ffca28',
  D: '#fd7e14',
};

export function TierBadge({ tier }: { tier: string }) {
  return (
    <span
      className="inline-flex items-center justify-center text-xs font-bold rounded-full text-white"
      style={{ backgroundColor: tierColors[tier], width: 28, height: 28 }}
    >
      {tier}
    </span>
  );
}
