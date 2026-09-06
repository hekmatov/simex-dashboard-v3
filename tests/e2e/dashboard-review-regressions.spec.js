import { expect, test } from "@playwright/test";

import {
  enterAuthoredDashboard,
  openDashboardPage,
} from "./support/landingWorkflow.js";

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
  const dashboard = await fetchJson(request, "/config/dashboard.json");
  const section = dashboard.pages
    .find(({ id }) => id === "biomedical")
    .sections.find(({ panels }) => panels.some(({ id }) => (
      id === "bio_current_cases_kpi"
    )));
  const index = section.panels.findIndex(({ id }) => (
    id === "bio_current_cases_kpi"
  ));
  const chart = section.panels[index];
  section.panels[index] = {
    id: "current-cases-placement",
    chart,
  };
  await installDashboard(page, dashboard);

  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  const renderedPanel = page.locator('[data-panel-id="bio_current_cases_kpi"]');
  await expect(renderedPanel).toBeVisible();

  await page.getByRole("button", { name: "Build" }).click();
  const panel = page.locator(
    '[data-build-placement-id="current-cases-placement"]',
  );
  await expect(panel).toHaveAttribute("data-panel-id", "bio_current_cases_kpi");
  await panel.scrollIntoViewIfNeeded();
  await panel.hover();
  await panel.getByRole("button", { name: "Edit chart" }).click();
  const quickEditor = page.locator(".chart-quick-editor");
  await expect(quickEditor).toBeVisible();
  await quickEditor.getByRole("textbox", { name: "Chart title", exact: true }).fill("Updated wrapped KPI");
  await quickEditor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(quickEditor).toHaveCount(0);

  await expect.poll(() => page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key));
    const placement = stored.pages
      .flatMap(({ sections }) => sections)
      .flatMap(({ panels }) => panels)
      .find(({ id }) => id === "current-cases-placement");
    return {
      placementId: placement?.id,
      chartId: placement?.chart?.id,
      title: placement?.chart?.title,
    };
  }, STORAGE_KEY)).toEqual({
    placementId: "current-cases-placement",
    chartId: "bio_current_cases_kpi",
    title: "Updated wrapped KPI",
  });

  await panel.scrollIntoViewIfNeeded();
  await panel.hover();
  await panel.getByRole("button", { name: "Remove chart" }).click();
  await page.getByRole("dialog", { name: "Remove this chart?" })
    .getByRole("button", { name: "Remove chart" }).click();
  await expect(panel).toHaveCount(0);
});

test("replacement bundle profiles survive import, edit, save, and reload", async ({
  page,
  request,
}) => {
  const [dashboard, profiles] = await Promise.all([
    fetchJson(request, "/config/dashboard.json"),
    fetchJson(request, "/config/dataset-profiles.json"),
  ]);
  const source = {
    ...structuredClone(dashboard.dataSources.bio_cases),
    provenance: { label: "Imported exercise cases" },
  };
  const profile = {
    ...structuredClone(profiles.bio_cases),
    sourceId: "external_cases",
    provenance: { label: "Imported exercise cases" },
  };
  const sourcePage = dashboard.pages.find(({ id }) => id === "biomedical");
  const sourceSection = sourcePage.sections.find(
    ({ id }) => id === "outbreak_dynamics",
  );
  const sourceChart = sourceSection.panels.find(
    ({ id }) => id === "bio_confirmed_cases",
  );
  const chart = {
    ...structuredClone(sourceChart),
    id: "external_cases_chart",
    title: "Imported replacement chart",
    sourceId: "external_cases",
    interaction: {
      ...structuredClone(sourceChart.interaction),
      timeSync: null,
    },
  };
  const replacement = {
    ...structuredClone(dashboard),
    configVersion: 4,
    id: "replacement-dashboard",
    programLabel: "Imported replacement",
    contentLibrary: {
      mediaItems: {},
      sourceEntries: {},
    },
    dataSources: {
      external_cases: source,
    },
    datasetProfiles: {
      external_cases: profile,
    },
    chronoGroups: [],
    scenes: [],
    pages: [{
      ...structuredClone(sourcePage),
      id: "replacement",
      title: "Replacement",
      sections: [{
        ...structuredClone(sourceSection),
        id: "replacement-overview",
        title: "Overview",
        panels: [chart],
      }],
    }],
  };
  const bundle = {
    bundleType: "simex-dashboard-bundle",
    version: 4,
    metadata: {
      exportedAt: null,
      sourceFingerprints: {
        external_cases: null,
      },
      networkDependencies: [],
    },
    config: replacement,
  };

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
  await expect(page.locator('[data-panel-id="external_cases_chart"]')).toBeVisible();

  const inspector = await openSelectedPageInspector(page);
  await inspector.getByLabel("Page title", { exact: true }).fill("Imported profile retained");
  await page.getByRole("button", { name: "Finish Build", exact: true }).click();

  await expect.poll(() => page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key));
    return {
      profileIds: Object.keys(stored.datasetProfiles ?? {}),
      sourceIds: Object.keys(stored.dataSources ?? {}),
      pageTitle: stored.pages.find(({ id }) => id === "replacement")?.title,
    };
  }, STORAGE_KEY)).toEqual({
    profileIds: ["external_cases"],
    sourceIds: ["external_cases"],
    pageTitle: "Imported profile retained",
  });

  await page.reload();
  await expect(page.getByRole("heading", {
    name: "Dashboard configuration error",
  })).toHaveCount(0);
  await expect(page.getByRole("heading", {
    name: "Imported profile retained",
    exact: true,
  })).toBeVisible();
  await expect(page.locator('[data-panel-id="external_cases_chart"]')).toBeVisible();
  await expect.poll(() => page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key));
    return stored.datasetProfiles?.external_cases?.sourceId;
  }, STORAGE_KEY)).toBe("external_cases");
});

