import { getAccessToken } from './nango';

// Salesforce integration via Nango 'salesforce' provider.
// Fetches opportunities, tasks, and contacts for the authenticated user.
// Read-only: we never create or modify Salesforce records without user confirmation.

export interface ParsedSalesforceOpportunity {
  id: string;
  name: string;
  stage: string;
  amount: number;
  closeDate: string;
  probability: number;
  ownerName: string;
  accountName: string;
  lastModified: string;
  url: string;
}

export interface ParsedSalesforceTask {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  activityDate: string | null;
  ownerName: string;
  whoName: string;
  whatName: string;
  createdAt: string;
  url: string;
}

export async function getSalesforceClient(userId: string): Promise<{
  headers: Record<string, string>;
  instanceUrl: string;
}> {
  // Nango returns the Salesforce access token + instance URL via connection metadata
  const accessToken = await getAccessToken(userId, 'salesforce');

  // The instance URL is stored in Nango connection metadata; fallback to env var
  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL ?? 'https://login.salesforce.com';

  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    instanceUrl,
  };
}

async function sfQuery<T>(
  headers: Record<string, string>,
  instanceUrl: string,
  soql: string
): Promise<T[]> {
  const params = new URLSearchParams({ q: soql });
  const response = await fetch(
    `${instanceUrl}/services/data/v59.0/query?${params}`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`Salesforce SOQL error: ${response.status}`);
  }

  const data = (await response.json()) as { records?: T[]; totalSize?: number };
  return data.records ?? [];
}

/**
 * Fetches open Salesforce Opportunities owned by the authenticated user.
 */
export async function fetchSalesforceOpportunities(
  userId: string,
  limit = 50
): Promise<ParsedSalesforceOpportunity[]> {
  const { headers, instanceUrl } = await getSalesforceClient(userId);

  const soql = `
    SELECT Id, Name, StageName, Amount, CloseDate, Probability,
           Owner.Name, Account.Name, LastModifiedDate
    FROM Opportunity
    WHERE IsDeleted = false AND IsClosed = false AND Owner.Id = '${userId}'
    ORDER BY LastModifiedDate DESC
    LIMIT ${Math.min(limit, 200)}
  `.trim();

  const records = await sfQuery<Record<string, unknown>>(headers, instanceUrl, soql);
  return records.map((r) => parseSalesforceOpportunity(r, instanceUrl));
}

/**
 * Fetches open Salesforce Tasks for the authenticated user.
 */
export async function fetchSalesforceTasks(
  userId: string,
  limit = 50
): Promise<ParsedSalesforceTask[]> {
  const { headers, instanceUrl } = await getSalesforceClient(userId);

  const soql = `
    SELECT Id, Subject, Description, Status, Priority,
           ActivityDate, Owner.Name, Who.Name, What.Name, CreatedDate
    FROM Task
    WHERE IsDeleted = false AND Status != 'Completed' AND OwnerId = '${userId}'
    ORDER BY ActivityDate ASC NULLS LAST
    LIMIT ${Math.min(limit, 200)}
  `.trim();

  const records = await sfQuery<Record<string, unknown>>(headers, instanceUrl, soql);
  return records.map((r) => parseSalesforceTask(r, instanceUrl));
}

export function parseSalesforceOpportunity(
  raw: Record<string, unknown>,
  instanceUrl: string
): ParsedSalesforceOpportunity {
  const owner = raw.Owner as { Name?: string } | undefined;
  const account = raw.Account as { Name?: string } | undefined;
  const id = (raw.Id as string) ?? '';

  return {
    id,
    name: (raw.Name as string) ?? '',
    stage: (raw.StageName as string) ?? '',
    amount: (raw.Amount as number) ?? 0,
    closeDate: (raw.CloseDate as string) ?? '',
    probability: (raw.Probability as number) ?? 0,
    ownerName: owner?.Name ?? '',
    accountName: account?.Name ?? '',
    lastModified: (raw.LastModifiedDate as string) ?? new Date().toISOString(),
    url: `${instanceUrl}/${id}`,
  };
}

export function parseSalesforceTask(
  raw: Record<string, unknown>,
  instanceUrl: string
): ParsedSalesforceTask {
  const owner = raw.Owner as { Name?: string } | undefined;
  const who = raw.Who as { Name?: string } | undefined;
  const what = raw.What as { Name?: string } | undefined;
  const id = (raw.Id as string) ?? '';

  return {
    id,
    subject: (raw.Subject as string) ?? '',
    description: (raw.Description as string) ?? '',
    status: (raw.Status as string) ?? '',
    priority: (raw.Priority as string) ?? 'Normal',
    activityDate: (raw.ActivityDate as string | null) ?? null,
    ownerName: owner?.Name ?? '',
    whoName: who?.Name ?? '',
    whatName: what?.Name ?? '',
    createdAt: (raw.CreatedDate as string) ?? new Date().toISOString(),
    url: `${instanceUrl}/${id}`,
  };
}
