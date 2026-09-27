import { propertiesPane } from "./support/buildWorkflow.js";
import { expect, test } from "@playwright/test";
import { choosePanelAction } from "./support/buildWorkflow.js";

import {
  enterAuthoredDashboard,
  openDashboardPage,
} from "./support/landingWorkflow.js";
import {
  additiveCaseDashboard,
  IMPORTED_CASE_CHART_ID,
  IMPORTED_CASE_LABEL,
  IMPORTED_CASE_SOURCE_ID,
  replacementCaseBundle,
  SHIPPED_CASE_CHART_ID,
  SHIPPED_CASE_SOURCE_ID,
} from "./support/importedProfileFixture.js";
import {
  OTHER_BIOMEDICAL_CHART_ID,
  REMOVED_PAGE_GROUP_ID,
  RETAINED_PAGE_GROUP_ID,
  RETAINED_SOCIO_CHART_ID,
  withPageRemovalGroups,
  withWrappedCasesPanel,
  WRAPPED_CASE_PLACEMENT_ID,
} from "./support/layoutReviewFixture.js";

const APP_URL = "http://127.0.0.1:4173";
const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";

test.describe.configure({ timeout: 90_000 });

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("wrapped panels render, edit, save, and remove without losing placement identity", async ({
  page,
  request,
}) => {
  const dashboard = withWrappedCasesPanel(
    await fetchJson(request, "/config/dashboard.json"),
  );
  await installDashboard(page, dashboard);

  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  const before = await storedLayoutReviewState(page);
  const originalPlacement = before.placements.find(({ placementId }) => (
    placementId === WRAPPED_CASE_PLACEMENT_ID
  ));
  expect(originalPlacement).toMatchObject({
    pageId: "biomedical",
    chart: { id: SHIPPED_CASE_CHART_ID, sourceId: SHIPPED_CASE_SOURCE_ID, typeId: "line" },
  });
  expect(WRAPPED_CASE_PLACEMENT_ID).not.toBe(SHIPPED_CASE_CHART_ID);
  const unrelatedPlacements = before.placements.filter(({ placementId }) => (
    placementId !== WRAPPED_CASE_PLACEMENT_ID
  ));
  expect(unrelatedPlacements.length).toBeGreaterThan(0);
  const renderedPanel = page.locator(`[data-panel-id="${SHIPPED_CASE_CHART_ID}"]`);
  await expect(renderedPanel).toBeVisible();
  await renderedPanel.scrollIntoViewIfNeeded();
  await expect(renderedPanel.locator("canvas").first()).toBeVisible();

  await page.getByRole("button", { name: "Build" }).click();
  const panel = page.locator(`article[data-build-placement-id="${WRAPPED_CASE_PLACEMENT_ID}"]`);
  await expect(panel).toHaveAttribute("data-panel-id", SHIPPED_CASE_CHART_ID);
  await panel.scrollIntoViewIfNeeded();
  await panel.hover();
  await choosePanelAction(page, await panel.getAttribute("data-build-placement-id"), "edit");
  const quickEditor = page.locator(".chart-quick-editor");
  await expect(quickEditor).toBeVisible();
  await quickEditor.getByRole("textbox", { name: "Chart title", exact: true })
    .fill("Updated wrapped national cases");
  await quickEditor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(quickEditor).toHaveCount(0);

  await expect.poll(async () => (
    await storedLayoutReviewState(page)
  ).placements.find(({ placementId }) => placementId === WRAPPED_CASE_PLACEMENT_ID))
    .toEqual({
      ...originalPlacement,
      chart: { ...originalPlacement.chart, title: "Updated wrapped national cases" },
    });
  const afterSave = await storedLayoutReviewState(page);
  expect(afterSave.placements.filter(({ placementId }) => (
    placementId !== WRAPPED_CASE_PLACEMENT_ID
  ))).toEqual(unrelatedPlacements);
  await expect(panel).toHaveAttribute("data-panel-id", SHIPPED_CASE_CHART_ID);

  await panel.scrollIntoViewIfNeeded();
  await panel.hover();
  await choosePanelAction(page, await panel.getAttribute("data-build-placement-id"), "remove");
  await page.getByRole("dialog", { name: "Remove this chart?" })
    .getByRole("button", { name: "Remove chart" }).click();
  await expect(panel).toHaveCount(0);
  await expect.poll(async () => (await storedLayoutReviewState(page)).placements)
    .toEqual(unrelatedPlacements);
  const afterRemove = await storedLayoutReviewState(page);
  expect(afterRemove.pages).toEqual(before.pages);
  expect(afterRemove.groups).toEqual(before.groups);
});

