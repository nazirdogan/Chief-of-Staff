import type { BriefingItem } from '@/lib/db/types';

export interface CitedClaim {
  text: string;
  source_ref: {
    provider: string;
    message_id: string;
    url?: string;
    excerpt: string;
    sent_at?: string;
    from_name?: string;
  };
}

export interface CitationValidationResult {
  valid: boolean;
  errors: string[];
  uncited_claims: string[];
}

export function validateCitations(
  claims: Array<{ text: string; source_ref?: unknown }>
): CitationValidationResult {
  const errors: string[] = [];
  const uncited_claims: string[] = [];

  for (const claim of claims) {
    if (!claim.source_ref) {
      uncited_claims.push(claim.text);
      errors.push(`Uncited claim: "${claim.text.slice(0, 80)}..."`);
      continue;
    }

    const ref = claim.source_ref as Record<string, unknown>;

    if (!ref.provider || typeof ref.provider !== 'string') {
      errors.push(`Missing provider in source_ref for: "${claim.text.slice(0, 40)}"`);
    }
    if (!ref.message_id || typeof ref.message_id !== 'string') {
      errors.push(`Missing message_id in source_ref for: "${claim.text.slice(0, 40)}"`);
    }
    if (!ref.excerpt || typeof ref.excerpt !== 'string') {
      errors.push(`Missing excerpt in source_ref for: "${claim.text.slice(0, 40)}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    uncited_claims,
  };
}

export function validateBriefingItem(item: Partial<BriefingItem>): void {
  if (!item.source_ref) {
    throw new Error(
      `BriefingItem "${item.title}" has no source_ref. All briefing items require a source.`
    );
  }
  if (!item.reasoning) {
    throw new Error(
      `BriefingItem "${item.title}" has no reasoning. Users must see why this was ranked here.`
    );
  }
}

export function validateTaskRecord(record: {
  task_text: string;
  source_quote?: string;
  source_ref?: unknown;
}): void {
  if (!record.source_quote) {
    throw new Error(
      `Task "${record.task_text}" has no source_quote. All tasks require the exact sentence.`
    );
  }
  if (!record.source_ref) {
    throw new Error(
      `Task "${record.task_text}" has no source_ref. All tasks require a source reference.`
    );
  }
}

/** @deprecated Use validateTaskRecord */
export function validateCommitmentRecord(record: {
  commitment_text?: string;
  task_text?: string;
  source_quote?: string;
  source_ref?: unknown;
}): void {
  validateTaskRecord({
    task_text: record.task_text ?? record.commitment_text ?? '',
    source_quote: record.source_quote,
    source_ref: record.source_ref,
  });
}
