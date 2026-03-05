import { Nango } from '@nangohq/node';

let nangoClient: Nango | null = null;

function getNango(): Nango {
  if (!nangoClient) {
    nangoClient = new Nango({ secretKey: process.env.NANGO_SECRET_KEY! });
  }
  return nangoClient;
}

function connectionId(userId: string, provider: string): string {
  return `${userId}-${provider}`;
}

export async function getAccessToken(
  userId: string,
  provider: string
): Promise<string> {
  const nango = getNango();
  const connection = await nango.getConnection(
    provider,
    connectionId(userId, provider)
  );
  return (connection.credentials as { access_token: string }).access_token;
}

export async function getConnectUrl(
  userId: string,
  provider: string
): Promise<string> {
  const nango = getNango();
  const sessionToken = await nango.createConnectSession({
    end_user: { id: userId },
    allowed_integrations: [provider],
  });
  return `https://connect.nango.dev?session_token=${sessionToken.data.token}`;
}

export async function deleteConnection(
  userId: string,
  provider: string
): Promise<void> {
  const nango = getNango();
  await nango.deleteConnection(provider, connectionId(userId, provider));
}

export async function getConnectionDetails(
  userId: string,
  provider: string
) {
  const nango = getNango();
  try {
    const connection = await nango.getConnection(
      provider,
      connectionId(userId, provider)
    );
    return connection;
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
