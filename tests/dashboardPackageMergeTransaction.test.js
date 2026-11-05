import test from "node:test";
import assert from "node:assert/strict";
import { collaboratorPackage } from "./helpers/dashboardPackageFixtures.js";
import { buildDashboardPackageMerge } from "../src/lib/dashboardPackageMerge.js";
import { createSerializedDashboardCommitController } from "../src/lib/dashboardCommitController.js";
import { createBrowserAuthoredAssetStore } from "../src/static-content/assets/browserAuthoredAssetStore.js";

test("additive import commits once for double submit and reconciles an ambiguous persistence success", async () => {
  const { commitDashboardPackageMerge } = await import("../src/lib/dashboardPackageMergeTransaction.js");
  const env = environment({ ambiguous: true });
  const input = { ...env, proposal: proposal(env.current), transactionId: "same-review" };
  const [one, two] = await Promise.all([commitDashboardPackageMerge(input), commitDashboardPackageMerge(input)]);
  assert.deepEqual(one.config, two.config);
  assert.equal(env.commits(), 1);
  assert.equal(env.controller.getCurrent().pages[0].sections[0].panels.length, 3);
});

test("stale reviewed revisions reject under the commit queue without staging bytes", async () => {
  const { commitDashboardPackageMerge } = await import("../src/lib/dashboardPackageMergeTransaction.js");
  const env = environment();
  const reviewed = proposal(env.current, true);
  await env.controller.mutate(config => { config.description = "New local authored content"; return config; });
  await assert.rejects(commitDashboardPackageMerge({ ...env, proposal: reviewed, transactionId: "stale" }), /changed|stale/i);
  assert.deepEqual(await env.store.list(), []);
  assert.equal(env.controller.getCurrent().description, "New local authored content");
});

test("an unresolved persistence outcome blocks every new import review until authoritative recovery", async () => {
  const { commitDashboardPackageMerge } = await import("../src/lib/dashboardPackageMergeTransaction.js");
  const env = environment({ ambiguous: true });
  const readCommitted = async () => { throw new Error("storage cannot be read"); };
  await assert.rejects(commitDashboardPackageMerge({ ...env, readCommitted, proposal: proposal(env.current), transactionId: "unknown-first" }), { code: "IMPORT_OUTCOME_UNKNOWN" });
  await assert.rejects(commitDashboardPackageMerge({ ...env, readCommitted, proposal: proposal(env.current), transactionId: "new-review" }), { code: "IMPORT_OUTCOME_UNKNOWN" });
  assert.equal(env.commits(), 1, "a new UI review must not bypass uncertain commit recovery");
  const queued = environment({ ambiguous: true });
  const outcomes = await Promise.allSettled([
    commitDashboardPackageMerge({ ...queued, readCommitted, proposal: proposal(queued.current), transactionId: "queued-first" }),
    commitDashboardPackageMerge({ ...queued, readCommitted, proposal: proposal(queued.current), transactionId: "queued-second" }),
  ]);
  assert.equal(outcomes.every(outcome => outcome.status === "rejected" && outcome.reason.code === "IMPORT_OUTCOME_UNKNOWN"), true);
  assert.equal(queued.commits(), 1, "already-queued reviews must also respect recovery");
});

test("failure restores newly owned assets and preserves another draft's staged claim", async () => {
  const { commitDashboardPackageMerge } = await import("../src/lib/dashboardPackageMergeTransaction.js");
  const env = environment({ fail: true });
  const reviewed = proposal(env.current, true);
  const [assetId, payload] = Object.entries(reviewed.assetPayloads)[0];
  const manifest = reviewed.config.assets[assetId];
  await env.store.stage({ bytes: Uint8Array.from(Buffer.from(payload.base64, "base64")), ...manifest, transactionId: "unrelated-draft" });
  const lease = await env.store.createObjectUrlLease(assetId);
  await assert.rejects(commitDashboardPackageMerge({ ...env, proposal: reviewed, transactionId: "failed" }), /storage failure/);
  const [retained] = await env.store.list();
  assert.equal(retained.id, assetId);
  assert.equal(retained.status, "staged");
  assert.deepEqual(retained.transactionIds, ["unrelated-draft"]);
  assert.deepEqual(env.revoked, [], "rollback preserves the unrelated owner's current preview URL");
  assert.equal(env.store.leases.has(assetId), true);
  assert.deepEqual(env.controller.getCurrent(), env.current);
  lease.release();
  const empty = environment({ fail: true });
  await assert.rejects(commitDashboardPackageMerge({ ...empty, proposal: proposal(empty.current, true), transactionId: "new-owned" }), /storage failure/);
  assert.deepEqual(await empty.store.list(), []);
});

function proposal(current, withImage = false) {
  return buildDashboardPackageMerge({ current, candidate: collaboratorPackage({ value: 99, staticPanels: withImage }),
    selection: { placementIds: [withImage ? "placement-picture" : "placement-a"] },
    destination: { scope: "placements", pageId: "overview", sectionId: "signals" } });
}

function environment({ fail = false, ambiguous = false } = {}) {
  const current = collaboratorPackage().config;
  let committed = structuredClone(current), commits = 0;
  const controller = createSerializedDashboardCommitController({ initialDashboard: current, commit: async config => {
    commits += 1;
    if (fail) throw new Error("storage failure");
    committed = structuredClone(config);
    if (ambiguous) throw new Error("response lost after durable success");
    return committed;
  } });
  const records = new Map();
  const adapter = { async get(id) { return structuredClone(records.get(id)); },
    async put(record) { records.set(record.id, structuredClone(record)); },
    async putMany(values) { for (const value of values) records.set(value.id, structuredClone(value)); },
    async remove(id) { records.delete(id); }, async list() { return structuredClone([...records.values()]); },
    async restore(snapshot) { for (const [id, record] of snapshot) { if (record === null) records.delete(id); else records.set(id, structuredClone(record)); } },
  };
  const revoked = [];
  return { current, controller, store: createBrowserAuthoredAssetStore({ adapter,
    urlApi: { createObjectURL: () => "blob:unrelated-owner", revokeObjectURL: value => revoked.push(value) } }), revoked, commits: () => commits,
    readCommitted: async () => structuredClone(committed) };
}
