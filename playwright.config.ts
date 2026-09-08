import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.AIME_E2E_BASE_URL ?? "http://127.0.0.1:5173";
const authState = process.env.AIME_E2E_OWNER_STATE;
const chromiumExecutable = process.env.AIME_E2E_CHROMIUM_EXECUTABLE;

export default defineConfig({
  globalSetup: process.env.CI ? "./e2e/global-setup.ts" : undefined,
  globalTeardown: process.env.CI ? "./e2e/global-teardown.ts" : undefined,
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    storageState: authState || undefined,
    launchOptions: chromiumExecutable
      ? { executablePath: chromiumExecutable }
      : undefined,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
});
