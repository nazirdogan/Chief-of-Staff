import { defineConfig } from '@trigger.dev/sdk/v3';

export default defineConfig({
  project: 'chief-of-staff',
  maxDuration: 300,
  dirs: ['trigger/heartbeat', 'trigger/briefing', 'trigger/operations'],
});
