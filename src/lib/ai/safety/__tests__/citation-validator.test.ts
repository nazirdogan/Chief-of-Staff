import { describe, it, expect } from 'vitest';
import {
  validateBriefingItem,
  validateCommitmentRecord,
  validateCitations,
} from '../citation-validator';

describe('validateBriefingItem', () => {
  it('passes with valid source_ref and reasoning', () => {
    expect(() =>
      validateBriefingItem({
        title: 'Test item',
        source_ref: { provider: 'gmail', message_id: '123', excerpt: 'hello' },
        reasoning: 'This is important because...',
      })
    ).not.toThrow();
  });

  it('throws when source_ref is missing', () => {
    expect(() =>
      validateBriefingItem({
        title: 'No source',
        reasoning: 'Some reasoning',
      })
    ).toThrow(/no source_ref/i);
  });

  it('throws when reasoning is missing', () => {
    expect(() =>
      validateBriefingItem({
        title: 'No reasoning',
        source_ref: { provider: 'gmail', message_id: '123', excerpt: 'x' },
      })
    ).toThrow(/no reasoning/i);
  });
});

describe('validateCommitmentRecord', () => {
  it('passes with valid source_quote and source_ref', () => {
    expect(() =>
      validateCommitmentRecord({
        commitment_text: 'I will send the report',
        source_quote: 'I will send the report by Friday',
        source_ref: { provider: 'gmail', message_id: '456' },
      })
    ).not.toThrow();
  });

  it('throws when source_quote is missing', () => {
    expect(() =>
      validateCommitmentRecord({
        commitment_text: 'Send report',
        source_ref: { provider: 'gmail' },
      })
    ).toThrow(/no source_quote/i);
  });

  it('throws when source_ref is missing', () => {
    expect(() =>
      validateCommitmentRecord({
        commitment_text: 'Send report',
        source_quote: 'I will send it',
      })
    ).toThrow(/no source_ref/i);
  });
});

describe('validateCitations', () => {
  it('returns valid for fully cited claims', () => {
    const result = validateCitations([
      {
        text: 'Meeting at 3pm',
        source_ref: { provider: 'gmail', message_id: '1', excerpt: 'meeting 3pm' },
      },
    ]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('flags uncited claims', () => {
    const result = validateCitations([
      { text: 'No source here' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.uncited_claims).toContain('No source here');
  });

  it('flags missing provider in source_ref', () => {
    const result = validateCitations([
      { text: 'Claim', source_ref: { message_id: '1', excerpt: 'x' } },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/Missing provider/);
  });
});
