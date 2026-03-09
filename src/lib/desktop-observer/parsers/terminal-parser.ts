import type { AppParser, DesktopContextSnapshot, ParsedScreenContent } from './types';
import { redactPII } from '@/lib/ai/safety/sanitise';

const SHELL_PROMPT_RE = /^[\w@.~/-]*[%$#>]\s*/;
const PATH_RE = /(?:\/[\w.-]+){2,}/;

function parseTerminalContent(texts: string[]): {
  commands: string[];
  currentDirectory: string | null;
  activeProcess: string | null;
} {
  const commands: string[] = [];
  let currentDirectory: string | null = null;
  let activeProcess: string | null = null;

  for (const text of texts) {
    // Detect shell prompts to extract commands
    if (SHELL_PROMPT_RE.test(text)) {
      const cmd = text.replace(SHELL_PROMPT_RE, '').trim();
      if (cmd.length > 0 && cmd.length < 500) {
        commands.push(cmd);
      }

      // Extract directory from prompt
      const pathMatch = text.match(PATH_RE);
      if (pathMatch) currentDirectory = pathMatch[0];
    }

    // Detect running processes
    if (/^\s*running|watching|listening|serving/i.test(text)) {
      activeProcess = text.trim().slice(0, 100);
    }
  }

  return {
    commands: commands.slice(-15),
    currentDirectory,
    activeProcess,
  };
}

function extractProjectFromDir(dir: string | null, windowTitle: string): string | null {
  if (dir) {
    // Last meaningful directory segment
    const segments = dir.split('/').filter(Boolean);
    // Skip common non-project dirs
    const skip = ['src', 'lib', 'app', 'components', 'Users', 'home', 'Documents', 'Desktop'];
    for (let i = segments.length - 1; i >= 0; i--) {
      if (!skip.includes(segments[i])) return segments[i];
    }
  }

  // Try window title
  const titleMatch = windowTitle.match(/(?:—|–|-)\s*(.+?)(?:\s*—|$)/);
  return titleMatch ? titleMatch[1].trim() : null;
}

export const terminalParser: AppParser = {
  name: 'terminal',

  match(ctx: DesktopContextSnapshot): boolean {
    const app = ctx.active_app.toLowerCase();
    const terminalApps = ['terminal', 'iterm', 'warp', 'alacritty', 'kitty', 'hyper', 'rio'];
    return terminalApps.some(a => app.includes(a));
  },

  parse(ctx: DesktopContextSnapshot): ParsedScreenContent {
    const { commands, currentDirectory, activeProcess } = parseTerminalContent(ctx.visible_text);
    const project = extractProjectFromDir(currentDirectory, ctx.window_title);

    const parts: string[] = [];
    if (project) parts.push(`Project: ${project}`);
    if (currentDirectory) parts.push(`Directory: ${currentDirectory}`);
    if (activeProcess) parts.push(`Running: ${activeProcess}`);
    if (commands.length > 0) parts.push(`Recent commands:\n${commands.map(c => `$ ${c}`).join('\n')}`);

    return {
      appCategory: 'terminal',
      structuredData: {
        terminal: ctx.active_app,
        currentDirectory,
        project,
        activeProcess: activeProcess ? redactPII(activeProcess) : null,
        recentCommands: commands.map(cmd => redactPII(cmd)),
      },
      rawText: `[Terminal: ${ctx.active_app}]\n${parts.join('\n')}`,
      people: [],
      actionItems: [],
      confidence: commands.length > 0 ? 0.7 : 0.3,
    };
  },
};
