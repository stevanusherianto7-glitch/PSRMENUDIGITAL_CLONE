import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],

  use: {
    baseURL: 'http://localhost:5174',

    // HEADED: browser terlihat saat test berjalan
    headless: false,

    viewport: { width: 1280, height: 720 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,

    // Record trace untuk debugging
    trace: 'on-first-retry',

    // Screenshot saat fail
    screenshot: 'only-on-failure',

    // Video recording
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Auto-start dev server sebelum test
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
