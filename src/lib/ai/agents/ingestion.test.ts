import { describe, it, expect } from 'vitest';

// parseIngestionResult is not exported, so we test the logic inline
// This validates the JSON parsing + fallback behavior that protects against malformed AI output

function parseIngestionResult(text: string) {
  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      summary: text.slice(0, 200),
      urgency_score: 5,
      needs_reply: false,
      sentiment: 'neutral',
      key_entities: [],
      is_promotional: false,
    };
  }
}

describe('parseIngestionResult', () => {
  it('parses valid JSON response', () => {
    const json = JSON.stringify({
      summary: 'Meeting request from CEO',
      urgency_score: 9,
      needs_reply: true,
      sentiment: 'positive',
      key_entities: ['CEO', 'Board Meeting'],
      is_promotional: false,
    });

    const result = parseIngestionResult(json);
    expect(result.summary).toBe('Meeting request from CEO');
    expect(result.urgency_score).toBe(9);
    expect(result.needs_reply).toBe(true);
    expect(result.key_entities).toEqual(['CEO', 'Board Meeting']);
  });

  it('handles JSON wrapped in markdown code fences', () => {
    const text = '```json\n{"summary":"Test","urgency_score":3,"needs_reply":false,"sentiment":"neutral","key_entities":[],"is_promotional":false}\n```';
    const result = parseIngestionResult(text);
    expect(result.summary).toBe('Test');
    expect(result.urgency_score).toBe(3);
  });

  it('returns fallback for completely invalid output', () => {
    const result = parseIngestionResult('I cannot process this email properly.');
    expect(result.summary).toBe('I cannot process this email properly.');
    expect(result.urgency_score).toBe(5);
    expect(result.needs_reply).toBe(false);
    expect(result.sentiment).toBe('neutral');
    expect(result.is_promotional).toBe(false);
  });

  it('truncates fallback summary to 200 characters', () => {
    const longText = 'a'.repeat(500);
    const result = parseIngestionResult(longText);
    expect(result.summary.length).toBe(200);
  });

  it('handles empty string', () => {
    const result = parseIngestionResult('');
    expect(result.summary).toBe('');
    expect(result.urgency_score).toBe(5);
  });

  it('handles partial/malformed JSON', () => {
    const result = parseIngestionResult('{"summary": "test", "urgency_score":');
    expect(result.urgency_score).toBe(5);
    expect(result.needs_reply).toBe(false);
  });
});
