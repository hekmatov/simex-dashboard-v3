import { expect, test } from "@playwright/test";

const APP_URL = "http://127.0.0.1:4173";
const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3";

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

  await openDashboard(page);
  await page.getByRole("button", { name: "Biomedical", exact: true }).click();
  const panel = page.locator(".chart-panel").filter({
    hasText: chart.title,
  });
  await expect(panel).toBeVisible();

  await page.getByRole("button", { name: "Open edit mode" }).click();
  await panel.getByRole("button", { name: "Edit chart" }).click();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByLabel("Chart title").fill("Updated wrapped KPI");
  await page.getByRole("button", { name: "Save", exact: true }).click();

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

  const updated = page.locator(".chart-panel").filter({
    hasText: "Updated wrapped KPI",
  });
  await updated.getByRole("button", { name: "Remove chart" }).click();
  await expect(updated).toHaveCount(0);
});

test("imported tracked profiles survive an edit and browser reload", async ({
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
  await page.getByRole("button", { name: "Open edit mode" }).click();
  await page.getByLabel("Program label").fill("Imported profile retained");
  await page.getByRole("button", { name: "Save edit mode" }).click();

  await expect.poll(() => page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key));
    return stored.datasetProfiles?.external_cases?.sourceId;
  }, STORAGE_KEY)).toBe("external_cases");

  await page.reload();
  await expect(page.getByRole("heading", {
    name: "Dashboard configuration error",
  })).toHaveCount(0);
  await expect(page.getByRole("button", {
    name: "Explore the live dashboard",
  })).toBeVisible();
});

test("removing a page also removes its synchronized chart memberships", async ({
  page,
}) => {
  await openDashboard(page);
  await page.getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByRole("button", { name: "Open edit mode" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove tab" }).click();

  await expect(page.getByRole("heading", {
    name: "Dashboard configuration error",
  })).toHaveCount(0);
  await expect(page.getByRole("button", {
    name: "Biomedical",
    exact: true,
  })).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key));
    return {
      pages: stored.pages.map(({ id }) => id),
      groups: stored.timeSyncGroups,
    };
  }, STORAGE_KEY)).toEqual({
    pages: ["home", "socio_economic"],
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
    localStorage.setItem(key, JSON.stringify(value));
  }, {
    key: STORAGE_KEY,
    value: dashboard,
  });
}

async function openDashboard(page) {
  await page.goto("/");
  await page.getByRole("button", {
    name: "Explore the live dashboard",
  }).click();
}
