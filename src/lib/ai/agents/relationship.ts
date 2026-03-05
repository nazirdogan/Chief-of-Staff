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
}

export function computeRelationshipUpdates(contacts: Contact[]): RelationshipUpdate[] {
  return contacts.map(contact => {
    const newScore = calculateRelationshipScore(contact);
    const wasCold = contact.is_cold;
    const isCold = shouldFlagCold({ ...contact, relationship_score: newScore });

    return {
      contactId: contact.id,
      newScore,
      isCold,
      coldFlaggedAt: isCold && !wasCold ? new Date().toISOString() : contact.cold_flagged_at,
    };
  });
}
