import * as readline from 'readline';
import { loginWithEmail } from './api.js';
import { saveConfig, loadConfig } from './config.js';

const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function questionHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    const origWrite = process.stdout.write.bind(process.stdout);
    let muted = false;

    process.stdout.write = ((...args: Parameters<typeof origWrite>) => {
      if (muted) return true;
      return origWrite(...args);
    }) as typeof process.stdout.write;

    rl.question(prompt, (answer) => {
      muted = false;
      process.stdout.write = origWrite;
      console.log();
      rl.close();
      resolve(answer);
    });

    muted = true;
  });
}

export async function loginFlow(): Promise<void> {
  const config = loadConfig();
  console.log(`\n${BOLD}Donna — Login${RESET}\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  try {
    // Prompt for server config if not set
    if (!config.supabase_url) {
      const supabaseUrl = await question(rl, `${BOLD}Supabase URL:${RESET} `);
      const anonKey = await question(rl, `${BOLD}Supabase Anon Key:${RESET} `);
      const apiUrl = await question(rl, `${BOLD}API URL${RESET} ${DIM}(http://localhost:3000):${RESET} `);
      saveConfig({
        supabase_url: supabaseUrl,
        supabase_anon_key: anonKey,
        api_url: apiUrl || 'http://localhost:3000',
      });
    }

    const currentConfig = loadConfig();
    console.log(`${DIM}Server: ${currentConfig.api_url}${RESET}\n`);

    const email = await question(rl, `${BOLD}Email:${RESET} `);
    rl.close();

    const password = await questionHidden(`${BOLD}Password:${RESET} `);

    if (!email || !password) {
      console.log(`${RED}Email and password are required.${RESET}`);
      return;
    }

    process.stdout.write(`${DIM}Authenticating...${RESET}`);

    const { access_token, refresh_token } = await loginWithEmail(
      email,
      password,
      currentConfig.supabase_url,
      currentConfig.supabase_anon_key
    );

    saveConfig({ access_token, refresh_token });

    process.stdout.write(`\r\x1b[K`);
    console.log(`${GREEN}Logged in as ${email}${RESET}\n`);
    console.log(`Run ${BOLD}cos${RESET} to start chatting.\n`);
  } catch (err) {
    process.stdout.write(`\r\x1b[K`);
    console.log(`${RED}Login failed: ${err instanceof Error ? err.message : 'Unknown error'}${RESET}\n`);
    rl.close();
  }
}
