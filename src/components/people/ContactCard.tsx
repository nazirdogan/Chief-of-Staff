'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Contact } from '@/lib/db/types';

interface ContactCardProps {
  contact: Contact;
  onClick?: (contact: Contact) => void;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;

  let color = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  if (score >= 70) color = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  else if (score >= 40) color = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  else color = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';

  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
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
    <Card
      className={`cursor-pointer transition-colors hover:bg-muted/50 ${contact.is_cold ? 'border-red-200 dark:border-red-900' : ''}`}
      onClick={() => onClick?.(contact)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <CardTitle className="truncate text-sm">
              {contact.name ?? contact.email}
            </CardTitle>
            {contact.name && (
              <p className="truncate text-xs text-muted-foreground">{contact.email}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {contact.is_vip && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                VIP
              </span>
            )}
            {contact.is_cold && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
                Cold
              </span>
            )}
            <ScoreBadge score={contact.relationship_score} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 text-xs text-muted-foreground">
          {contact.organisation && (
            <span>{contact.organisation}</span>
          )}
          <span>Last: {lastInteraction}</span>
          <span>{contact.interaction_count_30d} interactions (30d)</span>
          {contact.open_commitments_count > 0 && (
            <span className="text-yellow-600 dark:text-yellow-400">
              {contact.open_commitments_count} open commitment{contact.open_commitments_count > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
