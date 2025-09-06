import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.e2e.ts', // Only run E2E tests
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  reporter: process.env.CI ? 'html' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    // Only run Chrome in CI to save time
    ...(process.env.CI ? [] : [
      {
        name: 'Desktop Firefox',
        use: { ...devices['Desktop Firefox'] },
      },
      {
        name: 'Desktop Safari',
        use: { ...devices['Desktop Safari'] },
      },
    ]),
  ],
  // Start dev server before running tests (if not in CI)
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev:frontend',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});