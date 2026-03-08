const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&apos;': "'",
  '&#x2F;': '/',
  '&nbsp;': ' ',
  '&#8217;': '\u2019',
  '&#8216;': '\u2018',
  '&#8220;': '\u201C',
  '&#8221;': '\u201D',
  '&#8211;': '\u2013',
  '&#8212;': '\u2014',
  '&#8230;': '\u2026',
};

const ENTITY_REGEX = /&(?:#(?:x[0-9a-fA-F]+|\d+)|[a-zA-Z]+);/g;

export function decodeEntities(text: string): string {
  if (!text) return text;
  return text.replace(ENTITY_REGEX, (match) => {
    if (ENTITY_MAP[match]) return ENTITY_MAP[match];
    // Handle numeric entities not in the map
    if (match.startsWith('&#x')) {
      const code = parseInt(match.slice(3, -1), 16);
      return String.fromCodePoint(code);
    }
    if (match.startsWith('&#')) {
      const code = parseInt(match.slice(2, -1), 10);
      return String.fromCodePoint(code);
    }
    return match;
  });
}
