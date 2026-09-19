import { defineConfig, devices } from '@playwright/test';

/**
 * - `public`   : page publique rendue depuis les fixtures (visuel + a11y + comportements) — aucun back requis.
 * - `fullstack`: parcours bout-en-bout contre la stack complète (E2E_BASE_URL, ex. https://localhost via Caddy).
 */
const fullstackUrl = process.env['E2E_BASE_URL'];
const chromiumPath = process.env['CHROMIUM_PATH'];

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' } },
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
  use: {
    trace: 'retain-on-failure',
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
  },
  projects: [
    {
      name: 'public',
      testMatch: /public\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4100' },
    },
    ...(fullstackUrl
      ? [{ name: 'fullstack', testMatch: /fullstack\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'], baseURL: fullstackUrl, ignoreHTTPSErrors: true } }]
      : []),
  ],
  webServer: {
    command: 'node dist/web/server/server.mjs',
    url: 'http://localhost:4100/healthz',
    reuseExistingServer: !process.env['CI'],
    env: { PORT: '4100', USE_FIXTURES: 'true', PUBLIC_BASE_URL: 'http://localhost:4100' },
  },
});
