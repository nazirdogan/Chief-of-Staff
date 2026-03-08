'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { ContactCard } from '@/components/people/ContactCard';
import type { Contact } from '@/lib/db/types';

const c = {
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
  dawn: '#E8845C',
  dawnMuted: 'rgba(232,132,92,0.15)',
  text: '#FFFFFF',
  textTertiary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.35)',
};

type Filter = 'all' | 'vip' | 'cold';

export default function PeoplePage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filter === 'vip') params.set('vip', 'true');
      if (filter === 'cold') params.set('cold', 'true');
      params.set('order_by', 'relationship_score');

      const res = await fetch(`/api/people?${params}`);
      if (!res.ok) throw new Error('Failed to fetch contacts');
      const data = await res.json();
      setContacts(data.contacts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  function handleContactClick(contact: Contact) {
    router.push(`/people/${contact.id}`);
  }

  const coldCount = contacts.filter(c => c.is_cold).length;
  const vipCount = contacts.filter(c => c.is_vip).length;

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: `All (${contacts.length})` },
    { key: 'vip', label: `VIP (${vipCount})` },
    { key: 'cold', label: `Cold (${coldCount})` },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Users size={20} color={c.dawn} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: 0 }}>People</h1>
        </div>
        <p style={{ fontSize: 13, color: c.textTertiary, margin: 0 }}>
          Your contacts with relationship scores and interaction history
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              border: `1px solid ${filter === key ? c.dawn : c.border}`,
              background: filter === key ? `${c.dawn}10` : c.surface,
              color: filter === key ? c.dawn : c.textTertiary,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ height: 72, borderRadius: 10, background: c.dawnMuted, border: `1px solid ${c.border}` }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          style={{
            padding: 24, borderRadius: 12, textAlign: 'center',
            background: 'rgba(214,75,42,0.08)', border: '1px solid rgba(214,75,42,0.2)',
          }}
        >
          <p style={{ fontSize: 13, color: '#D64B2A' }}>{error}</p>
        </div>
      ) : contacts.length === 0 ? (
        <div style={{
          padding: 48, textAlign: 'center', borderRadius: 12,
          border: `1px dashed ${c.borderHover}`, background: c.surface,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            background: c.dawnMuted,
          }}>
            <Users size={22} color={c.dawn} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: c.text }}>
            {filter === 'all' ? 'No contacts yet' : filter === 'vip' ? 'No VIP contacts' : 'No cold contacts'}
          </p>
          <p style={{ fontSize: 13, color: c.textTertiary, marginTop: 4, maxWidth: 320, margin: '4px auto 0' }}>
            {filter === 'all'
              ? 'Connect Gmail or Outlook to auto-populate your contacts from email interactions.'
              : filter === 'vip'
                ? 'Add VIP contacts during onboarding or from the contact detail page.'
                : 'All your key relationships are active. Great work!'}
          </p>
          {filter === 'all' && (
            <a
              href="/settings/integrations"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16,
                padding: '8px 20px', borderRadius: 8, background: '#E8845C', color: '#1B1F3A',
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}
            >
              Connect integrations
            </a>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {contacts.map(contact => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onClick={handleContactClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
