/**
 * Convert markdown to plain spoken text for TTS.
 * Removes bold/italic markers (**, __, *, _), heading hashes (#),
 * inline code backticks, code fences, blockquote markers, list bullets,
 * link/image syntax, and horizontal rules — so the voice never says "star" or "hash".
 */
export function stripMarkdownForSpeech(input: string): string {
  if (!input) return "";
  let s = input;

  // Strip fenced code blocks entirely
  s = s.replace(/```[\s\S]*?```/g, " ");
  // Inline code: keep the inner text
  s = s.replace(/`([^`]+)`/g, "$1");
  // Images: ![alt](url) -> alt
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Links: [text](url) -> text
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  // Bold/italic markers (handle ***, **, __, *, _) — keep inner text
  s = s.replace(/(\*\*\*|___)(.*?)\1/g, "$2");
  s = s.replace(/(\*\*|__)(.*?)\1/g, "$2");
  s = s.replace(/(?<!\w)([*_])(?=\S)(.+?)(?<=\S)\1(?!\w)/g, "$2");
  // Headings (#, ##, ### at line start)
  s = s.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  // Blockquotes
  s = s.replace(/^\s{0,3}>\s?/gm, "");
  // Unordered list bullets
  s = s.replace(/^\s*[-*+]\s+/gm, "");
  // Ordered list numbers
  s = s.replace(/^\s*\d+\.\s+/gm, "");
  // Horizontal rules
  s = s.replace(/^\s*([-*_])\1{2,}\s*$/gm, "");
  // Tables: drop pipes
  s = s.replace(/\|/g, " ");
  // Stray leftover asterisks / underscores / backticks
  s = s.replace(/[*_`]+/g, "");
  // Collapse whitespace
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ");
  return s.trim();
}
