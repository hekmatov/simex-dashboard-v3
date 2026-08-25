import assert from "node:assert/strict";
import test, { after, afterEach, beforeEach } from "node:test";

import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { imageFixtureBytes } from "./fixtures/imageFixtureBytes.js";

const PNG_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const vite = await createServer({
  root: process.cwd(),
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 0 },
});
await vite.listen();
const address = vite.httpServer.address();
const baseURL = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch();
let page;

beforeEach(async () => {
  page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  page.setDefaultTimeout(5_000);
  await page.goto(`${baseURL}/tests/fixtures/async-image-harness.html`);
  await page.waitForFunction(() => window.asyncImageHarnessReady === true);
});

afterEach(async () => {
  await page?.close();
  page = null;
});

after(async () => {
  await browser.close();
  await vite.close();
});

test("canonical ChartView resolves durable Image promises and ignores superseded completions", async () => {
  const firstId = await page.evaluate(() => window.mountAsyncImage("a", "First image"));
  await page.getByRole("status").filter({ hasText: "Loading saved image" }).waitFor();

  const secondId = await page.evaluate(() => window.mountAsyncImage("b", "Second image"));
  await page.evaluate(({ assetId, url }) => window.resolveAsyncImage(assetId, url), {
    assetId: firstId,
    url: PNG_URL,
  });
  await page.waitForTimeout(50);
  assert.equal(await page.locator('img[alt="First image"]').count(), 0);
  assert.equal(await page.getByText("Loading saved image…", { exact: true }).count(), 1);

  await page.evaluate(({ assetId, url }) => window.resolveAsyncImage(assetId, url), {
    assetId: secondId,
    url: PNG_URL,
  });
  await page.locator('img[alt="Second image"]').waitFor();
  assert.equal(await page.locator('[data-static-failure]').count(), 0);
});

test("canonical ChartView turns a durable resolver rejection into stable panel recovery", async () => {
  const assetId = await page.evaluate(() => window.mountAsyncImage("c", "Failed image"));
  await page.getByText("Loading saved image…", { exact: true }).waitFor();
  await page.evaluate((id) => window.rejectAsyncImage(id), assetId);
  await page.locator('[data-static-failure="asset-read-failed"]').waitFor();
  assert.equal(await page.getByRole("button", { name: "Retry" }).count(), 1);
  await page.waitForTimeout(50);
  assert.equal(await page.locator('[data-static-failure="asset-read-failed"]').count(), 1);
});

test("locally controlled PNG, JPEG, and WebP fixtures pass the production browser decoder boundary", async () => {
  for (const mediaType of ["image/png", "image/jpeg", "image/webp"]) {
    const base64 = Buffer.from(imageFixtureBytes(mediaType)).toString("base64");
    const result = await page.evaluate(
      ({ type, encoded }) => window.validateImageFixture(type, encoded),
      { type: mediaType, encoded: base64 },
    );
    assert.deepEqual(result, {
      ok: true,
      code: null,
      asset: {
        mediaType,
        byteLength: imageFixtureBytes(mediaType).byteLength,
        width: 2,
        height: 3,
        frameCount: 1,
      },
    });
  }
});
