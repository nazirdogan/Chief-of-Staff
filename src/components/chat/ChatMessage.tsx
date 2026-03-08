'use client';

const c = {
  surface: 'rgba(255,255,255,0.04)',
  surfaceElevated: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
  borderActive: 'rgba(232,132,92,0.25)',
  dawn: '#E8845C',
  dawnLight: '#F09D7A',
  dawnMuted: 'rgba(232,132,92,0.15)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.85)',
  textTertiary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.35)',
  textGhost: 'rgba(255,255,255,0.2)',
  critical: '#D64B2A',
  success: '#52B788',
  info: '#4E7DAA',
};

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMarkdown(text: string): string {
  // Escape HTML
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (```)
  html = html.replace(
    /```(\w*)\n?([\s\S]*?)```/g,
    (_match, _lang, code) =>
      `<pre style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:12px 16px;overflow-x:auto;margin:8px 0;font-size:13px;line-height:1.5"><code>${code.trim()}</code></pre>`
  );

  // Inline code
  html = html.replace(
    /`([^`]+)`/g,
    '<code style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;font-size:13px">$1</code>'
  );

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic (single * not preceded/followed by space at boundaries)
  html = html.replace(
    /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,
    '<em>$1</em>'
  );

  // Split into paragraphs on double newlines
  const blocks = html.split(/\n\n+/);

  const rendered = blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';

      // Already a pre block
      if (trimmed.startsWith('<pre')) return trimmed;

      // Check if block is a list (all lines start with - or * or digits.)
      const lines = trimmed.split('\n');
      const isBulletList = lines.every(
        (l) => /^\s*[-*]\s/.test(l) || l.trim() === ''
      );
      const isNumberedList = lines.every(
        (l) => /^\s*\d+\.\s/.test(l) || l.trim() === ''
      );

      if (isBulletList) {
        const items = lines
          .filter((l) => l.trim())
          .map((l) => `<li style="margin:2px 0">${l.replace(/^\s*[-*]\s/, '')}</li>`)
          .join('');
        return `<ul style="margin:6px 0;padding-left:20px;list-style:disc">${items}</ul>`;
      }

      if (isNumberedList) {
        const items = lines
          .filter((l) => l.trim())
          .map((l) => `<li style="margin:2px 0">${l.replace(/^\s*\d+\.\s/, '')}</li>`)
          .join('');
        return `<ol style="margin:6px 0;padding-left:20px;list-style:decimal">${items}</ol>`;
      }

      // Regular paragraph — convert single newlines to <br>
      return `<p style="margin:0">${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .filter(Boolean)
    .join('<div style="height:8px"></div>');

  return rendered;
}

interface ChatMessageProps {
  message: ChatMessageData;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[66%]">
          <div
            className="rounded-xl rounded-br-sm px-4 py-3 text-[15px] leading-relaxed"
            style={{
              background: c.dawnMuted,
              border: `1px solid ${c.borderActive}`,
              color: c.text,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {message.content}
          </div>
          <p
            className="mt-1 text-right text-[11px]"
            style={{ color: c.textMuted }}
          >
            {formatTimestamp(message.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="w-full">
        <div
          className="pl-4 text-[15px] leading-relaxed"
          style={{
            borderLeft: `2px solid ${c.borderActive}`,
            color: c.textSecondary,
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
        />
        <p
          className="mt-1 pl-4 text-[11px]"
          style={{ color: c.textMuted }}
        >
          {formatTimestamp(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
