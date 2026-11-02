import { defineConfig, devices } from '@playwright/test';

/*
 * End-to-end tests against the dev server, with mail caught by Mailpit
 * (bun run infra:up). Reads PORT and MAILPIT_WEB_PORT from .env.
 */
const port = Number(process.env.PORT ?? 5173);

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    workers: process.env.CI ? 2 : undefined,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: `http://localhost:${port}`,
        trace: 'retain-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        // The web app's own dev script: turbo adds nothing here and has stalled at start without a TTY.
        command: 'bun run --cwd apps/web dev',
        url: `http://localhost:${port}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
