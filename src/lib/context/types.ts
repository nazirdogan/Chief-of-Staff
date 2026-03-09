export type ContextChunkType =
  | 'email_thread'
  | 'calendar_event'
  | 'document_edit'
  | 'slack_conversation'
  | 'task_update'
  | 'code_activity'
  | 'crm_activity'
  | 'file_activity'
  | 'general_note'
  | 'desktop_observation';

export type ContextImportance = 'critical' | 'important' | 'background' | 'noise';

export type ContextSentiment = 'positive' | 'negative' | 'neutral' | 'urgent';

export interface ContextPipelineInput {
  sourceId: string;
  sourceRef: Record<string, unknown>;
  threadId?: string;
  title?: string;
  rawContent: string;
  occurredAt: string;
  people?: string[];
  chunkType: ContextChunkType;
}

export interface ContextExtractionResult {
  content_summary: string;
  entities: {
    people?: Array<{ name: string; email?: string }>;
    projects?: string[];
    topics?: string[];
    dates?: string[];
    action_items?: string[];
  };
  sentiment: ContextSentiment;
  importance: ContextImportance;
  importance_score: number;
  topics: string[];
  projects: string[];
  people: string[];
}

export interface ContextChunk {
  id: string;
  user_id: string;
  provider: string;
  source_id: string;
  source_ref: Record<string, unknown>;
  thread_id: string | null;
  chunk_type: ContextChunkType;
  title: string | null;
  content_summary: string;
  raw_content_hash: string;
  entities: Record<string, unknown>;
  sentiment: ContextSentiment | null;
  importance: ContextImportance;
  importance_score: number | null;
  topics: string[];
  projects: string[];
  people: string[];
  embedding: number[];
  occurred_at: string;
  captured_at: string;
  expires_at: string | null;
}

export interface ContextThread {
  id: string;
  user_id: string;
  thread_key: string;
  title: string;
  summary: string | null;
  last_chunk_at: string;
  chunk_count: number;
  participants: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkingPatterns {
  id: string;
  user_id: string;
  typical_start_time: string | null;
  typical_end_time: string | null;
  peak_hours: Array<{ hour: number; activity_score: number }>;
  active_days: number[];
  avg_emails_per_day: number;
  avg_slack_messages_per_day: number;
  avg_meetings_per_day: number;
  response_time_p50_minutes: number | null;
  response_time_p90_minutes: number | null;
  busiest_day_of_week: number | null;
  quietest_day_of_week: number | null;
  deep_work_windows: Array<{ start: string; end: string; day: number }>;
  meeting_heavy_days: number[];
  context_switch_frequency: number | null;
  active_projects_ranked: Array<{ project: string; hours_this_week: number; trend: string }>;
  top_collaborators: Array<{ email: string; interaction_count: number; channels: string[] }>;
  working_style_summary: string | null;
  recent_changes: string | null;
  analysis_window_days: number;
  last_analyzed_at: string;
}

export interface MemorySnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  emails_received: number;
  emails_sent: number;
  slack_messages: number;
  meetings_attended: number;
  tasks_completed: number;
  documents_edited: number;
  code_prs_opened: number;
  day_narrative: string;
  key_decisions: Array<{ decision: string; context: string; source_ref: Record<string, unknown> }>;
  open_loops: Array<{ description: string; source_ref?: Record<string, unknown> }>;
  notable_interactions: Array<{ person: string; summary: string; source_ref: Record<string, unknown> }>;
  embedding: number[] | null;
  created_at: string;
}

export interface ProcessContextResult {
  processed: number;
  skipped: number;
  errors: number;
}

export interface ContextAdapter {
  toContextInput(rawData: unknown): ContextPipelineInput[];
}

// ── Activity Sessions (observer-first intelligence) ──────────

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

export interface ActivitySession {
  id: string;
  user_id: string;
  app_name: string;
  app_category: AppCategory;
  window_title: string | null;
  url: string | null;
  started_at: string;
  ended_at: string | null;
  snapshot_count: number;
  summary: string | null;
  parsed_data: Record<string, unknown>;
  people: string[];
  projects: string[];
  topics: string[];
  action_items: Array<{ text: string; source?: string }>;
  importance: ContextImportance;
  importance_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface AppTransition {
  id: string;
  user_id: string;
  from_app: string;
  to_app: string;
  from_category: string;
  to_category: string;
  transitioned_at: string;
}

export interface DayNarrative {
  id: string;
  user_id: string;
  narrative_date: string;
  narrative: string;
  session_count: number;
  email_sessions: number;
  chat_sessions: number;
  code_sessions: number;
  meeting_sessions: number;
  browsing_sessions: number;
  total_active_seconds: number;
  key_events: Array<{ event: string; time: string; importance: string }>;
  people_seen: string[];
  projects_worked_on: string[];
  embedding: number[] | null;
  last_updated_at: string;
  created_at: string;
}
