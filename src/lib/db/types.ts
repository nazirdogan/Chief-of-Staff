// Database types matching every table in DATABASE.md
// These will eventually be replaced by auto-generated types from `supabase gen types`

// ── Enums ──────────────────────────────────────────────────

export type IntegrationProvider =
  | 'gmail'
  | 'google_calendar'
  | 'slack'
  | 'notion';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export type BriefingItemType =
  | 'email'
  | 'calendar_event'
  | 'commitment'
  | 'relationship_alert'
  | 'document'
  | 'task'
  | 'slack_message'
  | 'dm'
  | 'calendar_booking'
  | 'pull_request';

export type BriefingItemSection =
  | 'priorities'
  | 'yesterday_completed'
  | 'yesterday_carried_over'
  | 'todays_schedule'
  // Legacy sections — kept for backward compatibility with existing data
  | 'commitment_queue'
  | 'vip_inbox'
  | 'action_required'
  | 'awaiting_reply'
  | 'after_hours'
  | 'at_risk'
  | 'priority_inbox'
  | 'decision_queue'
  | 'quick_wins'
  | 'people_context';

export type CommitmentStatus = 'open' | 'resolved' | 'snoozed' | 'dismissed' | 'delegated';

export type CommitmentConfidence = 'high' | 'medium' | 'low';

export type PendingActionType =
  | 'send_email'
  | 'send_message'
  | 'create_task'
  | 'reschedule_meeting'
  | 'create_calendar_event'
  | 'update_notion_page'
  | 'archive_email';

export enum AutonomyTier {
  SILENT = 1,
  ONE_TAP = 2,
  FULL = 3,
}

export type PendingActionStatus =
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'rejected'
  | 'executed'
  | 'failed';

export type MessageDeliveryChannel = 'whatsapp' | 'in_app' | 'sms';

export type HeartbeatFrequency = 'realtime' | 'hourly' | 'daily';

export type DataRegion = 'me-south-1' | 'eu-central-1' | 'us-east-1';

export type SubscriptionTier = 'free' | 'pro' | 'power' | 'team';

export type WaitlistStatus = 'pending' | 'approved' | 'rejected';

export type FeedbackType = 'bug' | 'feature' | 'general' | 'praise';

export type OperationCategory = 'green' | 'yellow' | 'red' | 'gray';

export type OperationRunType = 'overnight_email' | 'overnight_calendar' | 'am_sweep' | 'time_block';

export type OperationRunStatus = 'running' | 'completed' | 'failed';

export type SubagentType =
  | 'email_drafter'
  | 'notes_updater'
  | 'meeting_scheduler'
  | 'researcher'
  | 'task_executor'
  | 'prep_agent';

export type TimeBlockType = 'task' | 'errand_batch' | 'deep_work' | 'exercise' | 'transit' | 'buffer';

export type TimeBlockStatus = 'proposed' | 'confirmed' | 'completed' | 'skipped';

// Context Memory enums (migration 008)
export type ContextChunkType =
  | 'email_thread'
  | 'calendar_event'
  | 'document_edit'
  | 'slack_conversation'
  | 'task_update'
  | 'code_activity'
  | 'crm_activity'
  | 'file_activity'
  | 'general_note';

export type ContextImportance = 'critical' | 'important' | 'background' | 'noise';

export type ContextSentiment = 'positive' | 'negative' | 'neutral' | 'urgent';

export type MessageSentiment = 'positive' | 'negative' | 'neutral' | 'urgent';

export type ReflectionType = 'weekly' | 'monthly';

