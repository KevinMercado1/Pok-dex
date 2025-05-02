import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-tests',
  testMatch: '**/*.test.js',
  
  // Increase test timeout to allow for API responses
  timeout: 60000,
  
  // Enable more verbose logging
  reporter: [['html'], ['list']],
  
  // Configure retries for more stability in CI
  retries: process.env.CI ? 2 : 0,
  
  // Configure the server
  webServer: {
    command: 'npm run build && npm run start-prod',
    port: 3000,
    timeout: 180 * 1000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NODE_ENV: 'production'
    }
  },
  
  use: {
    // Slow down test execution in CI for more stability
    actionTimeout: 30000,
    navigationTimeout: 30000,
    
    // Capture trace on test failure
    trace: 'retain-on-failure',
    
    // Capture screenshot on test failure
    screenshot: 'only-on-failure'
  },
});
