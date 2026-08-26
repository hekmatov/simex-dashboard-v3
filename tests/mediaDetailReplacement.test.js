import assert from "node:assert/strict";
import test, { after, afterEach, beforeEach } from "node:test";

import { chromium } from "@playwright/test";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), logLevel: "silent", server: { host: "127.0.0.1", port: 0 } });
await vite.listen();
const address = vite.httpServer.address();
const baseURL = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
let page;

beforeEach(async () => {
  page = await browser.newPage();
  await page.goto(`${baseURL}/tests/fixtures/portable-qmd-browser.html`);
});

afterEach(async () => {
  await page?.close();
  page = null;
});

after(async () => {
  await browser.close();
  await vite.close();
});

test("unmount before deferred raster prepare resolves leaves no late state, bytes, or retainer", { timeout: 15_000 }, async () => {
  const result = await page.evaluate(async () => {
    const { replacementHarness, setFile, waitFor } = await import("/tests/fixtures/media-detail-replacement-harness.js");
    const harness = await replacementHarness();
    let resolveBitmap;
    globalThis.createImageBitmap = () => new Promise((resolve) => { resolveBitmap = resolve; });
    harness.mount();
    await waitFor(() => harness.target.querySelector('button')?.textContent.includes("Replace library"));
    harness.target.querySelector('button').click();
    await waitFor(() => harness.target.querySelector('input[type="file"]'));
    setFile(harness.target.querySelector('input[type="file"]'), harness.bytes);
    await waitFor(() => typeof resolveBitmap === "function");
    harness.root.unmount();
    resolveBitmap({ width: 2, height: 3, close() {} });
    await waitFor(() => harness.prepareSettled());
    const observed = {
      staged: harness.stageCalls.slice(),
      discarded: harness.discardCalls.slice(),
      retainers: harness.coordinator.getActiveRetainers().records,
      sessionBytes: Boolean(harness.readSessionAsset(harness.nextAssetId)),
      rendered: harness.target.textContent,
    };
    await harness.cleanup();
    return observed;
  });

  assert.deepEqual(result, { staged: [], discarded: [], retainers: [], sessionBytes: false, rendered: "" });
});

test("unmount while replacement commit is committing does not race-discard its coordinator draft", { timeout: 15_000 }, async () => {
  const result = await page.evaluate(async () => {
    const { replacementHarness, setFile, waitFor } = await import("/tests/fixtures/media-detail-replacement-harness.js");
    const harness = await replacementHarness({ deferCommit: true });
    globalThis.createImageBitmap = async () => ({ width: 2, height: 3, close() {} });
    harness.mount();
    await waitFor(() => harness.target.querySelector('button')?.textContent.includes("Replace library"));
    harness.target.querySelector('button').click();
    await waitFor(() => harness.target.querySelector('input[type="file"]'));
    setFile(harness.target.querySelector('input[type="file"]'), harness.bytes);
    await waitFor(() => harness.target.textContent.includes("Ready: replacement.png"));
    [...harness.target.querySelectorAll('button')].find((button) => button.textContent === "Replace everywhere").click();
    await waitFor(() => harness.coordinator.getActiveRetainers().records.some(({ status }) => status === "committing"));
    const during = harness.coordinator.getActiveRetainers().records.map(({ ownerId, status }) => ({ ownerId, status }));
    harness.root.unmount();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const discardCallsAfterUnmount = harness.discardCalls.slice();
    harness.releaseCommit();
    await waitFor(() => harness.coordinator.getActiveRetainers().records.length === 0);
    const after = harness.coordinator.getActiveRetainers().records;
    await harness.cleanup();
    return { during, discardCallsAfterUnmount, after };
  });

  assert.equal(result.during.some(({ status }) => status === "committing"), true);
  assert.deepEqual(result.discardCallsAfterUnmount, []);
  assert.deepEqual(result.after, []);
});
