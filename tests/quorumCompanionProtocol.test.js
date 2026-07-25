import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const protocolModule = await import("../src/lib/quorumCompanionProtocol.js").catch(
  () => null,
);
const fixture = JSON.parse(
  await readFile("tests/fixtures/quorum-companion-v1.json", "utf8"),
);

test("protocol codec is available", () => {
  for (const exportName of [
    "parseBootstrap",
    "parseCompanionMessage",
    "makeDashboardMessage",
  ]) {
    assert.equal(
      typeof protocolModule?.[exportName],
      "function",
      `${exportName} must be implemented`,
    );
  }
});

test("bootstrap accepts only the exact versioned same-origin contract", () => {
  assert.ok(protocolModule, "protocol module must be implemented");
  const bootstrap = {
    protocol_version: "1",
    session_id: "session-001",
    catalogue_id: "simex-dashboard",
    catalogue_digest: "a".repeat(64),
    credential: "opaque-session-secret",
    gateway_path: "/companion/ws",
  };

  assert.deepEqual(protocolModule.parseBootstrap(bootstrap), bootstrap);
  assert.throws(
    () => protocolModule.parseBootstrap({ ...bootstrap, transcript: "forbidden" }),
    /unknown bootstrap field: transcript/,
  );
  assert.throws(
    () => protocolModule.parseBootstrap({ ...bootstrap, protocol_version: "2" }),
    /unsupported protocol version/,
  );
  assert.throws(
    () => protocolModule.parseBootstrap({ ...bootstrap, gateway_path: "ws://remote/ws" }),
    /gateway path/,
  );
});

test("every shared v1 example parses without normalization or data loss", () => {
  assert.ok(protocolModule, "protocol module must be implemented");
  for (const example of fixture.examples) {
    assert.deepEqual(
      protocolModule.parseCompanionMessage(JSON.stringify(example)),
      example,
    );
  }
});

test("protocol rejects discussion text and unknown payload fields", () => {
  assert.ok(protocolModule, "protocol module must be implemented");
  const command = structuredClone(
    fixture.examples.find(({ type }) => type === "display_set_requested"),
  );
  command.payload.transcript = "forbidden discussion text";

  assert.throws(
    () => protocolModule.parseCompanionMessage(JSON.stringify(command)),
    /unknown payload field: transcript/,
  );
});

test("protocol rejects invalid envelopes, sizes, reasons, and chart sets", () => {
  assert.ok(protocolModule, "protocol module must be implemented");
  const command = fixture.examples.find(
    ({ type }) => type === "display_set_requested",
  );

  assert.throws(
    () =>
      protocolModule.parseCompanionMessage(
        JSON.stringify({ ...command, sequence: 0 }),
      ),
    /sequence/,
  );
  assert.throws(
    () =>
      protocolModule.parseCompanionMessage(
        JSON.stringify({
          ...command,
          payload: { ...command.payload, reason_code: "free_text_reason" },
        }),
      ),
    /reason code/,
  );
  assert.throws(
    () =>
      protocolModule.parseCompanionMessage(
        JSON.stringify({
          ...command,
          payload: { ...command.payload, chart_ids: ["a", "a"] },
        }),
      ),
    /unique chart IDs/,
  );
  assert.throws(
    () => protocolModule.parseCompanionMessage("x".repeat(16_385)),
    /message exceeds 16384 bytes/,
  );
});

test("dashboard message creation validates and deeply freezes output", () => {
  assert.ok(protocolModule, "protocol module must be implemented");
  const message = protocolModule.makeDashboardMessage({
    messageId: "dashboard-message-10",
    sessionId: "session-001",
    sequence: 10,
    idempotencyKey: "snapshot:instance-001:3",
    type: "dashboard_snapshot",
    payload: {
      dashboard_instance_id: "instance-001",
      display_revision: 3,
      displayed_chart_ids: ["bio_confirmed_cases"],
    },
  });

  assert.equal(message.protocol_version, "1");
  assert.equal(message.acknowledgement_status, "required");
  assert.ok(Object.isFrozen(message));
  assert.ok(Object.isFrozen(message.payload));
  assert.ok(Object.isFrozen(message.payload.displayed_chart_ids));
  assert.throws(() => {
    message.payload.displayed_chart_ids.push("bio_mortality_age");
  }, TypeError);
});
