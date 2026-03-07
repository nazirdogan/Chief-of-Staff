import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.chiefofstaff');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface CLIConfig {
  api_url: string;
  supabase_url: string;
  supabase_anon_key: string;
  access_token: string | null;
  refresh_token: string | null;
}

const DEFAULT_CONFIG: CLIConfig = {
  api_url: 'http://localhost:3000',
  supabase_url: '',
  supabase_anon_key: '',
  access_token: null,
  refresh_token: null,
};

export function loadConfig(): CLIConfig {
  if (!existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: Partial<CLIConfig>): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
  const current = loadConfig();
  const merged = { ...current, ...config };
  writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), { mode: 0o600 });
}

export function isAuthenticated(): boolean {
  const config = loadConfig();
  return !!config.access_token;
}
