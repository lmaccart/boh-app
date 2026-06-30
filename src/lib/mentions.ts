import type { Profile } from "@/api";

export type BodyToken =
  | { kind: "text"; value: string }
  | { kind: "mention"; value: string; userId: string | null };

// Normalize a name for loose @mention matching (lowercase, no spaces).
function normalize(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "");
}

// Split a post/reply body into plain text and @mention tokens. Mentions are
// resolved against known profiles by matching the first name or the full name
// with spaces removed; unmatched mentions render as plain (non-tappable) text.
export function parseBody(body: string, profiles: Profile[]): BodyToken[] {
  const tokens: BodyToken[] = [];
  const regex = /@(\w+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ kind: "text", value: body.slice(lastIndex, match.index) });
    }
    const handle = match[1].toLowerCase();
    const profile =
      profiles.find((p) => p.name && normalize(p.name).startsWith(handle)) ?? null;
    tokens.push({ kind: "mention", value: match[0], userId: profile?.id ?? null });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < body.length) {
    tokens.push({ kind: "text", value: body.slice(lastIndex) });
  }
  return tokens;
}

export function mentionTokenFor(name: string): string {
  return `@${name.trim().split(/\s+/)[0]} `;
}
