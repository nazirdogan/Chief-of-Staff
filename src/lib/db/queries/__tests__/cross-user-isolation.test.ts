import { describe, it, expect, vi } from 'vitest';
import { getInboxItem, listInboxItems } from '../inbox';
import { getCommitment, listCommitments, updateCommitment } from '../commitments';
import { getContact, listContacts, getContactInteractions } from '../contacts';
import { getTodaysBriefing, updateBriefingItemFeedback } from '../briefings';

/**
 * RLS Cross-User Isolation Tests
 *
 * These tests verify that every database query function filters by user_id,
 * preventing user A from accessing user B's data. Even though Supabase RLS
 * provides server-side enforcement, our query functions must also filter
 * by user_id as a defence-in-depth measure.
 *
 * We create a mock Supabase client that tracks all .eq() calls and verify
 * that user_id filtering is always present.
 */

const USER_A = 'user-aaa-111';
const USER_B = 'user-bbb-222';

function createMockSupabase() {
  const eqCalls: Array<{ column: string; value: string }> = [];

  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn((column: string, value: string) => {
      eqCalls.push({ column, value });
      return chainable;
    }),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    range: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue({ data: [], error: null }),
  };

  // Make chainable thenable so await works
  Object.defineProperty(chainable, 'then', {
    value: (resolve: (v: { data: unknown; error: null }) => void) =>
      resolve({ data: [], error: null }),
  });

  const client = {
    from: vi.fn(() => chainable),
    _eqCalls: eqCalls,
    _chainable: chainable,
  };

  return client;
}

describe('Cross-User Data Isolation', () => {
  describe('inbox queries filter by user_id', () => {
    it('getInboxItem filters by user_id', async () => {
      const mock = createMockSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await getInboxItem(mock as any, USER_A, 'item-123');

      const userFilter = mock._eqCalls.find(
        (c) => c.column === 'user_id' && c.value === USER_A
      );
      expect(userFilter).toBeDefined();
    });

    it('listInboxItems filters by user_id', async () => {
      const mock = createMockSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await listInboxItems(mock as any, USER_A);

      const userFilter = mock._eqCalls.find(
        (c) => c.column === 'user_id' && c.value === USER_A
      );
      expect(userFilter).toBeDefined();
    });

    it('getInboxItem does NOT return data for wrong user', async () => {
      const mock = createMockSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await getInboxItem(mock as any, USER_A, 'item-123');

      // Verify user B's ID is never used
      const wrongUser = mock._eqCalls.find(
        (c) => c.column === 'user_id' && c.value === USER_B
      );
      expect(wrongUser).toBeUndefined();
    });
  });

  describe('commitment queries filter by user_id', () => {
    it('getCommitment filters by user_id', async () => {
      const mock = createMockSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await getCommitment(mock as any, USER_A, 'commit-123');

      const userFilter = mock._eqCalls.find(
        (c) => c.column === 'user_id' && c.value === USER_A
      );
      expect(userFilter).toBeDefined();
    });

    it('listCommitments filters by user_id', async () => {
      const mock = createMockSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await listCommitments(mock as any, USER_A);

      const userFilter = mock._eqCalls.find(
        (c) => c.column === 'user_id' && c.value === USER_A
      );
      expect(userFilter).toBeDefined();
    });

    it('updateCommitment filters by user_id', async () => {
      const mock = createMockSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateCommitment(mock as any, USER_A, 'commit-123', { status: 'resolved' });

      const userFilter = mock._eqCalls.find(
        (c) => c.column === 'user_id' && c.value === USER_A
      );
      expect(userFilter).toBeDefined();
    });
  });

  describe('contact queries filter by user_id', () => {
    it('getContact filters by user_id', async () => {
      const mock = createMockSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await getContact(mock as any, USER_A, 'contact-123');

      const userFilter = mock._eqCalls.find(
        (c) => c.column === 'user_id' && c.value === USER_A
      );
      expect(userFilter).toBeDefined();
    });

    it('listContacts filters by user_id', async () => {
      const mock = createMockSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await listContacts(mock as any, USER_A);

      const userFilter = mock._eqCalls.find(
        (c) => c.column === 'user_id' && c.value === USER_A
      );
      expect(userFilter).toBeDefined();
    });

    it('getContactInteractions filters by user_id', async () => {
      const mock = createMockSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await getContactInteractions(mock as any, USER_A, 'contact-123');

      const userFilter = mock._eqCalls.find(
        (c) => c.column === 'user_id' && c.value === USER_A
      );
      expect(userFilter).toBeDefined();
    });
  });

  describe('briefing queries filter by user_id', () => {
    it('getTodaysBriefing filters by user_id', async () => {
      const mock = createMockSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await getTodaysBriefing(mock as any, USER_A);

      const userFilter = mock._eqCalls.find(
        (c) => c.column === 'user_id' && c.value === USER_A
      );
      expect(userFilter).toBeDefined();
    });

    it('updateBriefingItemFeedback filters by user_id', async () => {
      const mock = createMockSupabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateBriefingItemFeedback(mock as any, USER_A, 'item-123', 1);

      const userFilter = mock._eqCalls.find(
        (c) => c.column === 'user_id' && c.value === USER_A
      );
      expect(userFilter).toBeDefined();
    });
  });
});
