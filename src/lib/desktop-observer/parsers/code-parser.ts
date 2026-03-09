import type { AppParser, DesktopContextSnapshot, ParsedScreenContent } from './types';

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript', '.jsx': 'javascript',
  '.py': 'python', '.rs': 'rust', '.go': 'go', '.rb': 'ruby', '.java': 'java',
  '.swift': 'swift', '.kt': 'kotlin', '.cpp': 'cpp', '.c': 'c', '.cs': 'csharp',
  '.html': 'html', '.css': 'css', '.scss': 'scss', '.sql': 'sql', '.sh': 'bash',
  '.yaml': 'yaml', '.yml': 'yaml', '.json': 'json', '.md': 'markdown',
  '.vue': 'vue', '.svelte': 'svelte', '.php': 'php', '.dart': 'dart',
};

function parseEditorTitle(windowTitle: string, appName: string): {
  fileName: string | null;
  projectName: string | null;
  language: string | null;
} {
  const app = appName.toLowerCase();

  // VS Code / Cursor: "filename.ts — project-name — Visual Studio Code"
  // or "filename.ts — project-name — Cursor"
  if (app.includes('code') || app.includes('cursor')) {
    const parts = windowTitle.split(/\s*[—–-]\s*/);
    const fileName = parts[0]?.trim() || null;
    const projectName = parts.length >= 3 ? parts[1]?.trim() : null;

    let language: string | null = null;
    if (fileName) {
      const ext = '.' + fileName.split('.').pop()?.toLowerCase();
      language = LANGUAGE_EXTENSIONS[ext] ?? null;
    }

    return { fileName, projectName, language };
  }

  // Xcode: "FileName.swift — ProjectName"
  if (app.includes('xcode')) {
    const parts = windowTitle.split(/\s*[—–-]\s*/);
    return {
      fileName: parts[0]?.trim() || null,
      projectName: parts[1]?.trim() || null,
      language: 'swift',
    };
  }

  // IntelliJ / WebStorm: "FileName — ProjectName"
  if (app.includes('intellij') || app.includes('webstorm') || app.includes('pycharm')) {
    const parts = windowTitle.split(/\s*[—–-]\s*/);
    const fileName = parts[0]?.trim() || null;
    let language: string | null = null;
    if (fileName) {
      const ext = '.' + fileName.split('.').pop()?.toLowerCase();
      language = LANGUAGE_EXTENSIONS[ext] ?? null;
    }
    return { fileName, projectName: parts[1]?.trim() || null, language };
  }

  // Claude Code: window title might be "Claude Code — project" or just the terminal
  if (app.includes('claude')) {
    return { fileName: null, projectName: windowTitle || null, language: null };
  }

  return { fileName: null, projectName: null, language: null };
}

function extractCodeContext(focusedText: string, visibleText: string[]): {
  snippet: string;
  imports: string[];
  functions: string[];
} {
  const allCode = focusedText || visibleText.join('\n');

  // Extract import/require statements
  const imports = allCode.split('\n')
    .filter(line => /^\s*(?:import |from |require\(|use |#include)/.test(line))
    .slice(0, 10);

  // Extract function/class definitions
  const functions = allCode.split('\n')
    .filter(line => /^\s*(?:function |class |def |fn |func |pub |export |const \w+ = |async )/.test(line))
    .map(line => line.trim().slice(0, 100))
    .slice(0, 10);

  return {
    snippet: allCode.slice(0, 1000),
    imports,
    functions,
  };
}

export const codeParser: AppParser = {
  name: 'code',

  match(ctx: DesktopContextSnapshot): boolean {
    const app = ctx.active_app.toLowerCase();
    const codeApps = ['code', 'cursor', 'xcode', 'intellij', 'webstorm', 'pycharm', 'rubymine', 'goland', 'rider', 'vim', 'neovim', 'emacs', 'sublime', 'atom', 'nova'];
    return codeApps.some(a => app.includes(a));
  },

  parse(ctx: DesktopContextSnapshot): ParsedScreenContent {
    const { fileName, projectName, language } = parseEditorTitle(ctx.window_title, ctx.active_app);
    const { snippet, imports, functions } = extractCodeContext(ctx.focused_text, ctx.visible_text);

    const parts: string[] = [];
    if (projectName) parts.push(`Project: ${projectName}`);
    if (fileName) parts.push(`File: ${fileName}${language ? ` (${language})` : ''}`);
    if (functions.length > 0) parts.push(`Functions: ${functions.join(', ')}`);
    if (snippet) parts.push(`Code:\n${snippet}`);

    return {
      appCategory: 'code',
      structuredData: {
        editor: ctx.active_app,
        fileName,
        projectName,
        language,
        imports,
        functions,
        codeSnippet: snippet,
      },
      rawText: `[Code Editor: ${ctx.active_app}]\n${parts.join('\n')}`,
      people: [],
      actionItems: [],
      confidence: fileName ? 0.9 : 0.6,
    };
  },
};
