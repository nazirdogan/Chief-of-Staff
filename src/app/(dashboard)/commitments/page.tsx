import { CommitmentQueue } from '@/components/commitments/CommitmentQueue';

export default function CommitmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Commitments</h1>
        <p className="text-sm text-muted-foreground">
          Promises you made in outbound messages. Resolve, snooze, or dismiss.
        </p>
      </div>
      <CommitmentQueue />
    </div>
  );
}
