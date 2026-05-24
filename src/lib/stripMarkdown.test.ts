import { describe, expect, it } from "vitest";
import { stripMarkdownForSpeech } from "./stripMarkdown";

describe("stripMarkdownForSpeech", () => {
  it("strips bold markers and keeps inner text", () => {
    const out = stripMarkdownForSpeech("This is **bold** text.");
    expect(out).toBe("This is bold text.");
    expect(out).not.toContain("**");
  });

  it("strips italic markers and keeps inner text", () => {
    const out = stripMarkdownForSpeech("This is *italic* and _also italic_.");
    expect(out).toBe("This is italic and also italic.");
    expect(out).not.toContain("*");
    expect(out).not.toContain("_");
  });

  it("strips bold-italic (triple) markers", () => {
    const out = stripMarkdownForSpeech("This is ***really bold*** text.");
    expect(out).toBe("This is really bold text.");
    expect(out).not.toContain("*");
  });

  it("strips heading hashes (#, ##, ###) at line start", () => {
    const input = "## Section Title\n### Sub-section\n# Main Title";
    const out = stripMarkdownForSpeech(input);
    expect(out).toBe("Section Title\nSub-section\nMain Title");
    expect(out).not.toContain("#");
  });

  it("does NOT strip # symbols mid-line (e.g. hashtags)", () => {
    const input = "Follow #neuron on social.";
    const out = stripMarkdownForSpeech(input);
    expect(out).toBe("Follow #neuron on social.");
  });

  it("strips inline code backticks but keeps inner text", () => {
    const out = stripMarkdownForSpeech("Use `console.log()` here.");
    expect(out).toBe("Use console.log() here.");
    expect(out).not.toContain("`");
  });

  it("strips fenced code blocks entirely", () => {
    const input = "See code:\n```js\nconst x = 1;\n```\nDone.";
    const out = stripMarkdownForSpeech(input);
    expect(out).not.toContain("```");
    expect(out).not.toContain("const x = 1");
    expect(out).toMatch(/See code:.*Done\./s);
  });

  it("strips link syntax, keeping link text only", () => {
    const out = stripMarkdownForSpeech("Visit [Google](https://google.com) now.");
    expect(out).toBe("Visit Google now.");
    expect(out).not.toContain("[");
    expect(out).not.toContain("]");
  });

  it("strips image syntax, keeping alt text", () => {
    const out = stripMarkdownForSpeech("![A cat photo](https://cats.com/cat.jpg) Cute!");
    expect(out).toBe("A cat photo Cute!");
    expect(out).not.toContain("!");
    expect(out).not.toContain("[");
  });

  it("strips blockquote markers", () => {
    const input = "> Quote line 1\n> Quote line 2";
    const out = stripMarkdownForSpeech(input);
    expect(out).toBe("Quote line 1\nQuote line 2");
    expect(out).not.toContain(">");
  });

  it("strips unordered list bullets", () => {
    const input = "- Item A\n* Item B\n+ Item C";
    const out = stripMarkdownForSpeech(input);
    expect(out).toBe("Item A\nItem B\nItem C");
    expect(out).not.toContain("-");
  });

  it("strips ordered list numbers", () => {
    const input = "1. First\n22. Second\n3. Third";
    const out = stripMarkdownForSpeech(input);
    expect(out).toBe("First\nSecond\nThird");
    expect(out).not.toMatch(/^\d+\./m);
  });

  it("strips horizontal rules", () => {
    const input = "Before\n---\nAfter";
    const out = stripMarkdownForSpeech(input);
    expect(out).toBe("Before\nAfter");
    expect(out).not.toContain("---");
  });

  it("strips table pipes", () => {
    const input = "| Col A | Col B |\n|-------|-------|\n| 1     | 2     |";
    const out = stripMarkdownForSpeech(input);
    expect(out).not.toContain("|");
    expect(out).toContain("Col A");
    expect(out).toContain("2");
  });

  it("removes stray leftover asterisks, underscores, backticks", () => {
    const out = stripMarkdownForSpeech("Unmatched * and _ and ` symbols");
    expect(out).toBe("Unmatched and and symbols");
    expect(out).not.toContain("*");
    expect(out).not.toContain("_");
    expect(out).not.toContain("`");
  });

  it("handles complex mixed markdown", () => {
    const input = `
# Welcome

This is **bold** and *italic* and ***bold-italic***.

## Features

- Feature one
- Feature two with \`code\`

> A wise quote.

Visit [our site](https://example.com) for more.

---

| Name | Score |
|------|-------|
| Bob  | 95    |
`;
    const out = stripMarkdownForSpeech(input);
    expect(out).not.toContain("**");
    expect(out).not.toContain("*");
    expect(out).not.toContain("##");
    expect(out).not.toContain("#");
    expect(out).not.toContain("`");
    expect(out).not.toContain("|");
    expect(out).not.toContain("[");
    expect(out).not.toContain("]");
    expect(out).not.toContain("---");
    expect(out).not.toContain(">");
    expect(out).toContain("Welcome");
    expect(out).toContain("bold");
    expect(out).toContain("italic");
    expect(out).toContain("bold-italic");
    expect(out).toContain("Feature one");
    expect(out).toContain("our site");
    expect(out).toContain("Bob");
  });

  it("handles empty and null-ish input", () => {
    expect(stripMarkdownForSpeech("")).toBe("");
    expect(stripMarkdownForSpeech("   ")).toBe("");
  });

  it("collapses excessive whitespace", () => {
    const out = stripMarkdownForSpeech("Word1    Word2\n\n\n\nWord3");
    expect(out).toBe("Word1 Word2\n\nWord3");
  });

  it("handles markdown adjacent to punctuation without swallowing it", () => {
    const out = stripMarkdownForSpeech("Amazing**ly** fast.");
    expect(out).not.toContain("**");
    expect(out).toContain("Amazingly");
    expect(out).toContain("fast.");
  });
});
