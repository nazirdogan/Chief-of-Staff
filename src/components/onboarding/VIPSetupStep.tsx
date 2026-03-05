'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface VIPContact {
  email: string;
  name: string;
}

interface VIPSetupStepProps {
  initialContacts: VIPContact[];
  onNext: (contacts: VIPContact[]) => void;
}

export function VIPSetupStep({ initialContacts, onNext }: VIPSetupStepProps) {
  const [contacts, setContacts] = useState<VIPContact[]>(
    initialContacts.length > 0 ? initialContacts : [{ email: '', name: '' }]
  );

  function addContact() {
    if (contacts.length >= 5) return;
    setContacts([...contacts, { email: '', name: '' }]);
  }

  function removeContact(index: number) {
    setContacts(contacts.filter((_, i) => i !== index));
  }

  function updateContact(index: number, field: keyof VIPContact, value: string) {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  }

  function handleNext() {
    const validContacts = contacts.filter((c) => c.email.trim() !== '');
    onNext(validContacts);
  }

  const hasAtLeastOne = contacts.some((c) => c.email.trim() !== '');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Who are your VIPs?</h2>
        <p className="text-sm text-muted-foreground">
          Enter up to 5 contacts whose messages should always be prioritised.
          These could be your manager, key clients, or close collaborators.
        </p>
      </div>

      <div className="space-y-4">
        {contacts.map((contact, index) => (
          <div key={index} className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor={`vip-name-${index}`} className="text-xs">
                Name
              </Label>
              <Input
                id={`vip-name-${index}`}
                placeholder="Sarah Johnson"
                value={contact.name}
                onChange={(e) => updateContact(index, 'name', e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor={`vip-email-${index}`} className="text-xs">
                Email
              </Label>
              <Input
                id={`vip-email-${index}`}
                type="email"
                placeholder="sarah@example.com"
                value={contact.email}
                onChange={(e) => updateContact(index, 'email', e.target.value)}
              />
            </div>
            {contacts.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeContact(index)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {contacts.length < 5 && (
        <Button type="button" variant="outline" size="sm" onClick={addContact}>
          Add another contact
        </Button>
      )}

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!hasAtLeastOne}>
          Next
        </Button>
      </div>
    </div>
  );
}
