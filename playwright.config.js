import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-tests',
  testMatch: '**/*.test.js',
  webServer: {
    port: 3000,
    reuseExistingServer: true,
  },
});
