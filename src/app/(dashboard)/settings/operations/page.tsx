'use client';

import { useEffect, useState } from 'react';
import { Settings2, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BackButton } from '@/components/shared/BackButton';

const c = {
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.85)',
  textTertiary: 'rgba(255,255,255,0.55)',
  border: 'rgba(255,255,255,0.07)',
  dawnMuted: 'rgba(232,132,92,0.15)',
  dawn: '#E8845C',
  green: '#52B788',
  surface: 'rgba(255,255,255,0.04)',
};

interface OpsConfig {
  overnight_enabled: boolean;
  overnight_run_time: string;
  home_tasks_after: string;
  exercise_days: number[];
  exercise_duration_minutes: number;
  default_buffer_minutes: number;
  deep_work_preferred_time: string;
  errand_batch_enabled: boolean;
  home_address: string | null;
  office_address: string | null;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function OperationsSettingsPage() {
  const [config, setConfig] = useState<OpsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings/operations')
      .then((r) => r.json())
      .then((data) => setConfig(data.config))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings/operations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error();
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof OpsConfig>(field: K, value: OpsConfig[K]) {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  }

  function toggleExerciseDay(day: number) {
    if (!config) return;
    const days = config.exercise_days.includes(day)
      ? config.exercise_days.filter((d) => d !== day)
      : [...config.exercise_days, day].sort();
    update('exercise_days', days);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: c.textTertiary }}>
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  }

  if (!config) return null;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <BackButton href="/settings" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Settings2 size={20} color={c.dawn} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: 0 }}>Operations Settings</h1>
        </div>
        <button
          onClick={save}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            borderRadius: 8, border: 'none', background: c.dawn, color: '#1B1F3A',
            fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Overnight Automations */}
        <Section title="Overnight Automations">
          <ToggleRow
            label="Enable overnight automations"
            description="Calendar transit + email triage run before you wake up"
            checked={config.overnight_enabled}
            onChange={(v) => update('overnight_enabled', v)}
          />
          <TimeRow
            label="Run time"
            value={config.overnight_run_time}
            onChange={(v) => update('overnight_run_time', v)}
          />
        </Section>

        {/* Addresses */}
        <Section title="Locations">
          <TextRow
            label="Home address"
            placeholder="123 Main St, City"
            value={config.home_address ?? ''}
            onChange={(v) => update('home_address', v || null)}
          />
          <TextRow
            label="Office address"
            placeholder="456 Business Ave, City"
            value={config.office_address ?? ''}
            onChange={(v) => update('office_address', v || null)}
          />
        </Section>

        {/* Scheduling Preferences */}
        <Section title="Scheduling">
          <TimeRow
            label="Home tasks after"
            value={config.home_tasks_after}
            onChange={(v) => update('home_tasks_after', v)}
          />
          <SelectRow
            label="Deep work preferred time"
            value={config.deep_work_preferred_time}
            options={[
              { value: 'morning', label: 'Morning (before noon)' },
              { value: 'afternoon', label: 'Afternoon (after 1pm)' },
            ]}
            onChange={(v) => update('deep_work_preferred_time', v)}
          />
          <NumberRow
            label="Buffer between meetings (min)"
            value={config.default_buffer_minutes}
            min={0}
            max={30}
            onChange={(v) => update('default_buffer_minutes', v)}
          />
          <ToggleRow
            label="Batch errands"
            description="Group errands into one optimized outing"
            checked={config.errand_batch_enabled}
            onChange={(v) => update('errand_batch_enabled', v)}
          />
        </Section>

        {/* Exercise */}
        <Section title="Exercise">
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: c.text, display: 'block', marginBottom: 8 }}>
              Exercise days
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => toggleExerciseDay(i)}
                  style={{
                    width: 40, height: 40, borderRadius: 8, fontSize: 12, fontWeight: 500,
                    border: `1px solid ${config.exercise_days.includes(i) ? c.dawn : c.border}`,
                    background: config.exercise_days.includes(i) ? `${c.dawn}15` : c.surface,
                    color: config.exercise_days.includes(i) ? c.dawn : c.textTertiary,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <NumberRow
            label="Exercise duration (min)"
            value={config.exercise_duration_minutes}
            min={15}
            max={180}
            onChange={(v) => update('exercise_duration_minutes', v)}
          />
        </Section>
      </div>
    </div>
  );
}

// ── Reusable form components ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 20, borderRadius: 12, border: `1px solid ${c.border}` }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: c.text, margin: '0 0 16px' }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: c.text }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: c.textTertiary }}>{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: checked ? c.dawn : '#D1D5DB', position: 'relative', transition: 'background 0.2s',
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: 9, background: '#FFFFFF',
          position: 'absolute', top: 3, left: checked ? 23 : 3, transition: 'left 0.2s',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  );
}

function TimeRow({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: c.text }}>{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '6px 10px', borderRadius: 6, border: `1px solid ${c.border}`,
          fontSize: 13, color: c.text, background: c.surface,
        }}
      />
    </div>
  );
}

function TextRow({ label, placeholder, value, onChange }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 500, color: c.text, display: 'block', marginBottom: 4 }}>{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${c.border}`,
          fontSize: 13, color: c.text, background: c.surface, boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

function NumberRow({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: c.text }}>{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: 70, padding: '6px 10px', borderRadius: 6, border: `1px solid ${c.border}`,
          fontSize: 13, color: c.text, background: c.surface, textAlign: 'center',
        }}
      />
    </div>
  );
}

function SelectRow({ label, value, options, onChange }: {
  label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: c.text }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '6px 10px', borderRadius: 6, border: `1px solid ${c.border}`,
          fontSize: 13, color: c.text, background: c.surface,
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
