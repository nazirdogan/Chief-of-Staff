'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ContactCard } from '@/components/people/ContactCard';
import type { Contact } from '@/lib/db/types';

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">People</h1>
        <p className="text-sm text-muted-foreground">
          Your contacts with relationship scores and interaction history.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All ({contacts.length})
        </Button>
        <Button
          size="sm"
          variant={filter === 'vip' ? 'default' : 'outline'}
          onClick={() => setFilter('vip')}
        >
          VIP ({vipCount})
        </Button>
        <Button
          size="sm"
          variant={filter === 'cold' ? 'default' : 'outline'}
          onClick={() => setFilter('cold')}
        >
          Cold ({coldCount})
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading contacts...</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : contacts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm font-medium">
            {filter === 'all'
              ? 'No contacts yet'
              : filter === 'vip'
                ? 'No VIP contacts'
                : 'No cold contacts'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === 'all'
              ? 'Connect Gmail or Outlook to auto-populate your contacts from email interactions.'
              : filter === 'vip'
                ? 'Add VIP contacts during onboarding or from the contact detail page.'
                : 'All your key relationships are active. Great work!'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
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
