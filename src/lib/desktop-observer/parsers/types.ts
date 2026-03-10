/**
 * App-aware screen parser types.
 *
 * Instead of dumping all visible text into a blob, we recognise WHAT app
 * the user is in and produce structured data before hitting the AI layer.
 */

export type AppCategory =
  | 'email'
  | 'chat'
  | 'calendar'
  | 'code'
  | 'terminal'
  | 'browser'
  | 'document'
  | 'design'
  | 'unknown';

/** Structured output from an app-aware parser */
export interface ParsedScreenContent {
  appCategory: AppCategory;
  /** App-specific structured fields (email fields, chat messages, code context, etc.) */
  structuredData: Record<string, unknown>;
  /** Fallback full text for AI extraction */
  rawText: string;
  /** People detected on screen (names, emails) */
  people: Array<{ name: string; email?: string }>;
  /** Action items / things the user needs to do */
  actionItems: string[];
  /** How confident the parser is in its extraction (0-1) */
  confidence: number;
}

/** Raw desktop context from the Tauri observer */
export interface DesktopContextSnapshot {
  timestamp: number;
  active_app: string;
  bundle_id: string;
  window_title: string;
  focused_text: string;
  selected_text: string;
  visible_text: string[];
  clipboard_text: string;
  activity_type: string;
  url: string | null;
  /** Apple Vision OCR text from the screen (Apple Silicon only; empty array on Intel) */
  ocr_text?: string[];
}

/** A single parser that matches and parses a specific app type */
export interface AppParser {
  /** Human-readable name for debugging */
  name: string;
  /** Check if this parser handles the given context */
  match(ctx: DesktopContextSnapshot): boolean;
  /** Extract structured data from the context */
  parse(ctx: DesktopContextSnapshot): ParsedScreenContent;
}
