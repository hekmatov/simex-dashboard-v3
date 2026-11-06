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
  const features = Object.fromEntries(calls[0][2]?.split(",").map((feature) => feature.split("=")) ?? []);
  assert.equal(features.popup, "yes", "audience opening must request a separate popup window");
  assert.ok(Number(features.width) >= 1024);
  assert.ok(Number(features.height) >= 720);
  assert.equal(features.resizable, "yes");
  assert.equal(features.scrollbars, "yes");
  assert.equal(features.noopener, undefined, "audience must retain its opener connection");
  assert.equal(features.noreferrer, undefined);
});

test("Rehearse requests the declared CSS resolution on the real Audience route", () => {
  const calls = [];
  const result = windowModule.openAudienceWindow({ channelId: "rehearsal-1", location: "https://simex.test/",
    resolution: { width: 1600, height: 900 }, openWindow: (...args) => { calls.push(args); return {}; } });
  assert.equal(new URL(result.url).searchParams.get("surface"), "audience");
  assert.match(calls[0][2], /width=1600,height=900/);
  assert.throws(() => windowModule.openAudienceWindow({ channelId: "rehearsal-1", location: "https://simex.test/", resolution: { width: -1, height: 900 } }), /resolution/i);
});

test("Rehearse resizes the existing named Audience viewport in place", () => {
  const audience = {
    innerWidth: 700,
    innerHeight: 479,
    outerWidth: 716,
    outerHeight: 553,
    resizeTo(width, height) {
      this.innerWidth = width - 16;
      this.innerHeight = height - 74;
      this.outerWidth = width;
      this.outerHeight = height;
    },
  };
  const openOptions = {
    channelId: "rehearsal-1",
    windowName: "audience-generation-7",
    location: "https://simex.test/",
    existingWindow: audience,
    openWindow: (url, name) => {
      assert.equal(new URL(url).searchParams.get("channel"), "rehearsal-1");
      assert.equal(name, "audience-generation-7");
      return audience;
    },
  };

  const ordinary = windowModule.openAudienceWindow(openOptions);
  assert.equal(ordinary.windowRef, audience);
  assert.deepEqual([audience.innerWidth, audience.innerHeight], [700, 479]);

  const rehearsal = windowModule.openAudienceWindow({
    ...openOptions,
    resolution: { width: 400, height: 320 },
  });
  assert.equal(rehearsal.status, "opened");
  assert.equal(rehearsal.windowRef, audience);
  assert.deepEqual([audience.innerWidth, audience.innerHeight], [400, 320]);
});

test("browser denial of Audience resizing preserves the reopened window", () => {
  const audience = {
    resizeTo() {},
    get outerWidth() {
      throw new Error("browser denied access to popup geometry");
    },
  };
  const result = windowModule.openAudienceWindow({
    channelId: "rehearsal-1",
    location: "https://simex.test/",
    existingWindow: audience,
    resolution: { width: 400, height: 320 },
    openWindow: () => audience,
  });
  assert.equal(result.status, "opened");
  assert.equal(result.windowRef, audience);
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

test("manual Audience closure notifies once and releases its observer", () => {
  let tick, clears = 0, closes = 0;
  const audience = { closed: false };
  const stop = windowModule.observeAudienceWindowClosure({ getWindow: () => audience,
    onClosed: () => closes++, scheduler: { setInterval: callback => { tick = callback; return 1; }, clearInterval: () => clears++ } });
  tick(); assert.equal(closes, 0);
  audience.closed = true; tick(); tick();
  assert.equal(closes, 1); assert.equal(clears, 1);
  stop(); assert.equal(clears, 1);
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

test("a revoked or throwing closed getter is treated as denied without escaping", () => {
  let closeCalls = 0;
  const revoked = {
    close() {
      closeCalls += 1;
    },
    get closed() {
      throw new Error("window proxy revoked");
    },
  };
  assert.doesNotThrow(() => windowModule.requestAudienceWindowClose(revoked));
  assert.deepEqual(windowModule.requestAudienceWindowClose(revoked), {
    outcome: "denied-surface-remains",
  });
  assert.equal(closeCalls, 2);
});
