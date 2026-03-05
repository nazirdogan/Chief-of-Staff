'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/db/browser-client';
import type { Commitment } from '@/lib/db/types';

interface CommitmentCalibrationStepProps {
  onNext: (decisions: Record<string, boolean>) => void;
  onBack: () => void;
}

export function CommitmentCalibrationStep({
  onNext,
  onBack,
}: CommitmentCalibrationStepProps) {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCommitments() {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data } = await supabase
        .from('commitments')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('confidence_score', { ascending: false })
        .limit(10);

      setCommitments((data as Commitment[]) ?? []);
      setLoading(false);
    }

    fetchCommitments();
  }, []);

  function handleDecision(commitmentId: string, confirmed: boolean) {
    setDecisions((prev) => ({ ...prev, [commitmentId]: confirmed }));
  }

  function handleNext() {
    onNext(decisions);
  }

  const allDecided =
    commitments.length > 0 &&
    commitments.every((c) => c.id in decisions);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Calibrate your commitments</h2>
        <p className="text-sm text-muted-foreground">
          {commitments.length > 0
            ? 'We found these commitments from your recent messages. Confirm the real ones and dismiss false positives to train the model.'
            : 'No commitments extracted yet. You can skip this step and calibrate later as messages are processed.'}
        </p>
      </div>

      {commitments.length > 0 && (
        <div className="space-y-3">
          {commitments.map((commitment) => {
            const decision = decisions[commitment.id];
            const isConfirmed = decision === true;
            const isDismissed = decision === false;

            return (
              <Card
                key={commitment.id}
                className={
                  isConfirmed
                    ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950'
                    : isDismissed
                      ? 'border-muted bg-muted/30 opacity-60'
                      : ''
                }
              >
                <CardContent className="flex items-start gap-4 py-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium">
                      {commitment.commitment_text}
                    </p>
                    <blockquote className="border-l-2 border-muted-foreground/30 pl-3 text-xs italic text-muted-foreground">
                      &ldquo;{commitment.source_quote}&rdquo;
                    </blockquote>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        To: {commitment.recipient_name || commitment.recipient_email}
                      </span>
                      <Badge variant={commitment.confidence === 'high' ? 'default' : 'secondary'}>
                        {commitment.confidence}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant={isConfirmed ? 'default' : 'outline'}
                      onClick={() => handleDecision(commitment.id, true)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={isDismissed ? 'destructive' : 'outline'}
                      onClick={() => handleDecision(commitment.id, false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>
          {commitments.length === 0
            ? 'Skip & Finish'
            : allDecided
              ? 'Finish'
              : 'Finish (some unreviewed)'}
        </Button>
      </div>
    </div>
  );
}
