/**
 * Strict Camp View — classifies a provider row as a non-camp so headline
 * counts and catch-up scanners only operate on real summer camps. The raw
 * row is never deleted; consumers display it in an "Excluded" section for
 * audit transparency.
 *
 * Returns null when the row IS a real summer camp.
 */
export function classifyExclusion(
  p: any,
): { reason: string; label: string } | null {
  const cat = String(p?.category_classified ?? "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (cat === "childcareexcluded") {
    return { reason: "Baby Daycare / Year-round Childcare", label: "Daycare" };
  }
  const name = String(p?.name ?? "").toLowerCase();
  const isCampish =
    /(camp|academy|school|studio|gym|dance|art|stem|music|tutor|after[- ]?school)/i.test(
      p?.name ?? "",
    );
  if (
    /\b(park|garden|zoo|harbor|harbour|beach|reservation|sanctuary|public\s+library)\b/.test(
      name,
    ) &&
    !isCampish
  ) {
    return { reason: "Public Park / Public Space", label: "Public Space" };
  }
  if (
    /\b(home\s*depot|lowe'?s|michael'?s|apple\s+store|barnes\s*&?\s*noble)\b/.test(
      name,
    )
  ) {
    return { reason: "Free Retail Workshop", label: "Retail Workshop" };
  }
  if (/\bboys\s*&?\s*girls\s+club\b/.test(name)) {
    return { reason: "Free / Charity Drop-in Club", label: "Charity Club" };
  }
  return null;
}
