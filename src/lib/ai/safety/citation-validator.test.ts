import { describe, it, expect } from 'vitest';
import { validateCitations, validateBriefingItem, validateCommitmentRecord } from './citation-validator';

describe('validateCitations', () => {
  it('returns valid for fully cited claims', () => {
    const result = validateCitations([
      {
        text: 'Meeting with John at 3pm',
        source_ref: {
          provider: 'google_calendar',
          message_id: 'evt_123',
          excerpt: 'Meeting with John at 3pm',
        },
      },
    ]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.uncited_claims).toHaveLength(0);
  });

  it('flags claims with no source_ref', () => {
    const result = validateCitations([
      { text: 'Revenue is up 20%' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.uncited_claims).toContain('Revenue is up 20%');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('flags source_ref missing provider', () => {
    const result = validateCitations([
      {
        text: 'Some claim',
        source_ref: { message_id: '123', excerpt: 'test' },
      },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Missing provider'))).toBe(true);
  });

  it('flags source_ref missing message_id', () => {
    const result = validateCitations([
      {
        text: 'Some claim',
        source_ref: { provider: 'gmail', excerpt: 'test' },
      },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Missing message_id'))).toBe(true);
  });

  it('flags source_ref missing excerpt', () => {
    const result = validateCitations([
      {
        text: 'Some claim',
        source_ref: { provider: 'gmail', message_id: '123' },
      },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Missing excerpt'))).toBe(true);
  });

  it('validates multiple claims and reports all errors', () => {
    const result = validateCitations([
      {
        text: 'Valid claim',
        source_ref: { provider: 'gmail', message_id: '1', excerpt: 'ok' },
      },
      { text: 'Uncited claim' },
      {
        text: 'Partial ref',
        source_ref: { provider: 'slack' },
      },
    ]);
    expect(result.valid).toBe(false);
    expect(result.uncited_claims).toHaveLength(1);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('returns valid for empty claims array', () => {
    const result = validateCitations([]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('validateBriefingItem', () => {
  it('passes for complete briefing item', () => {
    expect(() =>
      validateBriefingItem({
        title: 'Test item',
        source_ref: { provider: 'gmail', message_id: '1', excerpt: 'x' },
        reasoning: 'Ranked #1 because VIP sender',
      })
    ).not.toThrow();
  });

  it('throws for missing source_ref', () => {
    expect(() =>
      validateBriefingItem({ title: 'No source', reasoning: 'test' })
    ).toThrow('no source_ref');
  });

  it('throws for missing reasoning', () => {
    expect(() =>
      validateBriefingItem({
        title: 'No reasoning',
        source_ref: { provider: 'gmail', message_id: '1', excerpt: 'x' },
      })
    ).toThrow('no reasoning');
  });
});

describe('validateCommitmentRecord', () => {
  it('passes for complete commitment record', () => {
    expect(() =>
      validateCommitmentRecord({
        commitment_text: 'Send the report by Friday',
        source_quote: 'I will send the report by Friday',
        source_ref: { provider: 'gmail', message_id: '1', excerpt: 'x' },
      })
    ).not.toThrow();
  });

  it('throws for missing source_quote', () => {
    expect(() =>
      validateCommitmentRecord({
        commitment_text: 'Do the thing',
        source_ref: { provider: 'gmail', message_id: '1', excerpt: 'x' },
      })
    ).toThrow('no source_quote');
  });

  it('throws for missing source_ref', () => {
    expect(() =>
      validateCommitmentRecord({
        commitment_text: 'Do the thing',
        source_quote: 'I will do the thing',
      })
    ).toThrow('no source_ref');
  });
});
