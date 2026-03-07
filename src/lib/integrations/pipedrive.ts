import { getAccessToken } from './nango';

// Pipedrive integration via Nango 'pipedrive' provider.
// Fetches deals and activities for the authenticated user.
// Read-only: we never create or modify Pipedrive records without user confirmation.

export interface ParsedPipedriveDeal {
  id: number;
  title: string;
  status: string;
  value: number;
  currency: string;
  stage: string;
  pipeline: string;
  ownerName: string;
  personName: string;
  personEmail: string;
  orgName: string;
  expectedCloseDate: string | null;
  addTime: string;
  updateTime: string;
  url: string;
}

export interface ParsedPipedriveActivity {
  id: number;
  subject: string;
  type: string;
  note: string;
  dueDate: string | null;
  dueTime: string | null;
  done: boolean;
  ownerName: string;
  personName: string;
  personEmail: string;
  dealTitle: string;
  addTime: string;
  url: string;
}

export async function getPipedriveClient(userId: string): Promise<{
  headers: Record<string, string>;
  baseUrl: string;
}> {
  const accessToken = await getAccessToken(userId, 'pipedrive');
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    baseUrl: 'https://api.pipedrive.com/v1',
  };
}

/**
 * Fetches open Pipedrive deals for the authenticated user.
 */
export async function fetchPipedriveDeals(
  userId: string,
  limit = 50
): Promise<ParsedPipedriveDeal[]> {
  const { headers, baseUrl } = await getPipedriveClient(userId);

  const params = new URLSearchParams({
    status: 'open',
    limit: String(Math.min(limit, 500)),
    sort: 'update_time DESC',
  });

  const response = await fetch(`${baseUrl}/deals?${params}`, { headers });

  if (!response.ok) {
    throw new Error(`Pipedrive deals error: ${response.status}`);
  }

  const data = (await response.json()) as {
    data?: Array<Record<string, unknown>>;
    success?: boolean;
  };

  return (data.data ?? []).map(parsePipedriveDeal);
}

/**
 * Fetches pending Pipedrive activities for the authenticated user.
 */
export async function fetchPipedriveActivities(
  userId: string,
  limit = 50
): Promise<ParsedPipedriveActivity[]> {
  const { headers, baseUrl } = await getPipedriveClient(userId);

  const params = new URLSearchParams({
    done: '0',
    limit: String(Math.min(limit, 500)),
    sort: 'due_date ASC',
  });

  const response = await fetch(`${baseUrl}/activities?${params}`, { headers });

  if (!response.ok) {
    throw new Error(`Pipedrive activities error: ${response.status}`);
  }

  const data = (await response.json()) as {
    data?: Array<Record<string, unknown>>;
    success?: boolean;
  };

  return (data.data ?? []).map(parsePipedriveActivity);
}

export function parsePipedriveDeal(raw: Record<string, unknown>): ParsedPipedriveDeal {
  const owner = raw.owner_name as string | undefined;
  const person = raw.person_name as string | undefined;
  const personEmail = raw.person_email as Array<{ value?: string }> | undefined;
  const org = raw.org_name as string | undefined;

  const id = (raw.id as number) ?? 0;

  return {
    id,
    title: (raw.title as string) ?? '',
    status: (raw.status as string) ?? 'open',
    value: (raw.value as number) ?? 0,
    currency: (raw.currency as string) ?? 'USD',
    stage: (raw.stage_id as string) ?? '',
    pipeline: (raw.pipeline_id as string) ?? '',
    ownerName: owner ?? '',
    personName: person ?? '',
    personEmail: personEmail?.[0]?.value ?? '',
    orgName: org ?? '',
    expectedCloseDate: (raw.expected_close_date as string | null) ?? null,
    addTime: (raw.add_time as string) ?? new Date().toISOString(),
    updateTime: (raw.update_time as string) ?? new Date().toISOString(),
    url: `https://app.pipedrive.com/deal/${id}`,
  };
}

export function parsePipedriveActivity(raw: Record<string, unknown>): ParsedPipedriveActivity {
  const personEmail = raw.person_email as Array<{ value?: string }> | undefined;
  const id = (raw.id as number) ?? 0;

  return {
    id,
    subject: (raw.subject as string) ?? '',
    type: (raw.type as string) ?? '',
    note: (raw.note as string) ?? '',
    dueDate: (raw.due_date as string | null) ?? null,
    dueTime: (raw.due_time as string | null) ?? null,
    done: (raw.done as boolean) ?? false,
    ownerName: (raw.owner_name as string) ?? '',
    personName: (raw.person_name as string) ?? '',
    personEmail: personEmail?.[0]?.value ?? '',
    dealTitle: (raw.deal_title as string) ?? '',
    addTime: (raw.add_time as string) ?? new Date().toISOString(),
    url: `https://app.pipedrive.com/activities/list`,
  };
}
