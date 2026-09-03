import { expect, test } from "@playwright/test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DASHBOARD_SURFACE_MANIFEST,
  summarizeDashboardSurfaceManifest,
} from "./support/dashboard-surface-manifest.js";
import {
  collapseDashboardDensityFindings,
  collectDashboardDensityEvidence,
  DASHBOARD_DENSITY_CATEGORIES,
  DASHBOARD_DENSITY_SETTLE_STYLE,
  dashboardDensityBoxesStable,
} from "./support/dashboard-density-audit.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const ALL_CATEGORIES = DASHBOARD_DENSITY_CATEGORIES;

test.describe.configure({ timeout: 30 * 60_000 });

test("complete dashboard surface manifest records density evidence", async ({ browser, request }, testInfo) => {
  const phase = process.env.DASHBOARD_DENSITY_AUDIT_PHASE || "current-state";
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(phase)) {
    throw new Error(`Invalid density audit phase: ${phase}`);
  }
  const requestedRunId = String(process.env.DASHBOARD_DENSITY_AUDIT_RUN_ID ?? "").trim();
  if (requestedRunId && !/^[a-z0-9][a-z0-9_-]*$/i.test(requestedRunId)) {
    throw new Error(`Invalid density audit run id: ${requestedRunId}`);
  }
  const artifactId = requestedRunId || phase;
  const outputRoot = path.resolve(
    "docs",
    "audits",
    "2026-09-02-dense-desktop-redesign",
    "raw",
    artifactId,
  );
  const screenshotRoot = path.join(outputRoot, "screenshots");
  const evidenceRoot = path.join(outputRoot, "evidence");
  const progressPath = path.join(outputRoot, "audit-progress.json");
  if (requestedRunId) {
    await mkdir(path.dirname(outputRoot), { recursive: true });
    await mkdir(outputRoot);
  } else {
    await rm(outputRoot, { recursive: true, force: true });
    await mkdir(outputRoot, { recursive: true });
  }
  await mkdir(screenshotRoot);
  await mkdir(evidenceRoot);

  const requestedIds = new Set(
    String(process.env.DASHBOARD_DENSITY_SURFACES ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const knownIds = new Set(DASHBOARD_SURFACE_MANIFEST.map(({ id }) => id));
  const unknownRequestedIds = [...requestedIds].filter((id) => !knownIds.has(id));
  expect(unknownRequestedIds, "Every requested density surface must exist in the manifest")
    .toEqual([]);
  const selected = requestedIds.size
    ? DASHBOARD_SURFACE_MANIFEST.filter(({ id }) => requestedIds.has(id))
    : DASHBOARD_SURFACE_MANIFEST;
  const results = [];

  for (const entry of selected) {
    if (entry.disposition === "intentionally-out-of-scope") {
      results.push({
        surface: serializableEntry(entry),
        status: "intentionally-out-of-scope",
        reason: entry.reason,
        inspectedCategories: [],
        categoriesWithNoIssue: [],
        findings: [],
      });
      await writeProgress(progressPath, phase, selected.length, results);
      console.log(`[density-audit] ${entry.id}: intentionally-out-of-scope`);
      continue;
    }
    if (entry.disposition === "coverage-alias") {
      results.push({
        surface: serializableEntry(entry),
        status: "covered-by-alias",
        aliasOf: entry.aliasOf,
        reason: entry.reason,
        inspectedCategories: [],
        categoriesWithNoIssue: [],
        findings: [],
      });
      await writeProgress(progressPath, phase, selected.length, results);
      console.log(`[density-audit] ${entry.id}: covered-by-alias (${entry.aliasOf})`);
      continue;
    }

    const startedAt = Date.now();
    let browserContext;
    let activePage;
    const pageErrors = new Set();
    const recordPageError = (error) => pageErrors.add(String(error?.message ?? error));
    try {
      await requireOkResponse(
        () => request.post(`${CONTROL_URL}/__test__/reset`),
        `Reset source server for ${entry.id}`,
      );
      await requireOkResponse(
        () => request.post(`${CONTROL_URL}/__test__/catalogue-mode`, { data: { mode: "absent" } }),
        `Set catalogue mode for ${entry.id}`,
      );
      browserContext = await browser.newContext({
        baseURL: testInfo.project.use.baseURL ?? "http://127.0.0.1:4173",
        viewport: entry.viewport,
        serviceWorkers: "block",
      });
      if (entry.appearance === "dark") {
        await browserContext.addInitScript(() => {
          localStorage.setItem("simex-dashboard-appearance-v3", "dark");
        });
      }
      activePage = await browserContext.newPage();
      activePage.setDefaultTimeout(12_000);
      activePage.setDefaultNavigationTimeout(30_000);
      activePage.on("pageerror", recordPageError);
      const setup = await withDeadline(
        entry.setup({ page: activePage, browserContext, entry }),
        45_000,
        `Surface setup exceeded 45 seconds: ${entry.id}`,
      );
      activePage = setup?.page ?? activePage;
      activePage.on("pageerror", recordPageError);
      await activePage.locator(entry.root).filter({ visible: true }).first().waitFor({ state: "visible" });
      await settleRenderedSurface(activePage, entry.root);

      const evidence = await collectDashboardDensityEvidence(activePage, entry);
      const contractFindings = await collectEntryExpectationFindings(activePage, entry);
      const runtimeFindings = [...pageErrors].map((message, index) => ({
        id: `${entry.id}:runtime-error:${index + 1}`,
        surfaceId: entry.id,
        owner: entry.owner,
        category: "runtime-error",
        priority: "P0",
        evidence: `The rendered surface raised an uncaught page error: ${message}`,
        recommendation: "Resolve the runtime error before judging the surface geometry.",
      }));
      evidence.findings.push(...contractFindings, ...runtimeFindings);
      for (const finding of [...contractFindings, ...runtimeFindings]) {
        evidence.categoryCounts[finding.category] = (evidence.categoryCounts[finding.category] ?? 0) + 1;
        evidence.priorityCounts[finding.priority] += 1;
      }
      const screenshotPath = path.join(screenshotRoot, `${entry.id}.png`);
      const evidencePath = path.join(evidenceRoot, `${entry.id}.json`);
      await activePage.screenshot({
        path: screenshotPath,
        fullPage: false,
        animations: "disabled",
      });
      await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
      const categoriesWithIssue = new Set(evidence.findings.map(({ category }) => category));
      results.push({
        surface: serializableEntry(entry),
        status: "inspected",
        durationMs: Date.now() - startedAt,
        screenshot: relativeOutputPath(screenshotPath),
        evidence: relativeOutputPath(evidencePath),
        pageErrors: [...pageErrors],
        scanCompleteness: evidence.scanCompleteness,
        priorityCounts: evidence.priorityCounts,
        categoryCounts: evidence.categoryCounts,
        findingCount: evidence.findings.length,
        inspectedCategories: ALL_CATEGORIES,
        categoriesWithNoIssue: ALL_CATEGORIES.filter((category) => !categoriesWithIssue.has(category)),
        findings: evidence.findings,
      });
    } catch (error) {
      let failureScreenshot = null;
      if (activePage && !activePage.isClosed()) {
        try {
          const screenshotPath = path.join(screenshotRoot, `${entry.id}--setup-failure.png`);
          await activePage.screenshot({ path: screenshotPath, fullPage: false, animations: "disabled" });
          failureScreenshot = relativeOutputPath(screenshotPath);
        } catch {
          // The setup exception remains the primary evidence when the page cannot render a screenshot.
        }
      }
      results.push({
        surface: serializableEntry(entry),
        status: "failed-setup",
        durationMs: Date.now() - startedAt,
        error: String(error?.stack ?? error?.message ?? error),
        screenshot: failureScreenshot,
        pageErrors: [...pageErrors],
        inspectedCategories: [],
        categoriesWithNoIssue: [],
        findings: [],
      });
    } finally {
      await browserContext?.close();
    }
    await writeProgress(progressPath, phase, selected.length, results);
    console.log(`[density-audit] ${entry.id}: ${results.at(-1).status}`);
  }

  const manifestSummary = summarizeDashboardSurfaceManifest(DASHBOARD_SURFACE_MANIFEST);
  const summary = buildRunSummary({
    phase,
    artifactId,
    immutableArtifacts: Boolean(requestedRunId),
    manifestSummary,
    selected,
    results,
  });
  const summaryPath = path.join(outputRoot, "audit-summary.json");
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  await testInfo.attach("dashboard-density-audit-summary", {
    path: summaryPath,
    contentType: "application/json",
  });

  expect(results).toHaveLength(selected.length);
  expect(summary.accountedFor).toBe(selected.length);
  expect(summary.statuses.failedSetup, "Every executable audit surface must complete setup").toBe(0);
  expect(summary.incompleteScans, "No surface traversal may stop at an audit cap").toBe(0);
});

async function requireOkResponse(requestOperation, description, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await requestOperation();
      if (response.ok()) return response;
      lastError = new Error(`${description} failed with HTTP ${response.status()}: ${await response.text()}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
  }
  throw lastError;
}

async function settleRenderedSurface(page, rootSelector) {
  await page.addStyleTag({ content: DASHBOARD_DENSITY_SETTLE_STYLE });
  const root = page.locator(rootSelector).filter({ visible: true }).first();
  await root.evaluate((element) => element.setAttribute("data-dashboard-density-settled", "true"));
  await page.evaluate(async () => {
    await document.fonts?.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });

  let previous = [];
  let stableSamples = 0;
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    const current = await root.evaluate((element) => [
      element,
      ...element.querySelectorAll([
        ":scope > *",
        ".right-side-drawer",
        ".dashboard-dialog",
        ".dashboard-dialog__body",
        ".dashboard-dialog__footer",
      ].join(",")),
    ].filter((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || 1) > 0
        && rect.width > 0
        && rect.height > 0;
    }).slice(0, 250).map((node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }));
    stableSamples = dashboardDensityBoxesStable(previous, current) ? stableSamples + 1 : 0;
    if (stableSamples >= 3) return;
    previous = current;
    await page.waitForTimeout(50);
  }
  throw new Error(`Rendered audit root did not reach stable geometry: ${rootSelector}`);
}

async function collectEntryExpectationFindings(page, entry) {
  if (!entry.expectations) return [];
  const state = await page.evaluate(({
    noticeSelector,
    workspaceSelector,
    enabledControlSelector,
  }) => {
    const isVisible = (node) => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const notice = document.querySelector(noticeSelector);
    const workspace = document.querySelector(workspaceSelector);
    const enabledControl = document.querySelector(enabledControlSelector);
    const noticeStyle = notice ? getComputedStyle(notice) : null;
    const noticeRect = notice?.getBoundingClientRect();
    return {
      noticeVisible: isVisible(notice),
      noticeCompact: isVisible(notice)
        && Number.parseFloat(noticeStyle.fontSize) <= 12
        && noticeRect.height <= 24,
      workspaceVisible: isVisible(workspace),
      enabledControlVisible: isVisible(enabledControl),
    };
  }, {
    noticeSelector: entry.expectations.notice,
    workspaceSelector: entry.expectations.workspace,
    enabledControlSelector: entry.expectations.enabledControl,
  });
  if (state.noticeVisible && state.noticeCompact && state.workspaceVisible && state.enabledControlVisible) return [];
  return [{
    id: `${entry.id}:desktop-support-contract`,
    surfaceId: entry.id,
    owner: entry.owner,
    category: "desktop-support-contract",
    priority: "P0",
    evidence: [
      `Below 1024px: recommendation visible=${state.noticeVisible}`,
      `compact=${state.noticeCompact}`,
      `workspace visible=${state.workspaceVisible}`,
      `enabled control visible=${state.enabledControlVisible}.`,
    ].join("; "),
    recommendation: "Keep the width recommendation compact while leaving the workspace and its primary controls available.",
  }];
}

function buildRunSummary({ phase, artifactId, immutableArtifacts, manifestSummary, selected, results }) {
  const statuses = {
    inspected: results.filter(({ status }) => status === "inspected").length,
    failedSetup: results.filter(({ status }) => status === "failed-setup").length,
    coveredByAlias: results.filter(({ status }) => status === "covered-by-alias").length,
    intentionallyOutOfScope: results.filter(({ status }) => status === "intentionally-out-of-scope").length,
  };
  const rawFindings = results.flatMap((result) => result.findings ?? []);
  const findings = collapseDashboardDensityFindings(rawFindings);
  const priorityCounts = { P0: 0, P1: 0, P2: 0 };
  const rawPriorityCounts = { P0: 0, P1: 0, P2: 0 };
  const categoryCounts = {};
  const rawCategoryCounts = {};
  const ownerCounts = {};
  for (const finding of findings) {
    priorityCounts[finding.priority] = (priorityCounts[finding.priority] ?? 0) + 1;
    categoryCounts[finding.category] = (categoryCounts[finding.category] ?? 0) + 1;
    ownerCounts[finding.owner] = (ownerCounts[finding.owner] ?? 0) + 1;
  }
  for (const finding of rawFindings) {
    rawPriorityCounts[finding.priority] = (rawPriorityCounts[finding.priority] ?? 0) + 1;
    rawCategoryCounts[finding.category] = (rawCategoryCounts[finding.category] ?? 0) + 1;
  }
  return {
    generatedAt: new Date().toISOString(),
    phase,
    artifactId,
    immutableArtifacts,
    completeManifestRun: selected.length === DASHBOARD_SURFACE_MANIFEST.length,
    selected: selected.length,
    accountedFor: statuses.inspected + statuses.failedSetup + statuses.coveredByAlias + statuses.intentionallyOutOfScope,
    statuses,
    incompleteScans: results.filter(({ scanCompleteness }) => scanCompleteness?.truncated).length,
    manifest: manifestSummary,
    findingCount: findings.length,
    rawCandidateCount: rawFindings.length,
    priorityCounts,
    rawCandidatePriorityCounts: rawPriorityCounts,
    categoryCounts,
    rawCandidateCategoryCounts: rawCategoryCounts,
    ownerCounts,
    systemicFindings: findings,
    results,
  };
}

function serializableEntry(entry) {
  const { setup: _setup, ...serializable } = entry;
  return serializable;
}

function relativeOutputPath(value) {
  return path.relative(process.cwd(), value).replaceAll("\\", "/");
}

function withDeadline(promise, milliseconds, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), milliseconds);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function writeProgress(progressPath, phase, selected, results) {
  await writeFile(progressPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    phase,
    selected,
    accountedFor: results.length,
    latest: results.at(-1)?.surface?.id ?? null,
    statuses: Object.fromEntries(
      [...new Set(results.map(({ status }) => status))]
        .map((status) => [status, results.filter((result) => result.status === status).length]),
    ),
  }, null, 2)}\n`);
}
