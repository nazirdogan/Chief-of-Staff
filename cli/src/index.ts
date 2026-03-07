#!/usr/bin/env node

import * as readline from 'readline';
import { sendChat } from './api.js';
import { loadConfig, saveConfig, isAuthenticated } from './config.js';
import { loginFlow } from './login.js';

const VERSION = '0.1.0';

// ANSI formatting
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function printBanner() {
  console.log(`
${BOLD}${CYAN}  Donna${RESET} ${DIM}v${VERSION}${RESET}
${DIM}  Your AI intelligence layer${RESET}
`);
}

function printHelp() {
  console.log(`
${BOLD}Commands:${RESET}
  ${GREEN}cos${RESET}                    Start interactive chat
  ${GREEN}cos login${RESET}              Authenticate with your account
  ${GREEN}cos logout${RESET}             Clear saved credentials
  ${GREEN}cos briefing${RESET}           Get today's briefing
  ${GREEN}cos commitments${RESET}        List open commitments
  ${GREEN}cos contacts --cold${RESET}    List cold contacts
  ${GREEN}cos config${RESET}             Show current config
  ${GREEN}cos config set <k> <v>${RESET} Set a config value (e.g. api_url)
  ${GREEN}cos --help${RESET}             Show this help

${BOLD}In chat:${RESET}
  Type naturally. Ask about your briefing, commitments, contacts, inbox.
  Type ${YELLOW}/quit${RESET} or ${YELLOW}Ctrl+C${RESET} to exit.
`);
}

async function quickCommand(message: string): Promise<void> {
  try {
    const response = await sendChat([{ role: 'user', content: message }]);
    console.log(`\n${response}\n`);
  } catch (err) {
    console.error(`${RED}${err instanceof Error ? err.message : 'Unknown error'}${RESET}`);
    process.exit(1);
  }
}

async function interactiveChat(): Promise<void> {
  printBanner();

  if (!isAuthenticated()) {
    console.log(`${YELLOW}Not logged in.${RESET} Run ${GREEN}cos login${RESET} first.\n`);
    process.exit(1);
  }

  console.log(`${DIM}Type your message. /quit to exit.${RESET}\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  const prompt = () => {
    rl.question(`${BOLD}you${RESET} ${DIM}>${RESET} `, async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed === '/quit' || trimmed === '/exit' || trimmed === '/q') {
        console.log(`\n${DIM}Goodbye.${RESET}\n`);
        rl.close();
        process.exit(0);
      }

      if (trimmed === '/clear') {
        history.length = 0;
        console.log(`${DIM}Conversation cleared.${RESET}\n`);
        prompt();
        return;
      }

      if (trimmed === '/help') {
        printHelp();
        prompt();
        return;
      }

      history.push({ role: 'user', content: trimmed });

      // Show thinking indicator
      process.stdout.write(`${DIM}thinking...${RESET}`);

      try {
        const response = await sendChat(history);
        // Clear the thinking indicator
        process.stdout.write('\r\x1b[K');
        console.log(`\n${BOLD}${CYAN}cos${RESET} ${DIM}>${RESET} ${response}\n`);
        history.push({ role: 'assistant', content: response });
      } catch (err) {
        process.stdout.write('\r\x1b[K');
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.log(`\n${RED}Error: ${message}${RESET}\n`);

        // Remove the failed user message from history
        history.pop();
      }

      prompt();
    });
  };

  prompt();

  rl.on('close', () => {
    console.log(`\n${DIM}Goodbye.${RESET}\n`);
    process.exit(0);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case '--help':
    case '-h':
    case 'help':
      printBanner();
      printHelp();
      break;

    case '--version':
    case '-v':
      console.log(VERSION);
      break;

    case 'login':
      await loginFlow();
      break;

    case 'logout': {
      saveConfig({ access_token: null, refresh_token: null });
      console.log(`${GREEN}Logged out.${RESET}`);
      break;
    }

    case 'config': {
      const settableKeys = ['api_url', 'supabase_url', 'supabase_anon_key'] as const;
      if (args[1] === 'set' && args[2] && args[3]) {
        const key = args[2] as typeof settableKeys[number];
        if (settableKeys.includes(key)) {
          saveConfig({ [key]: args[3] });
          console.log(`${GREEN}${key} set${RESET}`);
        } else {
          console.log(`${RED}Unknown config key: ${args[2]}. Valid: ${settableKeys.join(', ')}${RESET}`);
        }
      } else {
        const config = loadConfig();
        console.log(`${BOLD}Config:${RESET}`);
        console.log(`  api_url:       ${config.api_url}`);
        console.log(`  supabase_url:  ${config.supabase_url || `${DIM}(not set)${RESET}`}`);
        console.log(`  authenticated: ${config.access_token ? `${GREEN}yes${RESET}` : `${RED}no${RESET}`}`);
      }
      break;
    }

    case 'briefing':
      await quickCommand("What's my briefing for today?");
      break;

    case 'commitments':
      await quickCommand('List my open commitments.');
      break;

    case 'contacts':
      if (args.includes('--cold')) {
        await quickCommand('Who have I gone cold with?');
      } else if (args.includes('--vip')) {
        await quickCommand('List my VIP contacts.');
      } else {
        await quickCommand('List my contacts.');
      }
      break;

    case 'inbox':
      if (args.includes('--unread')) {
        await quickCommand('Show my unread inbox items.');
      } else {
        await quickCommand('Show my inbox.');
      }
      break;

    case undefined:
      // No command — start interactive chat
      await interactiveChat();
      break;

    default:
      // Treat unknown args as a direct question
      await quickCommand(args.join(' '));
      break;
  }
}

main().catch((err) => {
  console.error(`${RED}${err instanceof Error ? err.message : 'Fatal error'}${RESET}`);
  process.exit(1);
});
