import assert from "node:assert/strict";
import test from "node:test";

import {
  DASHBOARD_JOURNEY_MANIFEST,
  summarizeDashboardJourneyManifest,
} from "./e2e/support/dashboard-surface-manifest.js";
import {
  DASHBOARD_JOURNEY_PRIMARY_ROLES,
  STYLE_SIGNATURE_CHECKS,
  buildDashboardJourneyStyleDispositionMatrix,
  dashboardJourneyGroupingRoleFor,
} from "../src/theme/dashboardSurfaceRoles.js";

const STYLE_IDS = ["ledger", "humanist", "instrument"];
const ROLE_IDS = ["shell", "command-bar", "panel", "editor", "dialog", "drawer", "menu", "status", "table", "chart-cell"];

test("fails when a journey is omitted from primary-role contact-sheet grouping", () => {
  const summary = summarizeDashboardJourneyManifest(DASHBOARD_JOURNEY_MANIFEST);
  const mappedIds = Object.values(DASHBOARD_JOURNEY_PRIMARY_ROLES).flat();

  assert.equal(summary.total, 71);
  assert.equal(summary.executable, 64);
  assert.equal(summary.coverageAliases, 6);
  assert.equal(summary.intentionallyOutOfScope, 1);
  assert.equal(mappedIds.length, 71);
  assert.equal(new Set(mappedIds).size, 71);
  assert.deepEqual(
    DASHBOARD_JOURNEY_MANIFEST.map(({ id }) => id).filter((id) => !mappedIds.includes(id)),
    [],
  );
});

test("fails when a journey grouping role is omitted or a style signature is misclassified", () => {
  assert.deepEqual(Object.keys(DASHBOARD_JOURNEY_PRIMARY_ROLES), ROLE_IDS);
  assert.deepEqual(Object.keys(STYLE_SIGNATURE_CHECKS), STYLE_IDS);
  assert.deepEqual(STYLE_SIGNATURE_CHECKS.ledger, {
    contour: "square",
    material: "flat",
    typography: "serif",
    separator: "register-divider",
    elevation: "none",
  });
  assert.deepEqual(STYLE_SIGNATURE_CHECKS.humanist, {
    contour: "rounded",
    material: "tonal",
    typography: "sans-serif",
    separator: "gentle-separation",
    elevation: "soft",
  });
  assert.deepEqual(STYLE_SIGNATURE_CHECKS.instrument, {
    contour: "precise",
    material: "technical",
    typography: "monospace-data",
    separator: "accent-rail",
    elevation: "low-profile",
  });
});

test("fails when the scene observation fixture is misclassified as status instead of dialog", () => {
  assert.equal(dashboardJourneyGroupingRoleFor("scene-observation-dialog"), "dialog");
  assert.equal(DASHBOARD_JOURNEY_PRIMARY_ROLES.status.includes("scene-observation-dialog"), false);
});

test("fails when the Page command-form replacement or a style matrix cell is absent", () => {
  const matrix = buildDashboardJourneyStyleDispositionMatrix(DASHBOARD_JOURNEY_MANIFEST);
  const commandForm = matrix.filter(({ surfaceId }) => surfaceId === "build-page-command-form");
  const executableCells = matrix.filter(({ sourceDisposition }) => sourceDisposition === "executable");
  const mappedCells = matrix.filter(({ sourceDisposition }) => sourceDisposition !== "executable");

  assert.equal(commandForm.length, 3);
  assert.deepEqual(commandForm.map(({ style }) => style), STYLE_IDS);
  assert.deepEqual(commandForm.map(({ renderedDisposition }) => renderedDisposition), ["PENDING_RENDER", "PENDING_RENDER", "PENDING_RENDER"]);
  assert.equal(matrix.length, 213);
  assert.equal(executableCells.length, 192);
  assert.equal(mappedCells.length, 21);
  assert.equal(mappedCells.filter(({ renderedDisposition }) => renderedDisposition === "COVERAGE_ALIAS").length, 18);
  assert.equal(mappedCells.filter(({ renderedDisposition }) => renderedDisposition === "OUT_OF_SCOPE").length, 3);
  assert.equal(executableCells.every(({ renderedDisposition }) => renderedDisposition === "PENDING_RENDER"), true);
  assert.equal(matrix.some(({ surfaceId }) => surfaceId === "build-page-orbit"), false);
  assert.equal(matrix.some(({ renderedDisposition }) => renderedDisposition === "PASS"), false);
});

test("fails when an unknown source disposition is misclassified as the approved exclusion", () => {
  assert.throws(
    () => buildDashboardJourneyStyleDispositionMatrix([{
      id: "unknown-disposition-fixture",
      surfaceRole: "shell",
      disposition: "unexpected-disposition",
    }]),
    /Unknown dashboard journey disposition: unexpected-disposition/,
  );
});
