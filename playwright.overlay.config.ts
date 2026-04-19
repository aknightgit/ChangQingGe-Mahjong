import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: /settlement-overlay\.e2e\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  use: {
    browserName: 'chromium',
    channel: 'chrome'
  }
})
