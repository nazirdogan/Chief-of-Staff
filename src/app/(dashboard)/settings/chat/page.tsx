'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { BackButton } from '@/components/shared/BackButton';

const MAX_LENGTH = 2000;

export default function ChatSettingsPage() {
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/chat');
      if (res.ok) {
        const data = await res.json();
        setInstructions(data.custom_instructions ?? '');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveInstructions = useCallback(async (value: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_instructions: value || null }),
      });
      if (res.ok) {
        setLastSaved(new Date().toLocaleTimeString());
        setTimeout(() => setLastSaved(null), 3000);
      }
    } catch (err) {
      console.error('Failed to save custom instructions:', err);
    } finally {
      setSaving(false);
    }
  }, []);

  function handleBlur() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    saveInstructions(instructions);
  }

  function handleChange(value: string) {
    if (value.length > MAX_LENGTH) return;
    setInstructions(value);

    // Debounced auto-save while typing (1.5s)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      saveInstructions(value);
    }, 1500);
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chat</h1>
        <div className="mt-4 flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton href="/settings" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chat</h1>
        <p className="text-sm text-muted-foreground">
          Customize how Donna responds in conversations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom Instructions</CardTitle>
          <CardDescription>
            Tell Donna how you prefer responses. These instructions are applied to every
            conversation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="custom-instructions">Instructions</Label>
            <Textarea
              id="custom-instructions"
              value={instructions}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
              placeholder="e.g. Be concise. Prefer bullet points. Always end with next steps. Address me as Nazir."
              rows={6}
              className="resize-none"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {saving && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Saving...</span>
                </>
              )}
              {!saving && lastSaved && (
                <span className="text-green-600">Saved at {lastSaved}</span>
              )}
            </div>
            <span>
              {instructions.length} / {MAX_LENGTH}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
