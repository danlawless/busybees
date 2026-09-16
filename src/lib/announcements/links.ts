/**
 * Announcement messages may carry links written as [text](/path) or
 * [text](https://...). Anything else in that shape is left as typed, so a
 * stray bracket cannot turn into a link to somewhere we do not control.
 */

export type AnnouncementSegment =
  | { kind: 'text'; text: string }
  | { kind: 'link'; text: string; href: string };

const LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g;

function isSafeHref(href: string): boolean {
  return (href.startsWith('/') && !href.startsWith('//')) || href.startsWith('https://');
}

export function parseAnnouncementLinks(message: string): AnnouncementSegment[] {
  const segments: AnnouncementSegment[] = [];
  let lastIndex = 0;

  for (const match of message.matchAll(LINK_PATTERN)) {
    const [whole, text, href] = match;
    const start = match.index ?? 0;
    if (!isSafeHref(href)) continue;

    if (start > lastIndex) segments.push({ kind: 'text', text: message.slice(lastIndex, start) });
    segments.push({ kind: 'link', text, href });
    lastIndex = start + whole.length;
  }

  if (lastIndex < message.length) segments.push({ kind: 'text', text: message.slice(lastIndex) });
  return segments;
}
