import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:8001"
  },
  webServer: {
    command: "python3 -m http.server 8001 --directory web",
    url: "http://127.0.0.1:8001/airline.html",
    reuseExistingServer: true
  }
});
