import { loadConfig } from './config.js';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  response: string;
  model: string;
}

interface ErrorResponse {
  error: string;
  error_description?: string;
  code: string;
}

export async function sendChat(messages: ChatMessage[]): Promise<string> {
  const config = loadConfig();

  if (!config.access_token) {
    throw new Error('Not authenticated. Run: cos login');
  }

  const res = await fetch(`${config.api_url}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.access_token}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (res.status === 401) {
    throw new Error('Session expired. Run: cos login');
  }

  if (!res.ok) {
    const err = await res.json() as ErrorResponse;
    throw new Error(err.error ?? `API error: ${res.status}`);
  }

  const data = await res.json() as ChatResponse;
  return data.response;
}

export async function loginWithEmail(
  email: string,
  password: string,
  supabaseUrl: string,
  anonKey: string
): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json() as ErrorResponse;
    throw new Error(err.error_description ?? err.error ?? 'Login failed');
  }

  const data = await res.json() as { access_token: string; refresh_token: string };
  return data;
}
