import type { ContextAdapter, ContextPipelineInput, ContextChunkType } from '@/lib/context/types';

interface DesktopContextData {
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
}

function chunkTypeFromActivity(activity: string): ContextChunkType {
  switch (activity) {
    case 'communicating':
      return 'slack_conversation'; // closest match for messaging content
    case 'coding':
      return 'code_activity';
    case 'writing':
      return 'document_edit';
    case 'planning':
      return 'calendar_event';
    default:
      return 'general_note';
  }
}

/**
 * Merges an array of rapid-fire desktop context snapshots into
 * a single coherent context chunk to avoid flooding the pipeline.
 *
 * Groups by app+window, concatenates unique visible text,
 * and produces one ContextPipelineInput per distinct app/window pair.
 */
function mergeContextSnapshots(items: DesktopContextData[]): DesktopContextData[] {
  const groups = new Map<string, DesktopContextData[]>();

  for (const item of items) {
    const key = `${item.active_app}::${item.window_title}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }

  const merged: DesktopContextData[] = [];

  for (const [, snapshots] of groups) {
    // Take the latest snapshot as the base
    const latest = snapshots[snapshots.length - 1];

    // Collect unique visible text across all snapshots
    const allText = new Set<string>();
    for (const snap of snapshots) {
      for (const text of snap.visible_text) {
        allText.add(text);
      }
    }

    merged.push({
      ...latest,
      visible_text: Array.from(allText).slice(0, 300),
    });
  }

  return merged;
}

export const desktopAdapter: ContextAdapter = {
  toContextInput(rawData: unknown): ContextPipelineInput[] {
    const items = Array.isArray(rawData) ? rawData : [rawData];

    const validItems = items.filter(
      (item): item is DesktopContextData =>
        !!item && typeof item === 'object' && 'active_app' in item
    );

    if (validItems.length === 0) return [];

    // Merge snapshots from same app/window to reduce pipeline load
    const merged = mergeContextSnapshots(validItems);

    return merged.map((item) => {
      // Build raw content from all available text
      const contentParts: string[] = [];

      if (item.window_title) {
        contentParts.push(`[${item.active_app}] ${item.window_title}`);
      }

      if (item.url) {
        contentParts.push(`URL: ${item.url}`);
      }

      if (item.focused_text) {
        contentParts.push(`Focused: ${item.focused_text}`);
      }

      if (item.selected_text) {
        contentParts.push(`Selected: ${item.selected_text}`);
      }

      if (item.visible_text.length > 0) {
        contentParts.push(`Content:\n${item.visible_text.join('\n')}`);
      }

      const rawContent = contentParts.join('\n\n');
      // Generate a unique-ish source ID based on app + window + timestamp range
      const sourceId = `desktop:${item.active_app}:${item.window_title}:${item.timestamp}`;

      return {
        sourceId,
        sourceRef: {
          provider: 'desktop_observer',
          app: item.active_app,
          bundle_id: item.bundle_id,
          window_title: item.window_title,
          activity_type: item.activity_type,
          url: item.url,
          captured_at: new Date(item.timestamp).toISOString(),
        },
        threadId: `desktop:${item.active_app}:${item.window_title}`,
        title: `${item.active_app} — ${item.window_title}`,
        rawContent,
        occurredAt: new Date(item.timestamp).toISOString(),
        people: [], // desktop observation doesn't directly identify people
        chunkType: chunkTypeFromActivity(item.activity_type),
      };
    });
  },
};
