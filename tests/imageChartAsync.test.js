import assert from "node:assert/strict";
import test, { after, afterEach, beforeEach } from "node:test";

import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { imageFixtureBytes } from "./fixtures/imageFixtureBytes.js";

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

async function attemptsFor(assetId, count) {
  await page.waitForFunction(({ id, expected }) => (
    window.asyncImageAttemptIds(id).length === expected
  ), { id: assetId, expected: count });
  return page.evaluate((id) => window.asyncImageAttemptIds(id), assetId);
}

async function resolveAttempt(attemptId) {
  return page.evaluate((id) => window.resolveAsyncImageAttempt(id), attemptId);
}

async function expectReleased(attemptId) {
  await page.waitForFunction((id) => window.asyncImageReleaseCount(id) === 1, attemptId);
}

test("StrictMode replay owns independent attempts and keeps the active Image URL valid", async () => {
  const assetId = await page.evaluate(() => window.mountAsyncImage("a", "Strict leased image"));
  await page.getByText("Loading saved image…", { exact: true }).waitFor();
  const [replayDiscarded, active] = await attemptsFor(assetId, 2);

  await resolveAttempt(replayDiscarded);
  await expectReleased(replayDiscarded);
  await resolveAttempt(active);
  await page.locator('img[alt="Strict leased image"]').waitFor();

  assert.equal(await page.evaluate((id) => window.asyncImageReleaseCount(id), active), 0);
  assert.equal(await page.evaluate((id) => window.asyncImageAttemptUrlIsReadable(id), active), true);
  assert.equal(
    await page.locator('img[alt="Strict leased image"]').getAttribute("src"),
    await page.evaluate((id) => window.asyncImageAttemptUrl(id), active),
  );

  await page.evaluate(() => window.unmountAsyncImage());
  await expectReleased(active);
  assert.deepEqual(await page.evaluate((ids) => ids.map(
    (id) => window.asyncImageReleaseCount(id),
  ), [replayDiscarded, active]), [1, 1]);
});

test("source supersession releases every discarded attempt without revoking the replacement", async () => {
  const firstId = await page.evaluate(() => window.mountAsyncImage("d", "First leased image"));
  await page.getByText("Loading saved image…", { exact: true }).waitFor();
  const firstAttempts = await attemptsFor(firstId, 2);
  const secondId = await page.evaluate(() => window.mountAsyncImage("e", "Current leased image"));
  const [secondAttempt] = await attemptsFor(secondId, 1);

  for (const attemptId of firstAttempts) await resolveAttempt(attemptId);
  for (const attemptId of firstAttempts) await expectReleased(attemptId);
  assert.equal(await page.locator('img[alt="First leased image"]').count(), 0);
  assert.equal(await page.getByText("Loading saved image…", { exact: true }).count(), 1);

  await resolveAttempt(secondAttempt);
  await page.locator('img[alt="Current leased image"]').waitFor();
  assert.equal(await page.evaluate((id) => window.asyncImageReleaseCount(id), secondAttempt), 0);
  assert.equal(await page.evaluate((id) => window.asyncImageAttemptUrlIsReadable(id), secondAttempt), true);

  await page.evaluate(() => window.unmountAsyncImage());
  await expectReleased(secondAttempt);
});

test("unmount-before-resolution releases every replay attempt while rejection stays inert", async () => {
  const resolvedId = await page.evaluate(() => window.mountAsyncImage("f", "Unmounted resolution"));
  await page.getByText("Loading saved image…", { exact: true }).waitFor();
  const resolvedAttempts = await attemptsFor(resolvedId, 2);
  await page.evaluate(() => window.unmountAsyncImage());
  for (const attemptId of resolvedAttempts) await resolveAttempt(attemptId);
  for (const attemptId of resolvedAttempts) await expectReleased(attemptId);

  const rejectedId = await page.evaluate(() => window.mountAsyncImage("0", "Unmounted rejection"));
  await page.getByText("Loading saved image…", { exact: true }).waitFor();
  const rejectedAttempts = await attemptsFor(rejectedId, 2);
  await page.evaluate(() => window.unmountAsyncImage());
  for (const attemptId of rejectedAttempts) {
    await page.evaluate((id) => window.rejectAsyncImageAttempt(id), attemptId);
  }
  await page.waitForTimeout(20);
  assert.deepEqual(await page.evaluate((ids) => ids.map(
    (id) => window.asyncImageReleaseCount(id),
  ), rejectedAttempts), [0, 0]);
  assert.equal(await page.locator("img").count(), 0);
});

test("canonical ChartView turns a durable resolver rejection into stable panel recovery", async () => {
  const assetId = await page.evaluate(() => window.mountAsyncImage("c", "Failed image"));
  await page.getByText("Loading saved image…", { exact: true }).waitFor();
  const attempts = await attemptsFor(assetId, 2);
  for (const attemptId of attempts) {
    await page.evaluate((id) => window.rejectAsyncImageAttempt(id), attemptId);
  }
  await page.locator('[data-static-failure="asset-read-failed"]').waitFor();
  assert.equal(await page.getByRole("button", { name: "Retry" }).count(), 1);
  await page.waitForTimeout(50);
  assert.equal(await page.locator('[data-static-failure="asset-read-failed"]').count(), 1);
});

test("a synchronous staged Image resolver retains canonical rendering under StrictMode", async () => {
  await page.evaluate(() => window.mountSynchronousImage("1", "Synchronous image"));
  await page.locator('img[alt="Synchronous image"]').waitFor();
  assert.equal(await page.locator('[data-static-failure]').count(), 0);
  assert.equal(await page.getByText("Loading saved image…", { exact: true }).count(), 0);
});

test("an immediately fulfilled async Image resolver settles under StrictMode", async () => {
  await page.evaluate(() => window.mountImmediateAsyncImage("2", "Immediate async image"));
  await page.locator('img[alt="Immediate async image"]').waitFor();
  assert.equal(await page.getByText("Loading saved image…", { exact: true }).count(), 0);
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
