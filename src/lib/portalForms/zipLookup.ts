import type { Answers } from "./types";

type Places = Record<string, string[]>;
let placesPromise: Promise<Places> | undefined;
export async function lookupZip(value: string): Promise<{ city: string; state: string } | null> {
  const match = value.trim().match(/^(\d{5})(?:-\d{4})?$/);
  if (!match) return null;
  placesPromise ??= import("@/data/zip/usZipPlaces.json").then((module) => module.default as Places);
  const place = (await placesPromise)[match[1]];
  return place ? { city: place[0], state: place[1] } : null;
}

/** Only a ZIP edit fills its own address group. City/state remain editable. */
export function applyZipPlace(answers: Answers, zipKey: string, value: unknown, place: { city: string; state: string } | null): Answers {
  const next = { ...answers, [zipKey]: value };
  if (!place) return next;
  const prefix = zipKey === "camp_zip" ? "camp_" : "";
  return { ...next, [`${prefix}city`]: place.city, [`${prefix}state`]: place.state };
}