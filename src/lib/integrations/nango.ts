import { Nango } from '@nangohq/node';

let nangoClient: Nango | null = null;

function getNango(): Nango {
  if (!nangoClient) {
    nangoClient = new Nango({ secretKey: process.env.NANGO_SECRET_KEY! });
  }
  return nangoClient;
}

export async function getAccessToken(
  userId: string,
  provider: string
): Promise<string> {
  const nango = getNango();
  // Nango Connect uses end_user.id as the connection lookup
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

export async function deleteConnection(
  userId: string,
  provider: string
): Promise<void> {
  const nango = getNango();
  // Find the connection for this user+provider
  const connections = await nango.listConnections({ userId, integrationId: provider });
  const conn = connections.connections?.[0];
  if (conn) {
    await nango.deleteConnection(provider, conn.connection_id);
  }
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
