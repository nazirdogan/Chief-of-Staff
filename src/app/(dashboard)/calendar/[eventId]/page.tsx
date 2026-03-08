import MeetingDetailPage from '@/components/meetings/MeetingDetailPage';

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return <MeetingDetailPage eventId={eventId} />;
}
