'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/db/browser-client';

interface VIPContact {
  email: string;
  name: string;
  suggested: boolean;
  confirmed: boolean;
}

interface ConfirmVIPsStepProps {
  onNext: (contacts: Array<{ email: string; name: string }>) => void;
  onBack: () => void;
}

function getInitials(name: string, email: string): string {
  if (name) {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0]?.[0]?.toUpperCase() || email[0]?.toUpperCase() || '?';
  }
  return email[0]?.toUpperCase() || '?';
}

const AVATAR_COLORS = [
  'rgba(232, 132, 92, 0.15)', // dawn
  'rgba(78, 125, 170, 0.15)', // dusk
  'rgba(82, 183, 136, 0.15)', // sage
  'rgba(244, 200, 150, 0.15)', // gold
  'rgba(155, 175, 196, 0.12)', // mist
];

const AVATAR_TEXT_COLORS = [
  '#E8845C', '#4E7DAA', '#52B788', '#F4C896', '#9BAFC4',
];

export function ConfirmVIPsStep({ onNext, onBack }: ConfirmVIPsStepProps) {
  const [contacts, setContacts] = useState<VIPContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  useEffect(() => {
    async function load() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from('contacts')
          .select('email, name, interaction_count_30d, relationship_score')
          .eq('user_id', user.id)
          .order('interaction_count_30d', { ascending: false })
          .limit(8);

        if (data?.length) {
          setContacts(
            (data as Array<{ email: string; name: string | null; interaction_count_30d: number }>)
              .slice(0, 8)
              .map((c) => ({ email: c.email, name: c.name || '', suggested: true, confirmed: true }))
          );
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  function toggle(i: number) { setContacts((p) => p.map((c, j) => j === i ? { ...c, confirmed: !c.confirmed } : c)); }
  function addManual() {
    if (!manualEmail.trim()) return;
    setContacts((p) => [...p, { email: manualEmail.trim().toLowerCase(), name: manualName.trim(), suggested: false, confirmed: true }]);
    setManualEmail(''); setManualName(''); setShowManualAdd(false);
  }

  const confirmed = contacts.filter((c) => c.confirmed);

  if (loading) {
    return (
      <div className="flex flex-col items-center py-16">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#9BAFC4' }} />
        <p className="mt-3 text-[13px]" style={{ color: 'rgba(155,175,196,0.5)' }}>Finding your contacts...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <h2
        className="transition-all duration-700"
        style={{
          fontSize: '22px', fontStyle: 'italic', color: '#FBF7F4',
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        Your VIPs
      </h2>
      <p
        className="mt-3 max-w-[340px] text-[13px] leading-[1.65] transition-all duration-700"
        style={{
          color: '#9BAFC4',
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transitionDelay: '100ms', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {contacts.length > 0
          ? 'Tap to confirm who matters most. Their messages always get priority.'
          : 'Add contacts whose messages should always be prioritised.'}
      </p>

      <div
        className="mt-6 w-full space-y-1.5 transition-all duration-700"
        style={{
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transitionDelay: '250ms', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {contacts.map((contact, i) => (
          <button
            key={contact.email}
            onClick={() => toggle(i)}
            className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-300"
            style={{
              background: contact.confirmed ? 'rgba(82, 183, 136, 0.04)' : 'transparent',
              border: contact.confirmed
                ? '1px solid rgba(82, 183, 136, 0.12)'
                : '1px solid rgba(251, 247, 244, 0.04)',
              opacity: contact.confirmed ? 1 : 0.5,
            }}
          >
            {/* Avatar */}
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-all duration-300"
              style={{
                fontFamily: 'var(--font-mono)',
                background: contact.confirmed ? AVATAR_COLORS[i % AVATAR_COLORS.length] : 'rgba(251,247,244,0.04)',
                color: contact.confirmed ? AVATAR_TEXT_COLORS[i % AVATAR_TEXT_COLORS.length] : 'rgba(155,175,196,0.3)',
              }}
            >
              {getInitials(contact.name, contact.email)}
            </div>

            <div className="flex-1 min-w-0">
              <p className="truncate text-[13px] font-medium" style={{ color: '#FBF7F4' }}>
                {contact.name || contact.email}
              </p>
              {contact.name && (
                <p className="truncate text-[11px]" style={{ color: 'rgba(155,175,196,0.4)' }}>
                  {contact.email}
                </p>
              )}
            </div>

            {contact.suggested && (
              <span
                className="shrink-0 text-[8px] font-medium tracking-[0.12em]"
                style={{ fontFamily: 'var(--font-mono)', color: 'rgba(155,175,196,0.2)', textTransform: 'uppercase' as const }}
              >
                Suggested
              </span>
            )}

            {/* Check indicator */}
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-300"
              style={{
                background: contact.confirmed ? 'rgba(82, 183, 136, 0.15)' : 'rgba(251,247,244,0.04)',
                border: contact.confirmed ? '1px solid rgba(82, 183, 136, 0.25)' : '1px solid rgba(251,247,244,0.06)',
              }}
            >
              {contact.confirmed && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="#52B788" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </button>
        ))}

        {/* Manual add */}
        {showManualAdd ? (
          <div className="space-y-2 rounded-xl p-3" style={{ background: 'rgba(14,18,37,0.5)', border: '1px solid rgba(251,247,244,0.06)' }}>
            <Input placeholder="Name (optional)" value={manualName} onChange={(e) => setManualName(e.target.value)} className="h-8 text-[12px] bg-transparent border-border/30" />
            <Input type="email" placeholder="email@example.com" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addManual()} className="h-8 text-[12px] bg-transparent border-border/30" />
            <div className="flex gap-2">
              <button onClick={() => setShowManualAdd(false)} className="flex-1 rounded-lg py-1.5 text-[11px]" style={{ color: 'rgba(155,175,196,0.5)' }}>Cancel</button>
              <button onClick={addManual} disabled={!manualEmail.trim()} className="flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-opacity" style={{ background: 'rgba(232,132,92,0.1)', color: '#E8845C', opacity: manualEmail.trim() ? 1 : 0.3 }}>Add</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowManualAdd(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl p-3 text-[12px] transition-colors duration-200"
            style={{ border: '1px dashed rgba(251,247,244,0.06)', color: 'rgba(155,175,196,0.35)' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Add someone manually
          </button>
        )}
      </div>

      {confirmed.length > 0 && (
        <p className="mt-4 text-[10px]" style={{ fontFamily: 'var(--font-mono)', color: 'rgba(82,183,136,0.5)', letterSpacing: '0.05em' }}>
          {confirmed.length} VIP{confirmed.length !== 1 ? 's' : ''} selected
        </p>
      )}

      <div className="mt-7 flex w-full items-center justify-between">
        <button onClick={onBack} className="text-[12px] font-medium transition-colors hover:underline" style={{ color: 'rgba(155,175,196,0.4)' }}>Back</button>
        <button
          onClick={() => onNext(confirmed.map((c) => ({ email: c.email, name: c.name })))}
          className="rounded-lg px-5 py-2 text-[13px] font-medium transition-all duration-300"
          style={{
            background: confirmed.length > 0 ? 'linear-gradient(135deg, #E8845C, #D4704A)' : 'rgba(251,247,244,0.05)',
            color: confirmed.length > 0 ? '#FBF7F4' : 'rgba(155,175,196,0.5)',
            border: confirmed.length > 0 ? 'none' : '1px solid rgba(251,247,244,0.06)',
          }}
        >
          {confirmed.length > 0 ? 'Continue' : 'Skip for now'}
        </button>
      </div>
    </div>
  );
}
