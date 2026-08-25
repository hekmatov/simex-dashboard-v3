import assert from "node:assert/strict";
import test, { after } from "node:test";

import { chromium } from "@playwright/test";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 0 },
});
await vite.listen();
const address = vite.httpServer.address();
const baseURL = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch();

after(async () => {
  await browser.close();
  await vite.close();
});

test("StrictMode Present teardown preserves a pre-existing playback view owner", async () => {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  try {
    await page.goto(`${baseURL}/tests/fixtures/present-playback-lease-harness.html`);
    await page.waitForFunction(() => window.presentPlaybackHarnessReady === true);
    await page.waitForFunction(() => window.presentPlaybackViewOpen() === true);

    await page.evaluate(() => window.unmountPresentWorkspace());

    await page.waitForTimeout(25);
    assert.equal(await page.evaluate(() => window.presentPlaybackViewOpen()), true);
  } finally {
    await page.close();
  }
});
