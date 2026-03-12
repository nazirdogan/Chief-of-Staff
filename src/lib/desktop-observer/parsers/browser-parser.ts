import type { AppParser, DesktopContextSnapshot, ParsedScreenContent } from './types';
import { redactPII, sanitiseUrl } from '@/lib/ai/safety/sanitise';

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return null;
  }
}

// ── Known tool domains that get richer extraction ────────────────────
const KNOWN_TOOL_DOMAINS: Record<string, string> = {
  'notion.so': 'notion',
  'notion.site': 'notion',
  'linear.app': 'linear',
  'github.com': 'github',
  'mail.google.com': 'gmail',
  'docs.google.com': 'google_docs',
  'sheets.google.com': 'google_sheets',
  'slides.google.com': 'google_slides',
  'drive.google.com': 'google_drive',
  'figma.com': 'figma',
  'jira.atlassian.net': 'jira',
  'trello.com': 'trello',
  'slack.com': 'slack',
  'asana.com': 'asana',
  'clickup.com': 'clickup',
  'vercel.com': 'vercel',
  'supabase.com': 'supabase',
};

function identifyKnownTool(domain: string | null): string | null {
  if (!domain) return null;
  // Direct match
  if (KNOWN_TOOL_DOMAINS[domain]) return KNOWN_TOOL_DOMAINS[domain];
  // Subdomain match (e.g. "myteam.atlassian.net" → check "atlassian.net")
  for (const [key, tool] of Object.entries(KNOWN_TOOL_DOMAINS)) {
    if (domain.endsWith('.' + key) || domain === key) return tool;
  }
  return null;
}

function classifyBrowsingContent(url: string | null, title: string, _texts: string[]): {
  contentType: string;
  topic: string | null;
} {
  const domain = url ? extractDomain(url) : null;
  const titleLower = title.toLowerCase();

  // Known tools get their own content type
  const knownTool = identifyKnownTool(domain);
  if (knownTool) {
    return { contentType: `tool:${knownTool}`, topic: knownTool };
  }

  // Research/documentation
  if (domain?.includes('stackoverflow') || domain?.includes('github.com') || domain?.includes('docs.') || domain?.includes('developer.')) {
    return { contentType: 'documentation', topic: 'technical research' };
  }

  // News/articles
  if (domain?.includes('medium.com') || domain?.includes('substack') || domain?.includes('news') || titleLower.includes('article')) {
    return { contentType: 'article', topic: null };
  }

  // Social media
  if (domain?.includes('twitter.com') || domain?.includes('x.com') || domain?.includes('linkedin.com') || domain?.includes('reddit.com')) {
    return { contentType: 'social', topic: null };
  }

  // Shopping
  if (domain?.includes('amazon') || domain?.includes('shop') || titleLower.includes('cart') || titleLower.includes('checkout')) {
    return { contentType: 'shopping', topic: null };
  }

  // Video
  if (domain?.includes('youtube.com') || domain?.includes('vimeo.com') || domain?.includes('netflix.com')) {
    return { contentType: 'video', topic: null };
  }

  return { contentType: 'general', topic: null };
}

function extractKeyContent(texts: string[]): string {
  // Filter out nav/UI elements, keep substantial content
  const content = texts.filter(t => {
    if (t.length < 5 || t.length > 1000) return false;
    // Skip common nav items
    if (/^(Home|About|Contact|Login|Sign|Menu|Search|Close|Back|Next|Previous|Share|Save|Print|Follow|Subscribe)$/i.test(t)) {
      return false;
    }
    return true;
  });

  // Headings (shorter, capitalized) and body (longer paragraphs)
  const headings = content.filter(t => t.length < 80 && t.length > 10);
  const body = content.filter(t => t.length >= 80);

  const parts: string[] = [];
  if (headings.length > 0) parts.push(headings.slice(0, 3).join('\n'));
  if (body.length > 0) parts.push(body.slice(0, 3).join('\n'));

  return parts.join('\n\n').slice(0, 800);
}

/**
 * Richer extraction for known tool domains.
 * Extracts page headings, key paragraphs (first 500 chars), and embedded links.
 */
