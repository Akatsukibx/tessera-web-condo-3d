import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';

// The headless-shell download is unavailable here, so use the full Chromium build
// Playwright already installed. PW_CHROMIUM overrides the path.
const localChromium =
  process.env.PW_CHROMIUM ||
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1248', 'chrome-win64', 'chrome.exe');

// SwiftShader lets WebGL render in headless Chromium without a GPU.
const launchOptions = {
  args: ['--use-gl=swiftshader', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  ...(existsSync(localChromium) ? { executablePath: localChromium } : {}),
};

const desktop = (name, width, height) => ({
  name,
  use: { browserName: 'chromium', viewport: { width, height }, launchOptions },
});

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/',
  },
  projects: [desktop('desktop-1440', 1440, 900), desktop('desktop-1920', 1920, 1080), desktop('desktop-1280', 1280, 800)],
  webServer: {
    command: 'npm.cmd run build && npm.cmd run preview',
    url: 'http://localhost:4173/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