// ── Row types ──────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: SubscriptionTier;
  subscription_ends_at: string | null;
  timezone: string;
  data_region: DataRegion;
  briefing_time: string;
  primary_channel: MessageDeliveryChannel;
  whatsapp_number: string | null;
  onboarding_completed: boolean;
  privacy_mode: boolean;
  two_factor_enabled: boolean;
  custom_instructions: string | null;
  blocked_apps: string[];
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnboardingData {
  id: string;
  user_id: string;
  vip_contacts: string[];
  active_projects: string[];
  weekly_priority: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface UserIntegration {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  nango_connection_id: string;
  account_email: string | null;
  account_name: string | null;
  granted_scopes: string[];
  last_synced_at: string | null;
  error_message: string | null;
  connected_at: string;
  updated_at: string;
}

export interface IntegrationAuditLog {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  action: string;
  status_code: number | null;
  request_size: number | null;
  response_size: number | null;
  duration_ms: number | null;
  ip_address: string | null;
  created_at: string;
}

export interface Briefing {
  id: string;
  user_id: string;
  briefing_date: string;
  generated_at: string;
  delivered_at: string | null;
  delivery_channel: MessageDeliveryChannel | null;
  item_count: number;
  generation_model: string | null;
  generation_ms: number | null;
  meeting_preps: MeetingPrepData[];
}

export interface MeetingPrepData {
  event_id: string;
  event_title: string;
  summary: string;
  attendee_context: Array<{
    name: string;
    relationship_note: string;
    source_ref: SourceRef;
  }>;
  open_items: Array<{
    description: string;
    source_ref: SourceRef;
  }>;
  suggested_talking_points: string[];
  watch_out_for: string | null;
}

export interface SourceRef {
  provider: string;
  message_id: string;
  url?: string;
  excerpt: string;
  sent_at?: string;
  from_name?: string;
  thread_id?: string;
}

export interface BriefingItem {
  id: string;
  briefing_id: string;
  user_id: string;
  rank: number;
  section: BriefingItemSection;
  item_type: BriefingItemType;
  title: string;
  summary: string;
  reasoning: string;
  source_ref: SourceRef;
  action_suggestion: string | null;
  sentiment: MessageSentiment | null;
  urgency_score: number | null;
  importance_score: number | null;
  risk_score: number | null;
  composite_score: number | null;
  user_feedback: -1 | 1 | null;
  feedback_at: string | null;
  snoozed_until: string | null;
  actioned_at: string | null;
  created_at: string;
}

export interface Commitment {
  id: string;
  user_id: string;
  recipient_email: string;
  recipient_name: string | null;
  commitment_text: string;
  source_quote: string;
  source_ref: SourceRef;
  confidence: CommitmentConfidence;
  confidence_score: number;
  implied_deadline: string | null;
  explicit_deadline: boolean;
  status: CommitmentStatus;
  resolved_at: string | null;
  resolved_via_ref: Record<string, unknown> | null;
  snoozed_until: string | null;
  delegated_to: string | null;
  user_confirmed: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  organisation: string | null;
  is_vip: boolean;
  relationship_score: number | null;
  first_interaction_at: string | null;
  last_interaction_at: string | null;
  last_interaction_channel: string | null;
  interaction_count_30d: number;
  avg_response_time_hours: number | null;
  open_commitments_count: number;
  context_notes: string | null;
  context_notes_updated_at: string | null;
  user_notes: string | null;
  is_cold: boolean;
  cold_flagged_at: string | null;
}

export interface ContactInteraction {
  id: string;
  user_id: string;
  contact_id: string;
  direction: 'inbound' | 'outbound';
  channel: string;
  message_ref: Record<string, unknown>;
  subject: string | null;
  interacted_at: string;
  created_at: string;
}

export interface PendingAction {
  id: string;
  user_id: string;
  action_type: PendingActionType;
  status: PendingActionStatus;
  payload: Record<string, unknown>;
  source_context: Record<string, unknown> | null;
  briefing_item_id: string | null;
  confirmed_at: string | null;
  rejected_at: string | null;
  executed_at: string | null;
  execution_result: Record<string, unknown> | null;
  expires_at: string;
  created_at: string;
  autonomy_tier: AutonomyTier;
  auto_executed_at?: string | null;
}

export interface UserAutonomySettings {
  id: string;
  user_id: string;
  action_type: PendingActionType;
  tier_1_enabled: boolean;
  tier_2_enabled: boolean;
  whitelist_domains?: string[] | null;
  updated_at: string;
}

export interface EmailEngagementSignal {
  id: string;
  user_id: string;
  sender_domain: string;
  open_count: number;
  click_count: number;
  reply_count: number;
  last_engaged_at: string | null;
  first_seen_at: string;
  engagement_score: number;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action_type: string;
  action_id: string;
  tier: AutonomyTier;
  outcome: string;
  created_at: string;
}

export interface HeartbeatConfig {
  id: string;
  user_id: string;
  scan_frequency: HeartbeatFrequency;
  vip_alerts_enabled: boolean;
  commitment_check_enabled: boolean;
  relationship_check_enabled: boolean;
  document_index_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  alert_channel: MessageDeliveryChannel;
  custom_rules: unknown[];
  updated_at: string;
}

export interface HeartbeatRun {
  id: string;
  user_id: string;
  job_name: string;
  provider: IntegrationProvider | null;
  status: 'running' | 'completed' | 'failed';
  items_processed: number | null;
  items_found: number | null;
  duration_ms: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface DocumentChunk {
  id: string;
  user_id: string;
  provider: string;
  source_id: string;
  chunk_index: number;
  content_summary: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  expires_at: string;
  created_at: string;
}

export interface InboxItem {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  external_id: string;
  thread_id: string | null;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  ai_summary: string | null;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  needs_reply: boolean;
  reply_drafted: boolean;
  sentiment: MessageSentiment | null;
  urgency_score: number | null;
  received_at: string;
  snoozed_until: string | null;
  actioned_at: string | null;
  // Operations layer fields
  operation_category: OperationCategory | null;
  operation_context: Record<string, unknown>;
  estimated_duration_minutes: number | null;
  task_tags: string[];
  task_title: string | null;
  deferred_to: string | null;
  defer_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OperationRun {
  id: string;
  user_id: string;
  run_type: OperationRunType;
  status: OperationRunStatus;
  started_at: string;
  completed_at: string | null;
  result: Record<string, unknown>;
  error: string | null;
  created_at: string;
}

export interface SubagentRun {
  id: string;
  operation_run_id: string;
  user_id: string;
  agent_type: SubagentType;
  task_ids: string[];
  status: OperationRunStatus;
  started_at: string;
  completed_at: string | null;
  result: Record<string, unknown>;
  error: string | null;
  created_at: string;
}

export interface TransitEvent {
  id: string;
  user_id: string;
  calendar_event_id: string;
  origin_location: string | null;
  destination_location: string | null;
  drive_duration_seconds: number;
  departure_time: string;
  arrival_time: string;
  google_calendar_event_id: string | null;
  created_at: string;
}

export interface TimeBlock {
  id: string;
  user_id: string;
  operation_run_id: string | null;
  task_id: string | null;
  title: string;
  start_time: string;
  end_time: string;
  block_type: TimeBlockType;
  location: string | null;
  google_calendar_event_id: string | null;
  status: TimeBlockStatus;
  created_at: string;
}

export interface UserOperationsConfig {
  user_id: string;
  overnight_enabled: boolean;
  overnight_run_time: string;
  home_tasks_after: string;
  exercise_days: number[];
  exercise_duration_minutes: number;
  default_buffer_minutes: number;
  deep_work_preferred_time: string;
  errand_batch_enabled: boolean;
  home_address: string | null;
  office_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  device_name: string | null;
  device_type: string | null;
  ip_address: string | null;
  last_active_at: string;
  revoked_at: string | null;
  created_at: string;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  role: string | null;
  referral: string | null;
  status: WaitlistStatus;
  notes: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
}

export interface UserFeedback {
  id: string;
  user_id: string;
  type: FeedbackType;
  message: string;
  page: string | null;
  rating: number | null;
  metadata: Record<string, unknown>;
  resolved: boolean;
  created_at: string;
}

export interface Reflection {
  id: string;
  user_id: string;
  reflection_type: ReflectionType;
  period_start: string;
  period_end: string;
  summary: string;
  accomplishments: Array<{ description: string; source_ref?: SourceRef }>;
  slipped_items: Array<{ description: string; source_ref?: SourceRef }>;
  relationship_highlights: Array<{ contact_name: string; note: string }>;
  patterns: Array<{ observation: string; suggestion?: string }>;
  recommendations: string | null;
  generation_model: string | null;
  generation_ms: number | null;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// ── Supabase Database type (for typed client) ──────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, 'id'>>;
      };
      onboarding_data: {
        Row: OnboardingData;
        Insert: Omit<OnboardingData, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<OnboardingData, 'id'>>;
      };
      user_integrations: {
        Row: UserIntegration;
        Insert: Omit<UserIntegration, 'id' | 'connected_at' | 'updated_at'> & {
          id?: string;
          connected_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<UserIntegration, 'id'>>;
      };
      integration_audit_log: {
        Row: IntegrationAuditLog;
        Insert: Omit<IntegrationAuditLog, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: never;
      };
      briefings: {
        Row: Briefing;
        Insert: Omit<Briefing, 'id' | 'generated_at' | 'meeting_preps'> & {
          id?: string;
          generated_at?: string;
          meeting_preps?: MeetingPrepData[];
        };
        Update: Partial<Omit<Briefing, 'id'>>;
      };
      briefing_items: {
        Row: BriefingItem;
        Insert: Omit<BriefingItem, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<BriefingItem, 'id'>>;
      };
      commitments: {
        Row: Commitment;
        Insert: Omit<Commitment, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Commitment, 'id'>>;
      };
      contacts: {
        Row: Contact;
        Insert: Omit<Contact, 'id'> & { id?: string };
        Update: Partial<Omit<Contact, 'id'>>;
      };
      contact_interactions: {
        Row: ContactInteraction;
        Insert: Omit<ContactInteraction, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: never;
      };
      pending_actions: {
        Row: PendingAction;
        Insert: Omit<PendingAction, 'id' | 'created_at' | 'expires_at'> & {
          id?: string;
          created_at?: string;
          expires_at?: string;
        };
        Update: Partial<Omit<PendingAction, 'id'>>;
      };
      heartbeat_config: {
        Row: HeartbeatConfig;
        Insert: Omit<HeartbeatConfig, 'id' | 'updated_at'> & {
          id?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<HeartbeatConfig, 'id'>>;
      };
      heartbeat_runs: {
        Row: HeartbeatRun;
        Insert: Omit<HeartbeatRun, 'id' | 'started_at'> & {
          id?: string;
          started_at?: string;
        };
        Update: Partial<Omit<HeartbeatRun, 'id'>>;
      };
      document_chunks: {
        Row: DocumentChunk;
        Insert: Omit<DocumentChunk, 'id' | 'created_at' | 'expires_at'> & {
          id?: string;
          created_at?: string;
          expires_at?: string;
        };
        Update: Partial<Omit<DocumentChunk, 'id'>>;
      };
      inbox_items: {
        Row: InboxItem;
        Insert: Omit<InboxItem, 'id' | 'created_at' | 'updated_at' | 'sentiment' | 'operation_category' | 'operation_context' | 'estimated_duration_minutes' | 'task_tags' | 'task_title' | 'deferred_to' | 'defer_reason'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          sentiment?: MessageSentiment | null;
          operation_category?: OperationCategory | null;
          operation_context?: Record<string, unknown>;
          estimated_duration_minutes?: number | null;
          task_tags?: string[];
          task_title?: string | null;
          deferred_to?: string | null;
          defer_reason?: string | null;
        };
        Update: Partial<Omit<InboxItem, 'id'>>;
      };
      operation_runs: {
        Row: OperationRun;
        Insert: Omit<OperationRun, 'id' | 'started_at' | 'created_at'> & {
          id?: string;
          started_at?: string;
          created_at?: string;
        };
        Update: Partial<Omit<OperationRun, 'id'>>;
      };
      subagent_runs: {
        Row: SubagentRun;
        Insert: Omit<SubagentRun, 'id' | 'started_at' | 'created_at'> & {
          id?: string;
          started_at?: string;
          created_at?: string;
        };
        Update: Partial<Omit<SubagentRun, 'id'>>;
      };
      transit_events: {
        Row: TransitEvent;
        Insert: Omit<TransitEvent, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<TransitEvent, 'id'>>;
      };
      time_blocks: {
        Row: TimeBlock;
        Insert: Omit<TimeBlock, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<TimeBlock, 'id'>>;
      };
      user_operations_config: {
        Row: UserOperationsConfig;
        Insert: Omit<UserOperationsConfig, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
          overnight_enabled?: boolean;
          overnight_run_time?: string;
          home_tasks_after?: string;
          exercise_days?: number[];
          exercise_duration_minutes?: number;
          default_buffer_minutes?: number;
          deep_work_preferred_time?: string;
          errand_batch_enabled?: boolean;
        };
        Update: Partial<Omit<UserOperationsConfig, 'user_id'>>;
      };
      user_sessions: {
        Row: UserSession;
        Insert: Omit<UserSession, 'id' | 'created_at' | 'last_active_at'> & {
          id?: string;
          created_at?: string;
          last_active_at?: string;
        };
        Update: Partial<Omit<UserSession, 'id'>>;
      };
      waitlist: {
        Row: WaitlistEntry;
        Insert: Omit<WaitlistEntry, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<WaitlistEntry, 'id'>>;
      };
      reflections: {
        Row: Reflection;
        Insert: Omit<Reflection, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Reflection, 'id'>>;
      };
      user_feedback: {
        Row: UserFeedback;
        Insert: Omit<UserFeedback, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<UserFeedback, 'id'>>;
      };
      user_autonomy_settings: {
        Row: UserAutonomySettings;
        Insert: Omit<UserAutonomySettings, 'id' | 'updated_at'> & {
          id?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<UserAutonomySettings, 'id'>>;
      };
      email_engagement_signals: {
        Row: EmailEngagementSignal;
        Insert: Omit<EmailEngagementSignal, 'id' | 'first_seen_at'> & {
          id?: string;
          first_seen_at?: string;
        };
        Update: Partial<Omit<EmailEngagementSignal, 'id'>>;
      };
      audit_log: {
        Row: AuditLogEntry;
        Insert: Omit<AuditLogEntry, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: never;
      };
      chat_conversations: {
        Row: ChatConversation;
        Insert: Omit<ChatConversation, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ChatConversation, 'id'>>;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: never;
      };
    };
    Functions: {
      match_document_chunks: {
        Args: {
          query_embedding: number[];
          match_user_id: string;
          match_threshold?: number;
          match_count?: number;
        };
        Returns: Array<{
          id: string;
          provider: string;
          source_id: string;
          content_summary: string;
          metadata: Record<string, unknown>;
          similarity: number;
        }>;
      };
    };
    Enums: {
      integration_provider: IntegrationProvider;
      integration_status: IntegrationStatus;
      briefing_item_type: BriefingItemType;
      briefing_item_section: BriefingItemSection;
      commitment_status: CommitmentStatus;
      commitment_confidence: CommitmentConfidence;
      pending_action_type: PendingActionType;
      pending_action_status: PendingActionStatus;
      message_delivery_channel: MessageDeliveryChannel;
      heartbeat_frequency: HeartbeatFrequency;
      data_region: DataRegion;
      subscription_tier: SubscriptionTier;
      waitlist_status: WaitlistStatus;
      feedback_type: FeedbackType;
      operation_category: OperationCategory;
      operation_run_type: OperationRunType;
      operation_run_status: OperationRunStatus;
      subagent_type: SubagentType;
      time_block_type: TimeBlockType;
      time_block_status: TimeBlockStatus;
    };
  };
}