test("replacement bundle profiles survive import, edit, save, and reload", async ({
  page,
  request,
}) => {
  const [dashboard, profiles] = await Promise.all([
    fetchJson(request, "/config/dashboard.json"),
    fetchJson(request, "/config/dataset-profiles.json"),
  ]);
  const bundle = replacementCaseBundle(dashboard, profiles);
  const expectedFingerprint = profiles[SHIPPED_CASE_SOURCE_ID].fingerprint;
  expect(expectedFingerprint).toMatch(/^[a-f0-9]{64}$/);

  await openDashboard(page);
  await page.getByRole("button", { name: "Build" }).click();
  await page.locator('input[type="file"][accept="application/json,.json"]')
    .setInputFiles({
      name: "replacement-dashboard.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(bundle)),
    });
  const review = page.getByRole("dialog", { name: "Review package contents" });
  await review.getByRole("button", { name: "Load package", exact: true }).click();
  await expect(review).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Replacement", exact: true })).toBeVisible();
  const importedPanel = page.locator(`[data-panel-id="${IMPORTED_CASE_CHART_ID}"]`);
  await expect(importedPanel).toBeVisible();
  await expect(importedPanel.locator("canvas").first()).toBeVisible();

  const inspector = await openSelectedPageInspector(page);
  await inspector.getByLabel("Page title", { exact: true })
    .fill("Imported profile retained");
  await page.getByRole("button", { name: "Finish Build", exact: true }).click();

  const expected = importedProfileStateExpectation({
    dashboard: bundle.config,
    pageId: "replacement",
    pageTitle: "Imported profile retained",
    chartId: IMPORTED_CASE_CHART_ID,
    expectedFingerprint,
  });
  await expect.poll(() => storedImportedProfileState(page, "replacement", IMPORTED_CASE_CHART_ID))
    .toEqual(expected);

  await page.reload();
  await expect(page.getByRole("heading", {
    name: "Dashboard configuration error",
  })).toHaveCount(0);
  await expect(page.getByRole("heading", {
    name: "Imported profile retained",
    exact: true,
  })).toBeVisible();
  await expect(importedPanel).toBeVisible();
  await expect(importedPanel.locator("canvas").first()).toBeVisible();
  await expect.poll(() => storedImportedProfileState(page, "replacement", IMPORTED_CASE_CHART_ID))
    .toEqual(expected);
});

test("additive imported tracked profiles survive an edit and browser reload", async ({
  page,
  request,
}) => {
  const [dashboard, profiles] = await Promise.all([
    fetchJson(request, "/config/dashboard.json"),
    fetchJson(request, "/config/dataset-profiles.json"),
  ]);
  const additive = additiveCaseDashboard(dashboard, profiles);
  const expectedFingerprint = profiles[SHIPPED_CASE_SOURCE_ID].fingerprint;
  expect(expectedFingerprint).toMatch(/^[a-f0-9]{64}$/);
  await installDashboard(page, additive);

  await openDashboard(page);
  await openDashboardPage(page, "biomedical");
  await page.getByRole("button", { name: "Build" }).click();
  const inspector = await openSelectedPageInspector(page);
  await inspector.getByLabel("Page title", { exact: true })
    .fill("Imported profile retained");
  await page.getByRole("button", { name: "Finish Build", exact: true }).click();

  const expected = importedProfileStateExpectation({
    dashboard: additive,
    pageId: "biomedical",
    pageTitle: "Imported profile retained",
    chartId: SHIPPED_CASE_CHART_ID,
    expectedFingerprint,
  });
  await expect.poll(() => storedImportedProfileState(page, "biomedical", SHIPPED_CASE_CHART_ID))
    .toEqual(expected);

  await page.reload();
  await expect(page.getByRole("heading", {
    name: "Dashboard configuration error",
  })).toHaveCount(0);
  await expect(page.getByLabel("Dashboard mode").getByRole("button", {
    name: "View",
    exact: true,
  })).toHaveAttribute("aria-pressed", "true");
  await openDashboardPage(page, "biomedical");
  await expect(page.getByRole("heading", {
    name: "Imported profile retained",
    exact: true,
  })).toBeVisible();
  const shippedPanel = page.locator(`[data-panel-id="${SHIPPED_CASE_CHART_ID}"]`);
  await expect(shippedPanel).toBeVisible();
  await shippedPanel.scrollIntoViewIfNeeded();
  await expect(shippedPanel.locator("canvas").first()).toBeVisible();
  await expect.poll(() => storedImportedProfileState(page, "biomedical", SHIPPED_CASE_CHART_ID))
    .toEqual(expected);
});