function extractKnownToolContent(texts: string[], ocrTexts: string[]): {
  pageHeadings: string[];
  keyParagraphs: string;
  embeddedLinks: string[];
} {
  // Combine visible text and OCR for richer extraction
  const allTexts = [...texts, ...ocrTexts];

  // Extract headings: shorter text (10-120 chars) that isn't navigation
  const headings = allTexts.filter(t => {
    if (t.length < 10 || t.length > 120) return false;
    if (/^(Home|About|Contact|Login|Sign|Menu|Search|Close|Back|Next|Previous|Share|Save|Print|Follow|Subscribe|Settings|Profile|Notifications?)$/i.test(t)) {
      return false;
    }
    // Headings tend to be title-cased or all-caps, or start with a hash
    const hasUpperStart = /^[A-Z#]/.test(t);
    const isShort = t.length < 80;
    return hasUpperStart && isShort;
  });

  // Extract body paragraphs: longer text blocks
  const paragraphs = allTexts
    .filter(t => t.length >= 40 && t.length <= 2000)
    .filter(t => {
      // Skip nav/UI-like content
      if (/^(Home|About|Contact|Login|Sign|Menu|Search|Close|Back|Next)$/i.test(t.trim())) return false;
      return true;
    });

  const keyParagraphs = paragraphs.slice(0, 5).join('\n').slice(0, 500);

  // Extract URLs from visible text (things that look like links)
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  const links = new Set<string>();
  for (const t of allTexts) {
    const matches = t.match(urlPattern);
    if (matches) {
      for (const m of matches.slice(0, 10)) {
        links.add(m);
      }
    }
    if (links.size >= 20) break;
  }

  return {
    pageHeadings: [...new Set(headings)].slice(0, 8),
    keyParagraphs,
    embeddedLinks: [...links].slice(0, 15),
  };
}

export const browserParser: AppParser = {
  name: 'browser',

  match(ctx: DesktopContextSnapshot): boolean {
    const app = ctx.active_app.toLowerCase();
    const browsers = ['safari', 'chrome', 'firefox', 'arc', 'brave', 'edge', 'opera', 'vivaldi'];
    return browsers.some(b => app.includes(b));
  },

  parse(ctx: DesktopContextSnapshot): ParsedScreenContent {
    const domain = ctx.url ? extractDomain(ctx.url) : null;
    const { contentType, topic } = classifyBrowsingContent(ctx.url, ctx.window_title, ctx.visible_text);
    const keyContent = extractKeyContent(ctx.visible_text);

    // Extract page title (often in window title before " - Browser Name")
    const pageTitle = ctx.window_title
      .replace(/\s*[—–-]\s*(Safari|Chrome|Firefox|Arc|Brave|Edge|Opera|Vivaldi|Google Chrome)$/i, '')
      .trim();

    const knownTool = identifyKnownTool(domain);
    const ocrTexts = ctx.ocr_text ?? [];

    // Richer extraction for known tools
    const richContent = knownTool
      ? extractKnownToolContent(ctx.visible_text, ocrTexts)
      : null;

    // Build rawText with richer content for known tools
    const rawParts = [
      `[Browser: ${redactPII(pageTitle)}]`,
      `URL: ${sanitiseUrl(ctx.url) ?? 'unknown'}`,
    ];
    if (knownTool) rawParts.push(`Tool: ${knownTool}`);
    if (richContent?.pageHeadings.length) {
      rawParts.push(`Headings: ${richContent.pageHeadings.map(h => redactPII(h)).join(' | ')}`);
    }
    rawParts.push(redactPII(richContent?.keyParagraphs || keyContent));

    return {
      appCategory: 'browser',
      structuredData: {
        url: sanitiseUrl(ctx.url),
        domain,
        pageTitle: redactPII(pageTitle),
        contentType,
        topic,
        keyContent: redactPII(keyContent),
        // Known tool enrichment
        ...(knownTool ? { knownTool } : {}),
        ...(richContent ? {
          pageHeadings: richContent.pageHeadings.map(h => redactPII(h)),
          keyParagraphs: redactPII(richContent.keyParagraphs),
          embeddedLinks: richContent.embeddedLinks.map(l => sanitiseUrl(l)).filter(Boolean),
        } : {}),
        // OCR lines (always include if available)
        ...(ocrTexts.length > 0 ? {
          ocrLines: ocrTexts.slice(0, 30).map(l => redactPII(l)),
        } : {}),
      },
      rawText: rawParts.join('\n'),
      people: [],
      actionItems: [],
      confidence: ctx.url ? (knownTool ? 0.85 : 0.7) : 0.3,
    };
  },
};
