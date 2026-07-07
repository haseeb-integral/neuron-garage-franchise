// Styling helper for CSI saturation tier labels.
// Tiers are computed relative to demand: bottom 60% = Open, 60-85 = Competitive, top 15% = Saturated.

export type CsiTier = "Open" | "Competitive" | "Saturated";

export function csiTierBadgeClass(tier: string | null | undefined): string {
  switch (tier) {
    case "Open":
      // green — low saturation, high opportunity
      return "text-[10.5px] font-semibold rounded px-1.5 py-0.5 bg-[#e8f6ec] text-[#116b2f]";
    case "Competitive":
      // amber — moderate crowding
      return "text-[10.5px] font-semibold rounded px-1.5 py-0.5 bg-[#fff6dc] text-[#8a6a00]";
    case "Saturated":
      // red — high crowding, low opportunity
      return "text-[10.5px] font-semibold rounded px-1.5 py-0.5 bg-[#fde7e7] text-[#a1201f]";
    default:
      return "text-[10.5px] font-semibold rounded px-1.5 py-0.5 bg-[#eef2f7] text-[#526078]";
  }
}

export function csiTierTextClass(tier: string | null | undefined): string {
  switch (tier) {
    case "Open":
      return "text-[#116b2f] font-medium";
    case "Competitive":
      return "text-[#8a6a00] font-medium";
    case "Saturated":
      return "text-[#a1201f] font-medium";
    default:
      return "text-[#8794ab]";
  }
}
