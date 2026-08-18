import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run dev --workspace server",
      url: "http://localhost:3000/api/health",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: { ...process.env, PORT: "3000", CLIENT_ORIGIN: "http://localhost:5173" },
    },
    {
      command: "npm run dev --workspace client -- --host localhost",
      url: "http://localhost:5173",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
