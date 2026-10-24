import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const testDirectory = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  testDir: testDirectory,
  testMatch: '**/*.spec.ts',
  use: {
    baseURL: 'http://127.0.0.1:5173',
  },
  projects: [{
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  }],
  webServer: {
    command: 'pnpm --filter @taipei-rat-lab/web exec vite --host 127.0.0.1',
    cwd: repositoryRoot,
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
});
