/**
 * Activity Session Manager — the brain of the observer-first architecture.
 *
 * Groups rapid-fire desktop context snapshots into meaningful "sessions"
 * (e.g., "Gmail session 10:00-10:45am"), tracks app transitions, and
 * determines when sessions should be opened, updated, or closed.
 *
 * In-memory state per user tracks the current active session.
 * If the process restarts, we simply start a new session (graceful degradation).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DesktopContextSnapshot, ParsedScreenContent } from './parsers/types';
import { parseScreenContent } from './parsers/app-registry';
import {
  createActivitySession,
  updateActivitySession,
  getActiveSession,
  logAppTransition,
} from '@/lib/db/queries/activity-sessions';

// ── In-memory active session state ──────────────────────────────

interface ActiveSessionState {
  sessionId: string;
  appName: string;
  appCategory: string;
  windowTitle: string;
  url: string | null;
  snapshotCount: number;
  lastSnapshotAt: number;
  accumulatedPeople: Set<string>;
  accumulatedProjects: Set<string>;
  accumulatedTopics: Set<string>;
  accumulatedActionItems: Array<{ text: string; source?: string }>;
  mergedParsedData: Record<string, unknown>;
  textBuffer: string[];
}

// Per-user session state (in memory)
const userSessions = new Map<string, ActiveSessionState>();

// Blocked apps cache per user (invalidated from privacy settings route)
const blockedAppsCache = new Map<string, { apps: string[]; fetchedAt: number }>();

/** Cache TTL for blocked apps (5 minutes) */
const BLOCKED_APPS_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Invalidate the blocked apps cache for a user.
 * Called from the privacy settings PATCH route.
 */
export function invalidateBlockedAppsCache(userId: string): void {
  blockedAppsCache.delete(userId);
}

/**
 * Get blocked apps for a user, using an in-memory cache.
 */