test("removing a page also removes its synchronized chart memberships", async ({
  page,
  request,
}) => {
  const dashboard = withPageRemovalGroups(
    await fetchJson(request, "/config/dashboard.json"),
  );
  await installDashboard(page, dashboard);
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  const before = await storedLayoutReviewState(page);
  const removedPlacements = before.placements.filter(({ pageId }) => pageId === "biomedical");
  const retainedPlacements = before.placements.filter(({ pageId }) => pageId !== "biomedical");
  const removedGroup = before.groups.find(({ id }) => id === REMOVED_PAGE_GROUP_ID);
  const retainedGroup = before.groups.find(({ id }) => id === RETAINED_PAGE_GROUP_ID);
  expect(before.pages.map(({ id }) => id)).toEqual(["scenario", "biomedical", "socio_economic"]);
  expect(removedPlacements.map(({ chart }) => chart.id)).toEqual(expect.arrayContaining([
    SHIPPED_CASE_CHART_ID,
    OTHER_BIOMEDICAL_CHART_ID,
  ]));
  expect(removedGroup.members.map(({ chartId }) => chartId)).toEqual([
    SHIPPED_CASE_CHART_ID,
    OTHER_BIOMEDICAL_CHART_ID,
  ]);
  expect(retainedGroup.members.map(({ chartId }) => chartId)).toEqual([
    RETAINED_SOCIO_CHART_ID,
  ]);
  expect(retainedPlacements.some(({ chart }) => chart.id === RETAINED_SOCIO_CHART_ID))
    .toBe(true);

  await page.getByRole("button", { name: "Build" }).click();
  const navigation = page.locator('[data-build-page-navigation="anchored"]');
  await navigation.getByRole("button", { name: "Biomedical", exact: true }).click();
  const actions = navigation.getByRole("group", { name: "Biomedical Page actions", exact: true });
  await actions.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(actions.getByRole("region", { name: "Named consequences" }))
    .toContainText("Biomedical page group");
  await actions.getByLabel("I understand these named consequences.").check();
  await actions.getByRole("button", { name: "Confirm", exact: true }).click();
  const layoutOwner = page.locator('[data-pending-work-kind="layout"]');
  await layoutOwner.getByRole("button", {
    name: "Save Layout Changes",
    exact: true,
  }).click();
  await expect(layoutOwner).toHaveCount(0);
  await page.getByRole("button", { name: "Finish Build", exact: true }).click();

  await expect(page.getByRole("heading", {
    name: "Dashboard configuration error",
  })).toHaveCount(0);
  await expect(page.getByRole("button", {
    name: "Open Biomedical",
    exact: true,
  })).toHaveCount(0);
  const expected = {
    pages: before.pages.filter(({ id }) => id !== "biomedical"),
    placements: retainedPlacements,
    groups: [retainedGroup],
  };
  await expect.poll(() => storedLayoutReviewState(page)).toEqual(expected);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard configuration error" }))
    .toHaveCount(0);
  await expect.poll(() => storedLayoutReviewState(page)).toEqual(expected);
  await openDashboardPage(page, "socio_economic");
  const retainedPanel = page.locator(`[data-panel-id="${RETAINED_SOCIO_CHART_ID}"]`);
  await expect(retainedPanel).toBeVisible();
  await retainedPanel.scrollIntoViewIfNeeded();
  await expect(retainedPanel.locator("canvas").first()).toBeVisible();
});

