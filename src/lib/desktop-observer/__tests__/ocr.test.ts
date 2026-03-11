/**
 * Tests for Vision OCR integration across the desktop observer pipeline.
 *
 * Covers:
 * 1. mergeParsedData — accumulates ocrLines correctly, deduplicates, caps at 50
 * 2. formatSessionForPrompt — surfaces OCR when AX structured data is sparse
 * 3. formatSessionForPrompt — suppresses OCR when category-specific data is present
 * 4. formatSessionForPrompt — OCR shown for document/design/unknown apps
 * 5. client.ts — checkScreenRecording and requestScreenRecording are exported
 */

import { describe, it, expect } from 'vitest';
import { mergeParsedData } from '../session-manager';
import { formatSessionForPrompt } from '../narrative-builder';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type MinimalSession = Parameters<typeof formatSessionForPrompt>[0];

function makeSession(overrides: Partial<MinimalSession> = {}): MinimalSession {
  return {
    id: 'sess-1',
    user_id: 'user-1',
    app_name: 'WhatsApp',
    app_category: 'chat',
    window_title: 'Test Chat',
    url: null,
    started_at: new Date('2026-03-11T10:00:00Z').toISOString(),
    ended_at: new Date('2026-03-11T10:15:00Z').toISOString(),
    updated_at: new Date('2026-03-11T10:15:00Z').toISOString(),
    snapshot_count: 10,
    people: [],
    projects: [],
    topics: [],
    action_items: [],
    summary: null,
    parsed_data: {} as Record<string, unknown>,
    importance: 'background',
    importance_score: null,
    created_at: new Date('2026-03-11T10:00:00Z').toISOString(),
    ...overrides,
  };
}

// ─── mergeParsedData — OCR accumulation ───────────────────────────────────────

describe('mergeParsedData — ocrLines accumulation', () => {
  it('adds ocrLines from incoming when existing has none', () => {
    const result = mergeParsedData(
      {},
      { ocrLines: ['Hello Nazir', 'Meeting at 3pm', 'Sounds good'] },
      'chat'
    );
    expect(result.ocrLines).toEqual(['Hello Nazir', 'Meeting at 3pm', 'Sounds good']);
  });

  it('merges and deduplicates ocrLines across calls', () => {
    const first = mergeParsedData(
      {},
      { ocrLines: ['Line A', 'Line B'] },
      'chat'
    );
    const second = mergeParsedData(
      first,
      { ocrLines: ['Line B', 'Line C'] }, // Line B is duplicate
      'chat'
    );
    expect(second.ocrLines).toEqual(['Line A', 'Line B', 'Line C']);
  });

  it('caps ocrLines at 50 entries', () => {
    const existing = { ocrLines: Array.from({ length: 48 }, (_, i) => `Existing line ${i}`) };
    const result = mergeParsedData(
      existing,
      { ocrLines: ['New A', 'New B', 'New C', 'New D'] }, // would push to 52
      'unknown'
    );
    expect((result.ocrLines as string[]).length).toBe(50);
  });

  it('does not add ocrLines key when incoming has none', () => {
    const result = mergeParsedData({ someField: 'value' }, { someField: 'updated' }, 'browser');
    expect(result.ocrLines).toBeUndefined();
  });

  it('does not add ocrLines when incoming array is empty', () => {
    const result = mergeParsedData({}, { ocrLines: [] }, 'code');
    expect(result.ocrLines).toBeUndefined();
  });

  it('preserves existing category-specific data while adding ocrLines', () => {
    const result = mergeParsedData(
      { projectName: 'donna', fileName: 'page.tsx' },
      { ocrLines: ['function handleClick', 'const value = 42'] },
      'code'
    );
    expect(result.projectName).toBe('donna');
    expect(result.fileName).toBe('page.tsx');
    expect((result.ocrLines as string[]).length).toBe(2);
  });
});

// ─── formatSessionForPrompt — OCR content surfacing ──────────────────────────