async function getBlockedApps(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const cached = blockedAppsCache.get(userId);
  if (cached && Date.now() - cached.fetchedAt < BLOCKED_APPS_CACHE_TTL_MS) {
    return cached.apps;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('profiles')
    .select('blocked_apps')
    .eq('id', userId)
    .single();

  const apps: string[] = data?.blocked_apps ?? [];
  blockedAppsCache.set(userId, { apps, fetchedAt: Date.now() });
  return apps;
}

/**
 * Check if a given app name matches any blocked app ID.
 */
function isAppBlocked(appName: string, blockedApps: string[]): boolean {
  if (blockedApps.length === 0) return false;
  const lower = appName.toLowerCase();
  return blockedApps.some((blocked) => lower.includes(blocked.toLowerCase()));
}

/** How long without a snapshot before we close the session (5 minutes) */
const SESSION_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

// ── Session boundary detection ──────────────────────────────────

function isSameSession(
  current: ActiveSessionState,
  snapshot: DesktopContextSnapshot,
  parsed: ParsedScreenContent
): boolean {
  if (current.appName !== snapshot.active_app) return false;
  if (current.appCategory !== parsed.appCategory) return false;

  if (parsed.appCategory === 'email') {
    const currentSubject = (current.mergedParsedData.subject as string) ?? '';
    const newSubject = (parsed.structuredData.subject as string) ?? '';
    if (currentSubject && newSubject && currentSubject !== newSubject) return false;
  }

  if (parsed.appCategory === 'chat') {
    const currentPartner = (current.mergedParsedData.conversationPartner as string) ?? '';
    const newPartner = (parsed.structuredData.conversationPartner as string) ?? '';
    if (currentPartner && newPartner && currentPartner !== newPartner) return false;
  }

  if (parsed.appCategory === 'code') {
    const currentProject = (current.mergedParsedData.projectName as string) ?? '';
    const newProject = (parsed.structuredData.projectName as string) ?? '';
    if (currentProject && newProject && currentProject !== newProject) return false;
  }

  if (parsed.appCategory === 'browser') {
    const currentDomain = (current.mergedParsedData.domain as string) ?? '';
    const newDomain = (parsed.structuredData.domain as string) ?? '';
    if (currentDomain && newDomain && currentDomain !== newDomain) return false;
  }

  const gap = snapshot.timestamp - current.lastSnapshotAt;
  if (gap > SESSION_IDLE_TIMEOUT_MS) return false;

  return true;
}

function mergeParsedData(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  category: string
): Record<string, unknown> {
  const merged = { ...existing };

  if (category === 'chat' && Array.isArray(incoming.messages)) {
    const existingMessages = (existing.messages as Array<unknown>) ?? [];
    const newMessages = incoming.messages as Array<unknown>;
    const existingTexts = new Set(existingMessages.map((m: unknown) => (m as Record<string, string>).text));
    const unique = newMessages.filter((m: unknown) => !existingTexts.has((m as Record<string, string>).text));
    merged.messages = [...existingMessages, ...unique].slice(-30);
    merged.messageCount = (merged.messages as unknown[]).length;
  }

  if (category === 'code') {
    if (incoming.fileName) merged.fileName = incoming.fileName;
    if (incoming.projectName) merged.projectName = incoming.projectName;
    if (incoming.language) merged.language = incoming.language;
    const existingFns = (existing.functions as string[]) ?? [];
    const newFns = (incoming.functions as string[]) ?? [];
    merged.functions = [...new Set([...existingFns, ...newFns])].slice(0, 20);
  }

  if (category === 'email') {
    if (incoming.subject) merged.subject = incoming.subject;
    if (incoming.from) merged.from = incoming.from;
    if (incoming.bodyPreview) merged.bodyPreview = incoming.bodyPreview;
  }

  if (category === 'browser') {
    if (incoming.url) merged.url = incoming.url;
    if (incoming.pageTitle) merged.pageTitle = incoming.pageTitle;
    if (incoming.keyContent) merged.keyContent = incoming.keyContent;
  }

  return merged;
}

// ── Public API ──────────────────────────────────────────────────

export interface SessionManagerResult {
  sessionsProcessed: number;
  transitionsLogged: number;
}

/**
 * Process a batch of desktop context snapshots through the session manager.
 */
export async function processSnapshots(
  supabase: SupabaseClient,
  userId: string,
  snapshots: DesktopContextSnapshot[]
): Promise<SessionManagerResult> {
  let sessionsProcessed = 0;
  let transitionsLogged = 0;

  // Recover active session from DB if we lost in-memory state
  if (!userSessions.has(userId)) {
    const dbSession = await getActiveSession(supabase, userId);
    if (dbSession && !dbSession.ended_at) {
      const idleTime = Date.now() - new Date(dbSession.updated_at).getTime();
      if (idleTime < SESSION_IDLE_TIMEOUT_MS) {
        userSessions.set(userId, {
          sessionId: dbSession.id,
          appName: dbSession.app_name,
          appCategory: dbSession.app_category,
          windowTitle: dbSession.window_title ?? '',
          url: dbSession.url,
          snapshotCount: dbSession.snapshot_count,
          lastSnapshotAt: new Date(dbSession.updated_at).getTime(),
          accumulatedPeople: new Set(dbSession.people),
          accumulatedProjects: new Set(dbSession.projects),
          accumulatedTopics: new Set(dbSession.topics),
          accumulatedActionItems: dbSession.action_items as Array<{ text: string; source?: string }>,
          mergedParsedData: dbSession.parsed_data,
          textBuffer: [],
        });
      } else {
        await updateActivitySession(supabase, dbSession.id, { endedAt: dbSession.updated_at });
      }
    }
  }

  // Fetch blocked apps (cached) to skip blocked snapshots at session level
  const blockedApps = await getBlockedApps(supabase, userId);

  for (const snapshot of snapshots) {
    // Skip snapshots from blocked apps
    if (isAppBlocked(snapshot.active_app, blockedApps)) {
      continue;
    }

    const parsed = parseScreenContent(snapshot);
    const current = userSessions.get(userId);

    if (current && isSameSession(current, snapshot, parsed)) {
      // ── Continue existing session ──
      current.snapshotCount++;
      current.lastSnapshotAt = snapshot.timestamp;
      current.windowTitle = snapshot.window_title;
      current.url = snapshot.url;

      for (const p of parsed.people) {
        current.accumulatedPeople.add(p.email ?? p.name);
      }
      for (const item of parsed.actionItems) {
        current.accumulatedActionItems.push({ text: item });
      }

      current.mergedParsedData = mergeParsedData(
        current.mergedParsedData,
        parsed.structuredData,
        parsed.appCategory
      );

      if (parsed.rawText.length > 10) {
        current.textBuffer.push(parsed.rawText);
        if (current.textBuffer.length > 30) {
          current.textBuffer = current.textBuffer.slice(-20);
        }
      }

      // Update DB periodically (every 5 snapshots to reduce writes)
      if (current.snapshotCount % 5 === 0) {
        await updateActivitySession(supabase, current.sessionId, {
          snapshotCount: current.snapshotCount,
          parsedData: current.mergedParsedData,
          people: [...current.accumulatedPeople],
          projects: [...current.accumulatedProjects],
          topics: [...current.accumulatedTopics],
          actionItems: current.accumulatedActionItems.slice(-20),
        });
      }

      sessionsProcessed++;
    } else {
      // ── New session needed ──

      // Close the current session if one exists
      if (current) {
        await updateActivitySession(supabase, current.sessionId, {
          endedAt: new Date(current.lastSnapshotAt).toISOString(),
          snapshotCount: current.snapshotCount,
          parsedData: current.mergedParsedData,
          people: [...current.accumulatedPeople],
          projects: [...current.accumulatedProjects],
          topics: [...current.accumulatedTopics],
          actionItems: current.accumulatedActionItems.slice(-20),
        });

        if (current.appName !== snapshot.active_app) {
          await logAppTransition(supabase, {
            userId,
            fromApp: current.appName,
            toApp: snapshot.active_app,
            fromCategory: current.appCategory,
            toCategory: parsed.appCategory,
          });
          transitionsLogged++;
        }
      }

      // Create new session
      const newSession = await createActivitySession(supabase, {
        userId,
        appName: snapshot.active_app,
        appCategory: parsed.appCategory,
        windowTitle: snapshot.window_title,
        url: snapshot.url ?? undefined,
        startedAt: new Date(snapshot.timestamp).toISOString(),
        parsedData: parsed.structuredData,
        people: parsed.people.map(p => p.email ?? p.name),
        projects: (parsed.structuredData.projectName as string)
          ? [parsed.structuredData.projectName as string]
          : [],
      });

      if (newSession) {
        userSessions.set(userId, {
          sessionId: newSession.id,
          appName: snapshot.active_app,
          appCategory: parsed.appCategory,
          windowTitle: snapshot.window_title,
          url: snapshot.url,
          snapshotCount: 1,
          lastSnapshotAt: snapshot.timestamp,
          accumulatedPeople: new Set(parsed.people.map(p => p.email ?? p.name)),
          accumulatedProjects: new Set(
            (parsed.structuredData.projectName as string)
              ? [parsed.structuredData.projectName as string]
              : []
          ),
          accumulatedTopics: new Set(),
          accumulatedActionItems: parsed.actionItems.map(text => ({ text })),
          mergedParsedData: parsed.structuredData,
          textBuffer: parsed.rawText.length > 10 ? [parsed.rawText] : [],
        });
      }

      sessionsProcessed++;
    }
  }

  return { sessionsProcessed, transitionsLogged };
}

/**
 * Force-close any active session for a user (e.g., on app quit).
 */
export async function closeActiveSession(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const state = userSessions.get(userId);
  if (!state) return;

  await updateActivitySession(supabase, state.sessionId, {
    endedAt: new Date(state.lastSnapshotAt).toISOString(),
    snapshotCount: state.snapshotCount,
    parsedData: state.mergedParsedData,
    people: [...state.accumulatedPeople],
    projects: [...state.accumulatedProjects],
    topics: [...state.accumulatedTopics],
  });

  userSessions.delete(userId);
}
