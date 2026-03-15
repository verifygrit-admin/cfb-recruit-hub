import { defineConfig } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env.test' });

export default defineConfig({
  testDir: './tests',
  timeout: 90000,
  retries: 1,
  webServer: {
    command: 'npm run dev -- --port 5180',
    url: 'http://localhost:5180',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  use: {
    baseURL: 'http://localhost:5180',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 60000,
    actionTimeout: 15000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
