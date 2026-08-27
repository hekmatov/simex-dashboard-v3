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

test("Present Play starts the mounted provider-owned timeline", async () => {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  try {
    await page.goto(`${baseURL}/tests/fixtures/present-playback-safety-harness.html`);
    await page.waitForFunction(() => window.__presentPlaybackHarnessReady === true);
    await page.locator('[data-presentation-control-id="open-new-session"]').click();
    await page.waitForFunction(() => Boolean(window.__presentPlaybackSafety?.sessionId));
    await page.evaluate(() => {
      const state = window.__presentPlaybackSafety;
      const channel = new BroadcastChannel(`simex-presentation-${state.sessionId}`);
      channel.postMessage({
        protocol_version: 3,
        session_id: state.sessionId,
        sequence: 1,
        type: "ready",
        payload: null,
      });
      channel.close();
    });
    await page.waitForFunction(() => window.__presentPlaybackSafety?.connection === "connected");

    await page.locator('[data-presentation-control-id="play"]').click();

    await page.waitForFunction(() => window.__presentPlaybackSafety?.playing === true);
  } finally {
    await page.close();
  }
});

test("unsafe presenter commands freeze the provider timer until accepted recovery and explicit Play", async () => {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  try {
    await openConnectedSafetyHarness(page);
    const initialIndex = await readSafety(page, "activeIndex");

    await play(page);
    await page.locator('[data-presentation-control-id="output-holding"]').click();
    await assertFrozen(page, initialIndex);

    await page.locator('[data-presentation-control-id="output-active"]').click();
    await play(page);
    await page.locator('[data-presentation-control-id="blackout"]').click();
    await assertFrozen(page, initialIndex);

    await page.locator('[data-presentation-control-id="restore"]').click();
    await play(page);
    await page.evaluate(() => window.__presentPlaybackRuntime.compositionChange());
    await assertFrozen(page, initialIndex);

    await play(page);
    await page.evaluate(() => window.__presentPlaybackRuntime.dispatchGuarded("CONNECTION_LOST"));
    await assertFrozen(page, initialIndex);
    await page.locator('[data-presentation-control-id="play"]').click();
    await page.waitForTimeout(350);
    assert.equal(await readSafety(page, "playing"), false);
    assert.equal(await readSafety(page, "activeIndex"), initialIndex);

    await page.evaluate(() => window.__presentPlaybackRuntime.dispatchGuarded("RECONNECTING"));
    await page.evaluate(() => window.__presentPlaybackRuntime.dispatchGuarded("CONNECTED"));
    assert.equal(await readSafety(page, "playing"), false);
    await play(page);

    await page.locator('[data-presentation-control-id="end"]').click();
    await assertFrozen(page, initialIndex);
    assert.equal(await readSafety(page, "hasSession"), false);
    assert.equal(await page.evaluate(() => window.__presentReentrantPublishResult), null);
  } finally {
    await page.close();
  }
});

test("throwing channel and window startup clean partial resources to a retryable terminal state", async () => {
  for (const failure of ["channel", "window"]) {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    try {
      await page.goto(`${baseURL}/tests/fixtures/present-playback-safety-harness.html`);
      await page.waitForFunction(() => window.__presentPlaybackHarnessReady === true);
      await page.evaluate((selectedFailure) => {
        window.__presentChannelStartThrows = selectedFailure === "channel";
        window.__presentOpenMode = selectedFailure === "window" ? "throw" : "opened";
      }, failure);
      await page.locator('[data-presentation-control-id="open-new-session"]').click();

      await page.waitForFunction(() => window.__presentPlaybackSafety?.hasSession === false);
      await page.locator('[data-presentation-control-id="open-new-session"]').waitFor();
      assert.equal(await readSafety(page, "lifecycle"), "ended");
    } finally {
      await page.close();
    }
  }
});

test("popup-blocked Open retains one retryable session and Reopen uses its identity", async () => {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  try {
    await page.goto(`${baseURL}/tests/fixtures/present-playback-safety-harness.html`);
    await page.waitForFunction(() => window.__presentPlaybackHarnessReady === true);
    await page.evaluate(() => { window.__presentOpenMode = "blocked"; });
    await page.locator('[data-presentation-control-id="open-new-session"]').click();
    await page.waitForFunction(() => window.__presentPlaybackSafety?.hasSession === true);
    const first = await page.evaluate(() => ({
      sessionId: window.__presentPlaybackSafety.sessionId,
      windowName: window.__presentLastOpen.name,
    }));

    await page.evaluate(() => { window.__presentOpenMode = "opened"; });
    await page.locator('[data-presentation-control-id="reopen-audience"]').click();
    await page.waitForFunction(() => window.__presentAudienceWindow.closed === false);
    const retried = await page.evaluate(() => ({
      sessionId: window.__presentPlaybackSafety.sessionId,
      windowName: window.__presentLastOpen.name,
    }));

    assert.deepEqual(retried, first);
    assert.equal(await readSafety(page, "hasSession"), true);
  } finally {
    await page.close();
  }
});

test("runtime unmount terminalizes before throwing publish and still closes and disposes", async () => {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  try {
    await page.goto(`${baseURL}/tests/fixtures/present-playback-safety-harness.html`);
    await page.waitForFunction(() => window.__presentPlaybackHarnessReady === true);
    await page.locator('[data-presentation-control-id="open-new-session"]').click();
    await page.waitForFunction(() => Boolean(window.__presentPlaybackSafety?.sessionId));
    await page.evaluate(() => {
      window.__presentTeardownCalls = [];
      window.__presentReentrantPublishResult = "not-called";
      window.__presentPublishEndedThrows = true;
      window.__presentTrackTeardown = true;
      window.__unmountPresentPlaybackHarness();
    });

    assert.equal(await page.evaluate(() => window.__presentReentrantPublishResult), null);
    assert.deepEqual(
      await page.evaluate(() => window.__presentTeardownCalls),
      ["publish", "close", "dispose"],
    );
  } finally {
    await page.close();
  }
});

async function openConnectedSafetyHarness(page) {
  await page.goto(`${baseURL}/tests/fixtures/present-playback-safety-harness.html`);
  await page.waitForFunction(() => window.__presentPlaybackHarnessReady === true);
  await page.locator('[data-presentation-control-id="open-new-session"]').click();
  await page.waitForFunction(() => Boolean(window.__presentPlaybackSafety?.sessionId));
  await page.evaluate(() => {
    const state = window.__presentPlaybackSafety;
    const channel = new BroadcastChannel(`simex-presentation-${state.sessionId}`);
    channel.postMessage({
      protocol_version: 3,
      session_id: state.sessionId,
      sequence: 1,
      type: "ready",
      payload: null,
    });
    channel.close();
  });
  await page.waitForFunction(() => window.__presentPlaybackSafety?.connection === "connected");
}

async function play(page) {
  await page.locator('[data-presentation-control-id="play"]').click();
  await page.waitForFunction(() => window.__presentPlaybackSafety?.playing === true);
}

async function assertFrozen(page, expectedIndex) {
  await page.waitForTimeout(350);
  assert.equal(await readSafety(page, "playing"), false);
  assert.equal(await readSafety(page, "activeIndex"), expectedIndex);
}

async function readSafety(page, key) {
  return page.evaluate((selectedKey) => window.__presentPlaybackSafety?.[selectedKey], key);
}
