'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';
import { MessageSquarePlus } from 'lucide-react';

type FeedbackType = 'bug' | 'feature' | 'general' | 'praise';

const TYPES: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'general', label: 'General' },
  { value: 'praise', label: 'Praise' },
];

const c = {
  surface: 'rgba(255,255,255,0.04)',
  bg: '#0A0A0B',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
  brass: '#A89968',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.85)',
  textTertiary: 'rgba(255,255,255,0.55)',
  textQuaternary: 'rgba(255,255,255,0.35)',
};

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pathname = usePathname();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      type: formData.get('type') as string,
      message: formData.get('message') as string,
      page: pathname,
    };

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to submit');
      toast.success('Thank you for your feedback!');
      setOpen(false);
    } catch {
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.3)] transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:scale-105"
        style={{
          background: '#A89968',
          color: '#0A0A0B',
          fontFamily: "'Satoshi', sans-serif",
        }}
        aria-label="Send feedback"
      >
        <MessageSquarePlus size={18} />
      </button>

      {/* Panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed bottom-20 right-6 z-50 w-80 rounded-xl p-5 shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
            style={{
              background: c.surface,
              border: `1px solid ${c.border}`,
              fontFamily: "'Satoshi', sans-serif",
            }}
          >
            <h3
              className="text-[14px] font-semibold tracking-[-0.01em]"
              style={{ color: c.text }}
            >
              Send feedback
            </h3>
            <p className="mt-0.5 text-[12px]" style={{ color: c.textQuaternary }}>
              Help us improve Donna during beta.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="fb-type"
                  className="text-[11px] font-semibold tracking-[0.05em] uppercase"
                  style={{ color: c.textQuaternary }}
                >
                  Type
                </label>
                <select
                  id="fb-type"
                  name="type"
                  defaultValue="general"
                  className="h-9 w-full rounded-lg px-3 text-[13px] outline-none transition-all duration-200"
                  style={{
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    color: c.text,
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = c.borderHover; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = c.border; }}
                >
                  {TYPES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="fb-message"
                  className="text-[11px] font-semibold tracking-[0.05em] uppercase"
                  style={{ color: c.textQuaternary }}
                >
                  Message
                </label>
                <textarea
                  id="fb-message"
                  name="message"
                  required
                  rows={3}
                  placeholder="What's on your mind?"
                  className="w-full resize-none rounded-lg px-3 py-2 text-[13px] outline-none transition-all duration-200"
                  style={{
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    color: c.text,
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = c.borderHover; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = c.border; }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 text-[13px] font-medium transition-all duration-200"
                  style={{ color: c.textTertiary }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(120,110,80,0.04)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg px-5 py-2 text-[13px] font-semibold transition-all duration-200 hover:shadow-[0_2px_12px_rgba(0,0,0,0.3)] disabled:opacity-50"
                  style={{
                    background: '#A89968',
                    color: '#0A0A0B',
                  }}
                >
                  {submitting ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
