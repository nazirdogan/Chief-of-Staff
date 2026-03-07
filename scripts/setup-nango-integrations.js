/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: '.env.local' });
const KEY = process.env.NANGO_SECRET_KEY;

const PROVIDERS = [
  { key: 'microsoft', idEnv: 'MICROSOFT_CLIENT_ID', secretEnv: 'MICROSOFT_CLIENT_SECRET', scopes: 'Mail.Read Calendars.Read offline_access' },
  { key: 'microsoft-teams', idEnv: 'MICROSOFT_CLIENT_ID', secretEnv: 'MICROSOFT_CLIENT_SECRET', scopes: 'Chat.Read ChannelMessage.Read.All offline_access' },
  { key: 'slack', idEnv: 'SLACK_CLIENT_ID', secretEnv: 'SLACK_CLIENT_SECRET', scopes: 'channels:history,im:history,users:read,users:read.email' },
  { key: 'linkedin', idEnv: 'LINKEDIN_CLIENT_ID', secretEnv: 'LINKEDIN_CLIENT_SECRET', scopes: 'r_liteprofile r_emailaddress' },
  { key: 'twitter', idEnv: 'TWITTER_CLIENT_ID', secretEnv: 'TWITTER_CLIENT_SECRET', authType: 'OAUTH1', scopes: '' },
  { key: 'dropbox', idEnv: 'DROPBOX_CLIENT_ID', secretEnv: 'DROPBOX_CLIENT_SECRET', scopes: 'files.metadata.read files.content.read' },
  { key: 'linear', idEnv: 'LINEAR_CLIENT_ID', secretEnv: 'LINEAR_CLIENT_SECRET', scopes: 'read' },
  { key: 'github', idEnv: 'GITHUB_CLIENT_ID', secretEnv: 'GITHUB_CLIENT_SECRET', scopes: 'repo read:user notifications' },
  { key: 'calendly', idEnv: 'CALENDLY_CLIENT_ID', secretEnv: 'CALENDLY_CLIENT_SECRET', scopes: '' },
  { key: 'asana', idEnv: 'ASANA_CLIENT_ID', secretEnv: 'ASANA_CLIENT_SECRET', scopes: 'default' },
  { key: 'monday', idEnv: 'MONDAY_CLIENT_ID', secretEnv: 'MONDAY_CLIENT_SECRET', scopes: 'boards:read' },
  { key: 'jira', idEnv: 'ATLASSIAN_CLIENT_ID', secretEnv: 'ATLASSIAN_CLIENT_SECRET', scopes: 'read:jira-work read:jira-user' },
  { key: 'trello', idEnv: 'ATLASSIAN_CLIENT_ID', secretEnv: 'ATLASSIAN_CLIENT_SECRET', authType: 'OAUTH1', scopes: '' },
  { key: 'hubspot', idEnv: 'HUBSPOT_CLIENT_ID', secretEnv: 'HUBSPOT_CLIENT_SECRET', scopes: 'crm.objects.contacts.read crm.objects.deals.read' },
  { key: 'salesforce', idEnv: 'SALESFORCE_CLIENT_ID', secretEnv: 'SALESFORCE_CLIENT_SECRET', scopes: 'api refresh_token' },
  { key: 'pipedrive', idEnv: 'PIPEDRIVE_CLIENT_ID', secretEnv: 'PIPEDRIVE_CLIENT_SECRET', scopes: '' },
];

async function createIntegration(provider) {
  const clientId = process.env[provider.idEnv];
  const clientSecret = process.env[provider.secretEnv];

  if (!clientId || !clientSecret) {
    console.log('SKIP:', provider.key.padEnd(20), '- no credentials (' + provider.idEnv + ')');
    return;
  }

  const body = {
    provider: provider.key,
    unique_key: provider.key,
    credentials: {
      type: provider.authType || 'OAUTH2',
      client_id: clientId,
      client_secret: clientSecret,
    },
  };
  if (provider.scopes) {
    body.credentials.scopes = provider.scopes;
  }

  const res = await fetch('https://api.nango.dev/integrations', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (res.ok) {
    console.log('OK:  ', provider.key.padEnd(20), '- created');
  } else {
    const msg = data.error?.message || data.error?.errors?.[0]?.message || JSON.stringify(data.error?.code);
    console.log('FAIL:', provider.key.padEnd(20), '-', msg);
  }
}

async function run() {
  console.log('Setting up Nango integrations...\n');
  for (const p of PROVIDERS) {
    await createIntegration(p);
  }

  console.log('\nDone. Verifying...\n');
  const res = await fetch('https://api.nango.dev/integrations', {
    headers: { 'Authorization': 'Bearer ' + KEY },
  });
  const data = await res.json();
  console.log('Total integrations in Nango:', data.data.length);
  data.data.forEach(i => console.log('  -', i.unique_key));
}

run();
