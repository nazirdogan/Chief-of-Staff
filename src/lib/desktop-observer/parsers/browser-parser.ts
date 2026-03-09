import type { AppParser, DesktopContextSnapshot, ParsedScreenContent } from './types';
import { redactPII, sanitiseUrl } from '@/lib/ai/safety/sanitise';

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return null;
  }
}

function classifyBrowsingContent(url: string | null, title: string, _texts: string[]): {
  contentType: string;
  topic: string | null;
} {
  const domain = url ? extractDomain(url) : null;
  const titleLower = title.toLowerCase();

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

    return {
      appCategory: 'browser',
      structuredData: {
        url: sanitiseUrl(ctx.url),
        domain,
        pageTitle: redactPII(pageTitle),
        contentType,
        topic,
        keyContent: redactPII(keyContent),
      },
      rawText: `[Browser: ${redactPII(pageTitle)}]\nURL: ${sanitiseUrl(ctx.url) ?? 'unknown'}\n${redactPII(keyContent)}`,
      people: [],
      actionItems: [],
      confidence: ctx.url ? 0.7 : 0.3,
    };
  },
};
