/** Context snapshot from the native desktop observer */
export interface DesktopContext {
  timestamp: number;
  active_app: string;
  bundle_id: string;
  window_title: string;
  focused_text: string;
  selected_text: string;
  visible_text: string[];
  clipboard_text: string;
  activity_type: string; // reading | writing | browsing | communicating | coding | designing | planning
  url: string | null;
  /** Apple Vision OCR text from the screen (Apple Silicon only; empty array on Intel) */
  ocr_text?: string[];
}

export interface ObserverStatus {
  running: boolean;
  has_accessibility_permission: boolean;
  apps_observed: number;
  context_changes_emitted: number;
  last_context: DesktopContext | null;
}
