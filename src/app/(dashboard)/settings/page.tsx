import Link from 'next/link';
import {
  Sun,
  User,
  Shield,
  MessageCircle,
  CreditCard,
  Receipt,
  Plug,
  Zap,
  Lock,
  Database,
  Bell,
} from 'lucide-react';

const settingsSections = [
  {
    href: '/settings/appearance',
    label: 'Appearance',
    description: 'Light mode, dark mode, or system.',
    icon: Sun,
  },
  {
    href: '/settings/general',
    label: 'General',
    description: 'Name, email, and password.',
    icon: User,
  },
  {
    href: '/settings/privacy',
    label: 'Privacy Controls',
    description: 'Choose which apps Donna can observe.',
    icon: Shield,
  },
  {
    href: '/settings/chat',
    label: 'Chat',
    description: 'Custom instructions for how Donna responds.',
    icon: MessageCircle,
  },
  {
    href: '/settings/pricing',
    label: 'Pricing',
    description: 'View plans and upgrade or downgrade.',
    icon: CreditCard,
  },
  {
    href: '/settings/billing',
    label: 'Billing',
    description: 'Payment method, invoices, and cancellation.',
    icon: Receipt,
  },
  {
    href: '/settings/integrations',
    label: 'Integrations',
    description: 'Connect Gmail, Calendar, Slack, and more.',
    icon: Plug,
  },
  {
    href: '/settings/autonomy',
    label: 'Autonomy',
    description: 'Control how independently Donna acts.',
    icon: Zap,
  },
  {
    href: '/settings/security',
    label: 'Security',
    description: 'Sessions, audit log, and two-factor auth.',
    icon: Lock,
  },
  {
    href: '/settings/notifications',
    label: 'Notifications',
    description: 'Choose which proactive notifications Donna sends.',
    icon: Bell,
  },
  {
    href: '/settings/data',
    label: 'Data',
    description: 'Data region, exports, and deletion.',
    icon: Database,
  },
];

export default function SettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your account, integrations, and preferences.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {settingsSections.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 transition-colors hover:border-white/[0.12] hover:bg-white/[0.06]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground transition-colors group-hover:text-foreground">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium leading-none">{label}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
