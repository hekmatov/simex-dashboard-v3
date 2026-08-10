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
