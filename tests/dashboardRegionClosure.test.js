import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyDashboardRegionClosure,
  isDashboardRegionCandidate,
} from "./e2e/support/dashboard-region-closure.js";
import {
  dashboardDensityExternalPortalCandidateRequiresScope,
  dashboardRegionDirectStyleSignature,
  dashboardRegionCandidateRequiresOwnBoundary,
} from "./e2e/support/dashboard-density-audit.js";

const knownJourneyIds = ["build-standard"];
const registry = [{
  id: "build-command-header",
  owner: "BuildCommandHeader",
  role: "command-bar",
  material: "flat",
  witnesses: ["build-standard"],
  styleWitnessRequired: true,
}];

const mounted = (overrides = {}) => [{
  regionId: "build-command-header",
  role: "command-bar",
  material: "flat",
  styleSignature: "shared-command-bar",
  ...overrides,
}];

test("classifies an unowned named painted multi-action bar outside its shell boundary", () => {
  const result = classifyDashboardRegionClosure({
    journeyId: "build-standard",
    registry,
    knownJourneyIds,
    mountedRegions: mounted(),
    candidates: [{
      id: "build-like-bar",
      signals: ["named-structure", "distinct-paint", "multi-action"],
      requiresOwnBoundary: true,
      containingRegions: [{ regionId: "app-frame-shell", distance: 2 }],
      exemption: null,
    }],
  });

  assert.deepEqual(result.failures.map(({ type, candidateId }) => ({ type, candidateId })), [
    { type: "UNOWNED", candidateId: "build-like-bar" },
  ]);
});

test("discovers only application-owned external portal candidates", () => {
  assert.equal(dashboardDensityExternalPortalCandidateRequiresScope({
    outsideJourneyRoot: true,
    withinApplicationOwner: true,
    role: "dialog",
    position: "static",
  }), true);
  assert.equal(dashboardDensityExternalPortalCandidateRequiresScope({
    outsideJourneyRoot: true,
    withinApplicationOwner: true,
    role: "",
    position: "fixed",
  }), true);
  assert.equal(dashboardDensityExternalPortalCandidateRequiresScope({
    outsideJourneyRoot: true,
    withinApplicationOwner: false,
    explicitDashboardOwnership: true,
    role: "dialog",
    position: "fixed",
  }), true);
  assert.equal(dashboardDensityExternalPortalCandidateRequiresScope({
    outsideJourneyRoot: true,
    withinApplicationOwner: false,
    explicitDashboardOwnership: false,
    role: "dialog",
    position: "fixed",
  }), false);
  assert.equal(dashboardDensityExternalPortalCandidateRequiresScope({
    outsideJourneyRoot: false,
    withinApplicationOwner: true,
    role: "dialog",
    position: "fixed",
  }), false);
});

test("accepts an exact registered candidate boundary", () => {
  const result = classifyDashboardRegionClosure({
    journeyId: "build-standard", registry, knownJourneyIds, mountedRegions: mounted(),
    candidates: [{
      id: "build-command-header",
      signals: ["toolbar-navigation"],
      requiresOwnBoundary: true,
      containingRegions: [{ regionId: "build-command-header", distance: 0 }],
      exemption: null,
    }],
  });

  assert.deepEqual(result.failures, []);
});

test("keeps a transparent inner toolbar with its enclosing command-bar boundary", () => {
  const signals = ["named-structure", "toolbar-navigation"];
  const result = classifyDashboardRegionClosure({
    journeyId: "build-standard", registry, knownJourneyIds, mountedRegions: mounted(),
    candidates: [{
      id: "build-command-main-row",
      signals,
      requiresOwnBoundary: dashboardRegionCandidateRequiresOwnBoundary(signals),
      containingRegions: [{ regionId: "build-command-header", distance: 1 }],
      exemption: null,
    }],
  });

  assert.equal(dashboardRegionCandidateRequiresOwnBoundary(signals), false);
  assert.deepEqual(result.failures, []);
});

