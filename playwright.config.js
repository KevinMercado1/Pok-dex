import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-tests',
  webServer: {
    command: 'npm run start-prod',
    port: 5000,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
