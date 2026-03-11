export interface SettingsSearchItem {
  label: string;
  description: string;
  path: string;
  section: string; // breadcrumb shown in results
  keywords: string[];
}

/**
 * Static index of every settings page and notable item within them.
 * Searched client-side in the Command Palette — no API call needed.
 */
export const SETTINGS_INDEX: SettingsSearchItem[] = [
  // ── Top-level pages ──────────────────────────────────────────────────────

  {
    label: 'Integrations',
    description: 'Connect Gmail, Google Calendar, Slack, Notion and more',
    path: '/settings/integrations',
    section: 'Settings',
    keywords: ['integrations', 'connect', 'oauth', 'sync', 'accounts', 'apps', 'services'],
  },
  {
    label: 'Security',
    description: 'Two-factor auth, active sessions, audit log',
    path: '/settings/security',
    section: 'Settings',
    keywords: ['security', '2fa', 'two factor', 'password', 'sessions', 'login', 'audit', 'devices'],
  },
  {
    label: 'Privacy',
    description: 'Data privacy controls and content redaction',
    path: '/settings/privacy',
    section: 'Settings',
    keywords: ['privacy', 'redact', 'sensitive', 'personal', 'gdpr', 'data protection'],
  },
  {
    label: 'General',
    description: 'Profile, name, email, timezone, notifications',
    path: '/settings/general',
    section: 'Settings',
    keywords: ['general', 'profile', 'name', 'email', 'timezone', 'notifications', 'account', 'preferences'],
  },
  {
    label: 'Autonomy',
    description: 'Control which actions Donna can take automatically',
    path: '/settings/autonomy',
    section: 'Settings',
    keywords: ['autonomy', 'actions', 'automatic', 'permissions', 'approve', 'tier', 'silent', 'one-tap'],
  },
  {
    label: 'Chat Settings',
    description: 'Custom instructions and chat preferences',
    path: '/settings/chat',
    section: 'Settings',
    keywords: ['chat', 'instructions', 'custom', 'preferences', 'ai', 'donna', 'persona', 'style'],
  },
  {
    label: 'Data',
    description: 'Export data, delete account, manage stored content',
    path: '/settings/data',
    section: 'Settings',
    keywords: ['data', 'export', 'delete', 'account', 'download', 'storage', 'backup', 'archive'],
  },
  {
    label: 'Billing',
    description: 'Subscription, payment method, invoices',
    path: '/settings/billing',
    section: 'Settings',
    keywords: ['billing', 'subscription', 'payment', 'invoice', 'plan', 'credit card', 'receipt'],
  },
  {
    label: 'Pricing & Plans',
    description: 'Compare Free, Plus, and Pro plans',
    path: '/settings/pricing',
    section: 'Settings',
    keywords: ['pricing', 'plans', 'free', 'plus', 'pro', 'enterprise', 'cost', 'upgrade', 'features'],
  },
  {
    label: 'Operations',
    description: 'Morning sweep, overnight automations, AM briefing settings',
    path: '/settings/operations',
    section: 'Settings',
    keywords: ['operations', 'morning', 'am sweep', 'automation', 'daily', 'briefing', 'overnight'],
  },

  // ── Integrations — specific providers ────────────────────────────────────

  {
    label: 'Connect Gmail',
    description: 'Sync your Gmail inbox so Donna can read your emails',
    path: '/settings/integrations',
    section: 'Settings → Integrations',
    keywords: ['gmail', 'google', 'email', 'inbox', 'sync', 'connect', 'mail'],
  },
  {
    label: 'Connect Google Calendar',
    description: 'Sync events for meeting prep and scheduling intelligence',
    path: '/settings/integrations',
    section: 'Settings → Integrations',
    keywords: ['google calendar', 'calendar', 'events', 'meetings', 'google', 'schedule', 'gcal'],
  },
  {
    label: 'Connect Slack',
    description: 'Sync Slack messages, DMs, and channels',
    path: '/settings/integrations',
    section: 'Settings → Integrations',
    keywords: ['slack', 'messages', 'channels', 'workspace', 'dm', 'direct message'],
  },
  {
    label: 'Connect Notion',
    description: 'Sync Notion pages and databases for context retrieval',
    path: '/settings/integrations',
    section: 'Settings → Integrations',
    keywords: ['notion', 'docs', 'pages', 'database', 'wiki', 'documents', 'notes'],
  },

  // ── Security — specific items ─────────────────────────────────────────────

  {
    label: 'Two-Factor Authentication (2FA)',
    description: 'Add an extra layer of security to your account',
    path: '/settings/security',
    section: 'Settings → Security',
    keywords: ['2fa', 'two factor', 'authenticator', 'otp', 'totp', 'mfa', 'verification code'],
  },
  {
    label: 'Active Sessions',
    description: 'View and revoke active login sessions and devices',
    path: '/settings/security',
    section: 'Settings → Security',
    keywords: ['sessions', 'devices', 'logout', 'revoke', 'active', 'sign out', 'all devices'],
  },
  {
    label: 'Audit Log',
    description: 'Full history of actions Donna has taken on your behalf',
    path: '/settings/security',
    section: 'Settings → Security',
    keywords: ['audit', 'log', 'history', 'actions', 'activity', 'record', 'what donna did'],
  },

  // ── Data — specific items ─────────────────────────────────────────────────

  {
    label: 'Export My Data',
    description: 'Download all your Donna data as a JSON archive',
    path: '/settings/data',
    section: 'Settings → Data',
    keywords: ['export', 'download', 'archive', 'backup', 'json', 'data portability', 'my data'],
  },
  {
    label: 'Delete Account',
    description: 'Permanently delete your account and all associated data',
    path: '/settings/data',
    section: 'Settings → Data',
    keywords: ['delete account', 'close account', 'remove account', 'terminate', 'gdpr', 'erasure', 'cancel'],
  },

  // ── Chat — specific items ─────────────────────────────────────────────────

  {
    label: 'Custom Instructions',
    description: 'Tell Donna how to communicate and what to prioritise',
    path: '/settings/chat',
    section: 'Settings → Chat',
    keywords: ['instructions', 'custom', 'prompt', 'persona', 'style', 'how to talk', 'context', 'personality'],
  },

  // ── Billing — specific items ──────────────────────────────────────────────

  {
    label: 'Upgrade to Plus',
    description: '$20/mo — expanded limits and priority processing',
    path: '/settings/pricing',
    section: 'Settings → Pricing',
    keywords: ['plus', 'upgrade', '$20', '20 dollars', 'premium', 'subscribe'],
  },
  {
    label: 'Upgrade to Pro',
    description: '$35/mo — full feature access including advanced AI',
    path: '/settings/pricing',
    section: 'Settings → Pricing',
    keywords: ['pro', 'upgrade', '$35', '35 dollars', 'advanced', 'enterprise', 'full access'],
  },

  // ── Autonomy — specific items ─────────────────────────────────────────────

  {
    label: 'Auto-approve Actions',
    description: 'Set which actions Donna can execute silently without asking',
    path: '/settings/autonomy',
    section: 'Settings → Autonomy',
    keywords: ['auto approve', 'silent', 'automatic', 'tier 1', 'no confirmation', 'execute'],
  },
];

/**
 * Client-side search against the settings index.
 * Scores by label match (highest), keyword match, then description match.
 */
export function searchSettings(query: string): SettingsSearchItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const scored = SETTINGS_INDEX
    .map((item) => {
      let score = 0;
      if (item.label.toLowerCase().includes(q)) score += 10;
      if (item.keywords.some((k) => k.includes(q) || q.includes(k))) score += 5;
      if (item.description.toLowerCase().includes(q)) score += 2;
      if (item.section.toLowerCase().includes(q)) score += 1;
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);

  // Deduplicate by path+label
  const seen = new Set<string>();
  return scored.filter((item) => {
    const key = `${item.path}::${item.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
}
