import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  outputDir: '.quality-results',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['line']],
  timeout: 180_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'retain-on-failure',
  },
  ...(process.env.QUALITY_EXTERNAL_SERVER
    ? {}
    : {
        webServer: {
          command: 'node scripts/serve-dist.mjs 4321',
          url: 'http://127.0.0.1:4321',
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
      }),
  projects: [
    { name: 'chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'edge', use: { ...devices['Desktop Edge'] } },
    {
      name: 'firefox',
      fullyParallel: false,
      retries: 2,
      use: { ...devices['Desktop Firefox'] },
    },
    { name: 'safari', use: { ...devices['Desktop Safari'] } },
    { name: 'ios-safari', use: { ...devices['iPhone 15'] } },
  ],
});
