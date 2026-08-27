import test from "node:test";
import assert from "node:assert/strict";

const windowModule = await import("../src/lib/presentationWindow.js").catch(
  () => null,
);

test("audience popup preserves the current app URL and creates a collision-safe channel", () => {
  assert.ok(windowModule, "presentation window helper must be implemented");
  const calls = [];
  const windowRef = { focus() {} };
  const result = windowModule.openAudienceWindow({
    location: "https://simex.example/app/?scenario=demo#overview",
    crypto: { randomUUID: () => "session-001" },
    openWindow: (...args) => {
      calls.push(args);
      return windowRef;
    },
  });

  const url = new URL(result.url);
  assert.equal(result.status, "opened");
  assert.equal(result.windowRef, windowRef);
  assert.equal(url.pathname, "/app/");
  assert.equal(url.searchParams.get("scenario"), "demo");
  assert.equal(url.searchParams.get("mode"), "present");
  assert.equal(url.searchParams.get("surface"), "audience");
  assert.equal(url.searchParams.get("channel"), "session-001");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], result.url);
  assert.equal(calls[0][1], "simex-audience-session-001");
});

test("audience popup uses the runtime-supplied session-unique window name", () => {
  const calls = [];
  windowModule.openAudienceWindow({
    location: "https://simex.example/app/",
    channelId: "session-002",
    windowName: "audience-generation-7",
    openWindow: (...args) => {
      calls.push(args);
      return {};
    },
  });
  assert.equal(calls[0][1], "audience-generation-7");
});

test("blocked audience popup reports blocked without a fallback", () => {
  assert.ok(windowModule, "presentation window helper must be implemented");
  const result = windowModule.openAudienceWindow({
    location: "https://simex.example/app/",
    channelId: "session-001",
    openWindow: () => null,
  });

  assert.deepEqual(result, {
    status: "blocked",
    windowRef: null,
    url: "https://simex.example/app/?mode=present&surface=audience&channel=session-001",
  });
});

test("audience close succeeds only when the surface reports closed true", () => {
  let calls = 0;
  const windowRef = {
    closed: false,
    close() {
      calls += 1;
      this.closed = true;
    },
  };
  assert.deepEqual(windowModule.requestAudienceWindowClose(windowRef), {
    outcome: "succeeded",
  });
  assert.equal(calls, 1);
});

test("already-closed audience remains a successful close outcome", () => {
  let calls = 0;
  const windowRef = {
    closed: true,
    close() {
      calls += 1;
    },
  };
  assert.deepEqual(windowModule.requestAudienceWindowClose(windowRef), {
    outcome: "succeeded",
  });
  assert.equal(calls, 1);
});

test("no-op, throwing, and missing close adapters deny closure without throwing", () => {
  const noOp = { closed: false, close() {} };
  const throwing = {
    closed: false,
    close() {
      throw new Error("browser denied close");
    },
  };
  const missing = { closed: false };
  for (const windowRef of [noOp, throwing, missing, null]) {
    assert.deepEqual(windowModule.requestAudienceWindowClose(windowRef), {
      outcome: "denied-surface-remains",
    });
  }
});
