import { Nango } from '@nangohq/node';

let nangoClient: Nango | null = null;

function getNango(): Nango {
  if (!nangoClient) {
    nangoClient = new Nango({ secretKey: process.env.NANGO_SECRET_KEY! });
  }
  return nangoClient;
}

/**
 * Get an access token for a specific Nango connection ID.
 * Use this when you already know the connection ID (multi-account flows).
 */
export async function getAccessTokenByConnectionId(
  provider: string,
  connectionId: string
): Promise<string> {
  const nango = getNango();
  const connection = await nango.getConnection(provider, connectionId);
  return (connection.credentials as { access_token: string }).access_token;
}

/**
 * Get an access token for a user's first connection to a provider.
 * For multi-account providers, prefer getAccessTokenByConnectionId.
 */
export async function getAccessToken(
  userId: string,
  provider: string
): Promise<string> {
  const nango = getNango();
  const connections = await nango.listConnections({ userId, integrationId: provider });
  const conn = connections.connections?.[0];
  if (!conn) throw new Error(`No ${provider} connection found for user`);

  const connection = await nango.getConnection(provider, conn.connection_id);
  return (connection.credentials as { access_token: string }).access_token;
}

/**
 * Creates a Nango Connect session and returns the session token.
 * The frontend SDK uses this token to open the real OAuth popup.
 */
export async function createConnectSession(
  userId: string,
  provider: string,
  scopes?: string[]
): Promise<string> {
  const nango = getNango();
  const session = await nango.createConnectSession({
    end_user: { id: userId },
    allowed_integrations: [provider],
    ...(scopes && scopes.length > 0 && {
      integrations_config_defaults: {
        [provider]: {
          user_scopes: scopes.join(' '),
          authorization_params: {
            scope: scopes.join(' '),
          },
        },
      },
    }),
  });
  return session.data.token;
}

/**
 * List all connections for a user, optionally filtered by provider.
 * Used to check if a user has connected a specific provider.
 */
export async function listUserConnections(
  userId: string,
  provider?: string
) {
  const nango = getNango();
  const result = await nango.listConnections({
    userId,
    ...(provider && { integrationId: provider }),
  });
  return result.connections ?? [];
}

/**
 * Delete a specific Nango connection by its connection ID.
 * Use when disconnecting a specific account in a multi-account setup.
 */
export async function deleteConnection(
  provider: string,
  connectionId: string
): Promise<void> {
  const nango = getNango();
  await nango.deleteConnection(provider, connectionId);
}

export async function getConnectionDetails(
  userId: string,
  provider: string
) {
  const nango = getNango();
  try {
    const connections = await nango.listConnections({ userId, integrationId: provider });
    const conn = connections.connections?.[0];
    if (!conn) return null;
    return await nango.getConnection(provider, conn.connection_id);
  } catch {
    return null;
  }
}

export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const nango = getNango();
  return nango.verifyWebhookSignature(body, signature);
}
