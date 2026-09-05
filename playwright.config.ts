import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.e2e.ts', fullyParallel: false, workers: 1,
  timeout: 180000, expect: { timeout: 20000 }, retries: 0, failOnFlakyTests: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:5173', deviceScaleFactor: process.env.CI ? 0.5 : 1, viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions: { args: ['--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'] } },
  webServer: [
    { command: 'node tests/peer-server.mjs', url: 'http://127.0.0.1:9000', reuseExistingServer: !process.env.CI },
    { command: 'npm run dev -- --port 5173', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI, env: { VITE_PEER_HOST: '127.0.0.1', VITE_PEER_PORT: '9000', VITE_PEER_SECURE: 'false' } },
  ],
});
