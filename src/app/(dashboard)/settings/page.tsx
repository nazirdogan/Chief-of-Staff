import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plug, Shield, Database } from 'lucide-react';

const settingsSections = [
  {
    href: '/settings/integrations',
    label: 'Integrations',
    description: 'Connect Gmail, Calendar, Slack, and more.',
    icon: Plug,
  },
  {
    href: '/settings/security',
    label: 'Security',
    description: 'Sessions, audit log, and two-factor authentication.',
    icon: Shield,
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
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-muted-foreground">
        Manage your account, integrations, and preferences.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map(({ href, label, description, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{label}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
