export type PasswordSetupLink = "invite" | "recovery" | "invalid";

export function readPasswordSetupLink(url: string): PasswordSetupLink {
  const parsed = new URL(url);
  const hash = new URLSearchParams(parsed.hash.slice(1));
  const get = (key: string) => hash.get(key) ?? parsed.searchParams.get(key);
  if (get("error") || get("error_code") || get("error_description")) return "invalid";
  const type = get("type");
  if ((type === "invite" || type === "recovery") && get("access_token") && get("refresh_token")) return type;
  return "invalid";
}

// Capture only the link kind, never its tokens, before the auth client clears the hash.
export const initialPasswordSetupLink = typeof window === "undefined"
  ? "invalid"
  : readPasswordSetupLink(window.location.href);