describe('formatSessionForPrompt — OCR content', () => {
  it('includes OCR content for chat session with no messages (AX failure path)', () => {
    const session = makeSession({
      app_name: 'WhatsApp',
      app_category: 'chat',
      parsed_data: {
        conversationPartner: 'Mum',
        platform: 'whatsapp',
        // No messages — AX couldn't read WhatsApp native
        ocrLines: ['Mum: Are you coming for dinner?', 'Me: Yes, around 7pm', 'Mum: Perfect 🎉'],
      } as Record<string, unknown>,
    });

    const output = formatSessionForPrompt(session);

    expect(output).toContain('Screen content (OCR)');
    expect(output).toContain('Are you coming for dinner');
    expect(output).toContain('Yes, around 7pm');
  });

  it('suppresses OCR when chat messages are already present (AX worked)', () => {
    const session = makeSession({
      app_name: 'WhatsApp',
      app_category: 'chat',
      parsed_data: {
        conversationPartner: 'Mum',
        platform: 'whatsapp',
        messages: [
          { sender: 'Mum', text: 'Are you coming for dinner?', time: '6:00 PM' },
          { sender: 'Me', text: 'Yes, around 7pm', time: '6:01 PM' },
        ],
        ocrLines: ['Are you coming for dinner?', 'Yes, around 7pm'],
      } as Record<string, unknown>,
    });

    const output = formatSessionForPrompt(session);

    // Messages should be included
    expect(output).toContain('Are you coming for dinner');
    // OCR block should NOT appear (messages already cover this)
    expect(output).not.toContain('Screen content (OCR)');
  });

  it('includes OCR for document apps that AX cannot read (Pages, Keynote)', () => {
    const session = makeSession({
      app_name: 'Keynote',
      app_category: 'document',
      parsed_data: {
        ocrLines: [
          'Q1 Revenue Overview',
          'Total ARR: $2.4M',
          'Growth: 34% YoY',
          'Key risks: churn in enterprise segment',
        ],
      } as Record<string, unknown>,
    });

    const output = formatSessionForPrompt(session);

    expect(output).toContain('Screen content (OCR)');
    expect(output).toContain('Q1 Revenue Overview');
    expect(output).toContain('Total ARR');
  });

  it('includes OCR for unknown category apps (Figma, Zoom, etc.)', () => {
    const session = makeSession({
      app_name: 'Zoom',
      app_category: 'unknown',
      parsed_data: {
        ocrLines: [
          'Weekly Product Sync',
          'Attendees: Nazir, Sarah, James',
          'ACTION: Ship payments feature by Friday',
        ],
      } as Record<string, unknown>,
    });

    const output = formatSessionForPrompt(session);

    expect(output).toContain('Screen content (OCR)');
    expect(output).toContain('Weekly Product Sync');
    expect(output).toContain('ACTION: Ship payments feature by Friday');
  });

  it('suppresses OCR when browser has keyContent (AX worked)', () => {
    const session = makeSession({
      app_name: 'Safari',
      app_category: 'browser',
      parsed_data: {
        domain: 'github.com',
        pageTitle: 'Pull Request #42',
        keyContent: 'Add Vision OCR to desktop observer pipeline',
        ocrLines: ['Pull Request #42', 'Add Vision OCR'],
      } as Record<string, unknown>,
    });

    const output = formatSessionForPrompt(session);

    expect(output).toContain('github.com');
    expect(output).not.toContain('Screen content (OCR)');
  });

  it('suppresses OCR when code session has fileName (AX worked)', () => {
    const session = makeSession({
      app_name: 'Cursor',
      app_category: 'code',
      parsed_data: {
        fileName: 'screen_ocr.rs',
        projectName: 'donna',
        language: 'rust',
        ocrLines: ['pub fn capture_ocr_text()', 'let result = vec![]'],
      } as Record<string, unknown>,
    });

    const output = formatSessionForPrompt(session);

    expect(output).toContain('screen_ocr.rs');
    expect(output).not.toContain('Screen content (OCR)');
  });

  it('truncates long OCR output at 600 chars in prompt', () => {
    const longLines = Array.from({ length: 30 }, (_, i) => `OCR line ${i}: ${'x'.repeat(30)}`);
    const session = makeSession({
      app_name: 'Zoom',
      app_category: 'unknown',
      parsed_data: { ocrLines: longLines } as Record<string, unknown>,
    });

    const output = formatSessionForPrompt(session);

    // Should contain OCR section but be truncated
    expect(output).toContain('Screen content (OCR)');
    const ocrStart = output.indexOf('Screen content (OCR)');
    const ocrSection = output.slice(ocrStart);
    // The section should not be excessively long
    expect(ocrSection.length).toBeLessThan(800);
  });
});

// ─── client.ts — screen recording exports ────────────────────────────────────

describe('client.ts — screen recording API exports', () => {
  it('exports checkScreenRecording as a function', async () => {
    const mod = await import('../client');
    expect(typeof mod.checkScreenRecording).toBe('function');
  });

  it('exports requestScreenRecording as a function', async () => {
    const mod = await import('../client');
    expect(typeof mod.requestScreenRecording).toBe('function');
  });

  it('checkScreenRecording returns false outside Tauri shell', async () => {
    const mod = await import('../client');
    // In test/browser env (no __TAURI_INTERNALS__), should return false without throwing
    const result = await mod.checkScreenRecording();
    expect(result).toBe(false);
  });

  it('requestScreenRecording returns false outside Tauri shell', async () => {
    const mod = await import('../client');
    const result = await mod.requestScreenRecording();
    expect(result).toBe(false);
  });
});
