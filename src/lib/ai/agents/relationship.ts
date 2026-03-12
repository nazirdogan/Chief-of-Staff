import type { Contact } from '@/lib/db/types';

function daysBetween(dateStr: string | null, now: Date): number {
  if (!dateStr) return Infinity;
  const date = new Date(dateStr);
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function calculateRelationshipScore(contact: Contact): number {
  const daysSinceContact = daysBetween(contact.last_interaction_at, new Date());
  const frequency = contact.interaction_count_30d;

  let score = 50; // baseline

  // Recency (0-40 points)
  if (daysSinceContact <= 3) score += 40;
  else if (daysSinceContact <= 7) score += 30;
  else if (daysSinceContact <= 14) score += 20;
  else if (daysSinceContact <= 30) score += 10;
  else score -= 10;

  // Frequency (0-30 points)
  score += Math.min(frequency * 3, 30);

  // VIP bonus (0-20 points)
  if (contact.is_vip) score += 20;

  return Math.max(0, Math.min(100, score));
}

export function shouldFlagCold(contact: Contact): boolean {
  if (!contact.is_vip && contact.relationship_score !== null && contact.relationship_score < 30) return true;
  if (contact.is_vip && (contact.relationship_score === null || contact.relationship_score < 50)) return true;
  return false;
}

export interface RelationshipUpdate {
  contactId: string;
  newScore: number;
  isCold: boolean;
  coldFlaggedAt: string | null;
  scoreHistory: Array<{ score: number; recorded_at: string }>;
  trend: 'declining' | 'stable' | 'warming';
}

export type RelationshipTrend = 'declining' | 'stable' | 'warming';

export function computeTrend(scoreHistory: Array<{ score: number; recorded_at: string }>, currentScore: number): RelationshipTrend {
  if (scoreHistory.length < 2) return 'stable';
  const prevScore = scoreHistory[0].score;
  const diff = currentScore - prevScore;
  if (diff <= -10) return 'declining';
  if (diff >= 10) return 'warming';
  return 'stable';
}

export function computeRelationshipUpdates(contacts: Contact[]): RelationshipUpdate[] {
  const now = new Date().toISOString();

  return contacts.map(contact => {
    const newScore = calculateRelationshipScore(contact);
    const wasCold = contact.is_cold;
    const isCold = shouldFlagCold({ ...contact, relationship_score: newScore });

    // Keep last 3 scores — prepend new, trim to 3
    const prevHistory = contact.score_history ?? [];
    const scoreHistory = [
      { score: newScore, recorded_at: now },
      ...prevHistory,
    ].slice(0, 3);

    const trend = computeTrend(prevHistory, newScore);

    return {
      contactId: contact.id,
      newScore,
      isCold,
      coldFlaggedAt: isCold && !wasCold ? now : contact.cold_flagged_at,
      scoreHistory,
      trend,
    };
  });
}