test("additive imported tracked profiles survive an edit and browser reload", async ({
  page,
  request,
}) => {
  const [dashboard, profiles] = await Promise.all([
    fetchJson(request, "/config/dashboard.json"),
    fetchJson(request, "/config/dataset-profiles.json"),
  ]);
  dashboard.dataSources.external_cases = {
    ...structuredClone(dashboard.dataSources.bio_cases),
    provenance: { label: "Imported exercise cases" },
  };
  dashboard.datasetProfiles = {
    external_cases: {
      ...structuredClone(profiles.bio_cases),
      sourceId: "external_cases",
      provenance: { label: "Imported exercise cases" },
    },
  };
  await installDashboard(page, dashboard);

  await openDashboard(page);
  await openDashboardPage(page, "biomedical");
  await page.getByRole("button", { name: "Build" }).click();
  const inspector = await openSelectedPageInspector(page);
  await inspector.getByLabel("Page title", { exact: true }).fill("Imported profile retained");
  await page.getByRole("button", { name: "Finish Build", exact: true }).click();

  await expect.poll(() => page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key));
    return stored.datasetProfiles?.external_cases?.sourceId;
  }, STORAGE_KEY)).toBe("external_cases");

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
  await expect(page.locator('[data-panel-id="bio_confirmed_cases"]')).toBeVisible();
  await expect.poll(() => page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key));
    return {
      profileSourceId: stored.datasetProfiles?.external_cases?.sourceId,
      sourceLabel: stored.dataSources?.external_cases?.provenance?.label,
    };
  }, STORAGE_KEY)).toEqual({
    profileSourceId: "external_cases",
    sourceLabel: "Imported exercise cases",
  });
});

test("removing a page also removes its synchronized chart memberships", async ({
  page,
  request,
}) => {
  await installDashboard(page, await fetchJson(request, "/config/dashboard.json"));
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByRole("button", { name: "Build" }).click();
  const navigation = page.locator('[data-build-page-navigation="anchored"]');
  await navigation.getByRole("button", { name: "Biomedical", exact: true }).click();
  const actions = navigation.getByRole("group", { name: "Biomedical Page actions", exact: true });
  await actions.getByRole("button", { name: "Remove", exact: true }).click();
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
  await expect.poll(() => page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key));
    return {
      pages: stored.pages.map(({ id }) => id),
      groups: stored.chronoGroups,
    };
  }, STORAGE_KEY)).toEqual({
    pages: ["socio_economic"],
    groups: [],
  });
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
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  const map = page.getByRole("complementary", { name: "Dashboard map" });
  await expect(map.getByLabel("Page title", { exact: true })).toBeVisible();
  return map;
}
