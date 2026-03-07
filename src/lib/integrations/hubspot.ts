import { getAccessToken } from './nango';

// HubSpot integration via Nango 'hubspot' provider.
// Fetches deals, contacts, and tasks associated with the authenticated user.
// Read-only: we never create or modify HubSpot records without user confirmation.

export interface ParsedHubSpotDeal {
  id: string;
  name: string;
  stage: string;
  amount: number;
  closeDate: string | null;
  ownerName: string;
  contactName: string;
  contactEmail: string;
  companyName: string;
  lastModified: string;
  url: string;
}

export interface ParsedHubSpotTask {
  id: string;
  subject: string;
  body: string;
  status: string;
  dueDate: string | null;
  priority: string;
  ownerName: string;
  associatedContactEmail: string;
  createdAt: string;
  url: string;
}

export async function getHubSpotClient(userId: string): Promise<{
  headers: Record<string, string>;
  baseUrl: string;
}> {
  const accessToken = await getAccessToken(userId, 'hubspot');
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    baseUrl: 'https://api.hubapi.com',
  };
}

/**
 * Fetches HubSpot deals owned by or involving the authenticated user.
 */
export async function fetchHubSpotDeals(
  userId: string,
  limit = 50
): Promise<ParsedHubSpotDeal[]> {
  const { headers, baseUrl } = await getHubSpotClient(userId);

  const body = {
    filterGroups: [
      {
        filters: [
          { propertyName: 'dealstage', operator: 'NOT_IN', values: ['closedwon', 'closedlost'] },
        ],
      },
    ],
    properties: ['dealname', 'dealstage', 'amount', 'closedate', 'hubspot_owner_id', 'hs_lastmodifieddate'],
    limit: Math.min(limit, 100),
    sorts: [{ propertyName: 'hs_lastmodifieddate', direction: 'DESCENDING' }],
  };

  const response = await fetch(`${baseUrl}/crm/v3/objects/deals/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HubSpot deals error: ${response.status}`);
  }

  const data = (await response.json()) as {
    results?: Array<Record<string, unknown>>;
  };

  return (data.results ?? []).map(parseHubSpotDeal);
}

/**
 * Fetches HubSpot tasks due soon or overdue for the authenticated user.
 */
export async function fetchHubSpotTasks(
  userId: string,
  limit = 50
): Promise<ParsedHubSpotTask[]> {
  const { headers, baseUrl } = await getHubSpotClient(userId);

  const body = {
    filterGroups: [
      {
        filters: [
          { propertyName: 'hs_task_status', operator: 'NEQ', value: 'COMPLETED' },
        ],
      },
    ],
    properties: ['hs_task_subject', 'hs_task_body', 'hs_task_status', 'hs_timestamp', 'hs_task_priority', 'hubspot_owner_id'],
    limit: Math.min(limit, 100),
    sorts: [{ propertyName: 'hs_timestamp', direction: 'ASCENDING' }],
  };

  const response = await fetch(`${baseUrl}/crm/v3/objects/tasks/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HubSpot tasks error: ${response.status}`);
  }

  const data = (await response.json()) as {
    results?: Array<Record<string, unknown>>;
  };

  return (data.results ?? []).map(parseHubSpotTask);
}

export function parseHubSpotDeal(raw: Record<string, unknown>): ParsedHubSpotDeal {
  const props = raw.properties as Record<string, string | null> | undefined;
  const dealId = (raw.id as string) ?? '';

  return {
    id: dealId,
    name: props?.dealname ?? '(Unnamed Deal)',
    stage: props?.dealstage ?? '',
    amount: parseFloat(props?.amount ?? '0') || 0,
    closeDate: props?.closedate ?? null,
    ownerName: '', // Would need owner lookup
    contactName: '',
    contactEmail: '',
    companyName: '',
    lastModified: props?.hs_lastmodifieddate ?? new Date().toISOString(),
    url: `https://app.hubspot.com/contacts/deals/${dealId}`,
  };
}

export function parseHubSpotTask(raw: Record<string, unknown>): ParsedHubSpotTask {
  const props = raw.properties as Record<string, string | null> | undefined;
  const taskId = (raw.id as string) ?? '';

  return {
    id: taskId,
    subject: props?.hs_task_subject ?? '(No subject)',
    body: props?.hs_task_body ?? '',
    status: props?.hs_task_status ?? 'NOT_STARTED',
    dueDate: props?.hs_timestamp ?? null,
    priority: props?.hs_task_priority ?? 'NONE',
    ownerName: '',
    associatedContactEmail: '',
    createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
    url: `https://app.hubspot.com/tasks/${taskId}`,
  };
}
