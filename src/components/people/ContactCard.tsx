'use client';

import type { Contact } from '@/lib/db/types';

const c = {
  surface: 'rgba(45,45,45,0.04)',
  border: 'rgba(45,45,45,0.08)',
  borderHover: 'rgba(45,45,45,0.16)',
  dawn: '#E8845C',
  dawnSubtle: 'rgba(232,132,92,0.15)',
  text: '#2D2D2D',
  textSecondary: 'rgba(45,45,45,0.8)',
  textTertiary: 'rgba(45,45,45,0.6)',
  textQuaternary: 'rgba(45,45,45,0.5)',
  green: '#52B788',
  red: '#D64B2A',
  purple: '#6B21A8',
};

interface ContactCardProps {
  contact: Contact;
  onClick?: (contact: Contact) => void;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;

  let color = c.textQuaternary;
  if (score >= 70) color = c.green;
  else if (score >= 40) color = '#92400E';
  else color = c.red;

  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color,
      padding: '2px 8px', borderRadius: 4,
      background: `${color}10`,
    }}>
      {score}
    </span>
  );
}

export function ContactCard({ contact, onClick }: ContactCardProps) {
  const lastInteraction = contact.last_interaction_at
    ? new Date(contact.last_interaction_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : 'Never';

  return (
    <div
      style={{
        padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
        border: `1px solid ${contact.is_cold ? 'rgba(192,57,43,0.15)' : c.border}`,
        background: c.surface,
        transition: 'border-color 0.15s, transform 0.15s',
      }}
      onClick={() => onClick?.(contact)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = c.borderHover;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = contact.is_cold ? 'rgba(192,57,43,0.15)' : (c.border as string);
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: c.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {contact.name ?? contact.email}
          </div>
          {contact.name && (
            <div style={{
              fontSize: 12, color: c.textTertiary, marginTop: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {contact.email}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 12 }}>
          {contact.is_vip && (
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 4,
              background: `${c.purple}10`, color: c.purple, fontWeight: 600,
            }}>
              VIP
            </span>
          )}
          {contact.is_cold && (
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 4,
              background: `${c.red}10`, color: c.red, fontWeight: 600,
            }}>
              Cold
            </span>
          )}
          <ScoreBadge score={contact.relationship_score} />
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: c.textQuaternary }}>
        {contact.organisation && <span>{contact.organisation}</span>}
        <span>Last: {lastInteraction}</span>
        <span>{contact.interaction_count_30d} interactions (30d)</span>
        {contact.open_commitments_count > 0 && (
          <span style={{ color: '#92400E' }}>
            {contact.open_commitments_count} open commitment{contact.open_commitments_count > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