test("reports peer region boundaries at the same nearest distance as ambiguous", () => {
  const result = classifyDashboardRegionClosure({
    journeyId: "build-standard",
    knownJourneyIds,
    registry: [
      ...registry,
      { ...registry[0], id: "build-command-actions", owner: "BuildCommandActions" },
    ],
    mountedRegions: [
      ...mounted(),
      ...mounted({ regionId: "build-command-actions" }),
    ],
    candidates: [{
      id: "command-actions",
      signals: ["multi-action"],
      requiresOwnBoundary: false,
      containingRegions: [
        { regionId: "build-command-header", distance: 1 },
        { regionId: "build-command-actions", distance: 1 },
      ],
      exemption: null,
    }],
  });

  assert.deepEqual(result.failures.map(({ type, candidateId }) => ({ type, candidateId })), [
    { type: "AMBIGUOUS", candidateId: "command-actions" },
  ]);
});

test("reports expected witness regions that are absent", () => {
  const result = classifyDashboardRegionClosure({
    journeyId: "build-standard", registry, knownJourneyIds, mountedRegions: [], candidates: [],
  });

  assert.deepEqual(result.failures.map(({ type, regionId }) => ({ type, regionId })), [
    { type: "MISSING", regionId: "build-command-header" },
  ]);
});

test("reports empty and unknown registry witnesses", () => {
  const result = classifyDashboardRegionClosure({
    journeyId: "build-standard",
    knownJourneyIds,
    registry: [
      { ...registry[0], id: "empty-witness", witnesses: [] },
      { ...registry[0], id: "unknown-witness", witnesses: ["not-a-journey"] },
    ],
    mountedRegions: [],
    candidates: [],
  });

  assert.deepEqual(result.failures.map(({ type, regionId }) => ({ type, regionId })), [
    { type: "UNWITNESSED", regionId: "empty-witness" },
    { type: "UNWITNESSED", regionId: "unknown-witness" },
  ]);
});

test("reports mismatched markers and missing shared style signatures", () => {
  const result = classifyDashboardRegionClosure({
    journeyId: "build-standard",
    registry,
    knownJourneyIds,
    mountedRegions: [
      ...mounted({ role: "panel", material: "ledger-register", styleSignature: "" }),
    ],
    candidates: [],
  });

  assert.deepEqual(result.failures.map(({ type, regionId }) => ({ type, regionId })), [
    { type: "UNSTYLED", regionId: "build-command-header" },
  ]);
});

test("does not accept inherited theme variables as direct region style evidence", () => {
  assert.equal(dashboardRegionDirectStyleSignature({
    role: "panel",
    material: "flat",
    roleRuleMatches: [],
    materialRuleMatches: [],
    inheritedRoleValue: "linear-gradient(inherited)",
  }), "");

  assert.match(dashboardRegionDirectStyleSignature({
    role: "panel",
    material: "flat",
    roleRuleMatches: [".dashboard-header -> var(--simex-role-panel-background)"],
    materialRuleMatches: [],
  }), /dashboard-header/);

  assert.equal(dashboardRegionDirectStyleSignature({
    role: "table",
    material: "ledger-register",
    roleRuleMatches: [".chart-table-view -> var(--simex-role-table-background)"],
    materialRuleMatches: [],
  }), "");
});

test("accepts a bounded owner-specific non-surface exemption", () => {
  const result = classifyDashboardRegionClosure({
    journeyId: "build-standard", registry, knownJourneyIds, mountedRegions: mounted(),
    candidates: [{
      id: "non-surface-label-group",
      signals: ["named-structure"],
      requiresOwnBoundary: true,
      containingRegions: [],
      exemption: { owner: "BuildCommandHeader", reason: "Inline label grouping only." },
    }],
  });

  assert.deepEqual(result.failures, []);
});

test("identifies visual-region signals without consulting the registry", () => {
  for (const signal of [
    "named-structure", "toolbar-navigation", "sticky-fixed", "distinct-paint", "multi-action",
    "dialog", "drawer", "menu", "status", "table", "chart-cell",
  ]) {
    assert.equal(isDashboardRegionCandidate({ id: signal, signals: [signal] }), true, signal);
  }
  assert.equal(isDashboardRegionCandidate({ id: "plain-copy", signals: [] }), false);
});