async function fetchJson(request, path) {
  const response = await request.get(`${APP_URL}${path}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function installDashboard(page, dashboard) {
  await page.addInitScript(({ key, value }) => {
    const marker = `${key}:test-seed-installed`;
    if (sessionStorage.getItem(marker) === "true") return;
    localStorage.setItem(key, JSON.stringify(value));
    sessionStorage.setItem(marker, "true");
  }, {
    key: STORAGE_KEY,
    value: dashboard,
  });
}

async function openDashboard(page) {
  await page.goto("/");
  await enterAuthoredDashboard(page);
}

async function openSelectedPageInspector(page) {
  const inspector = propertiesPane(page);
  await expect(inspector.getByLabel("Page title", { exact: true })).toBeVisible();
  return inspector;
}

function storedLayoutReviewState(page) {
  return page.evaluate((key) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    return {
      pages: dashboard.pages.map(({ id, title }) => ({ id, title })),
      placements: dashboard.pages.flatMap(({ id: pageId, sections }) => (
        sections.flatMap(({ id: sectionId, panels }) => panels.map((placement) => ({
          pageId,
          sectionId,
          placementId: placement.id,
          chart: placement.chart ?? placement,
        })))
      )),
      groups: dashboard.chronoGroups,
    };
  }, STORAGE_KEY);
}

function importedProfileStateExpectation({ dashboard, pageId, pageTitle, chartId, expectedFingerprint }) {
  const page = dashboard.pages.find(({ id }) => id === pageId);
  const chart = page.sections.flatMap(({ panels }) => panels)
    .map((placement) => placement.chart ?? placement)
    .find(({ id }) => id === chartId);
  const profile = dashboard.datasetProfiles[IMPORTED_CASE_SOURCE_ID];
  return {
    sourceIds: Object.keys(dashboard.dataSources).sort(),
    profileIds: Object.keys(dashboard.datasetProfiles).sort(),
    pageTitle,
    chart: {
      id: chartId,
      sourceId: chart.sourceId,
      typeId: chart.typeId,
      roles: chart.roles,
    },
    imported: {
      sourcePath: dashboard.dataSources[IMPORTED_CASE_SOURCE_ID].path,
      sourceLabel: IMPORTED_CASE_LABEL,
      profileSourceId: IMPORTED_CASE_SOURCE_ID,
      profilePath: profile.path,
      profileLabel: IMPORTED_CASE_LABEL,
      fingerprint: expectedFingerprint,
      rowCount: profile.rowCount,
      columns: profile.columns.map(({ name, type }) => ({ name, type })),
      entrySourceId: IMPORTED_CASE_SOURCE_ID,
      entryFingerprint: expectedFingerprint,
    },
  };
}

function storedImportedProfileState(page, pageId, chartId) {
  return page.evaluate(({ key, pageId, chartId, sourceId }) => {
    const storedText = localStorage.getItem(key);
    if (!storedText) return null;
    const stored = JSON.parse(storedText);
    const pageEntry = stored.pages.find(({ id }) => id === pageId);
    const chart = pageEntry?.sections.flatMap(({ panels }) => panels)
      .map((placement) => placement.chart ?? placement)
      .find(({ id }) => id === chartId);
    const source = stored.dataSources?.[sourceId];
    const profile = stored.datasetProfiles?.[sourceId];
    const sourceEntry = stored.contentLibrary?.sourceEntries?.[sourceId];
    return {
      sourceIds: Object.keys(stored.dataSources ?? {}).sort(),
      profileIds: Object.keys(stored.datasetProfiles ?? {}).sort(),
      pageTitle: pageEntry?.title,
      chart: chart && {
        id: chart.id,
        sourceId: chart.sourceId,
        typeId: chart.typeId,
        roles: chart.roles,
      },
      imported: {
        sourcePath: source?.path,
        sourceLabel: source?.provenance?.label,
        profileSourceId: profile?.sourceId,
        profilePath: profile?.path,
        profileLabel: profile?.provenance?.label,
        fingerprint: profile?.fingerprint,
        rowCount: profile?.rowCount,
        columns: profile?.columns?.map(({ name, type }) => ({ name, type })),
        entrySourceId: sourceEntry?.sourceId,
        entryFingerprint: sourceEntry?.provenance?.profileFingerprint,
      },
    };
  }, { key: STORAGE_KEY, pageId, chartId, sourceId: IMPORTED_CASE_SOURCE_ID });
}
