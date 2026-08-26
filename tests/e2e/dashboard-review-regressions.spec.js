import { expect, test } from "@playwright/test";

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

  await openDashboard(page);
  await page.getByRole("button", { name: "Biomedical", exact: true }).click();
  const panel = page.locator('[data-panel-id="bio_current_cases_kpi"]');
  await expect(panel).toBeVisible();

  await page.getByRole("button", { name: "Build" }).click();
  await panel.getByRole("button", { name: "Edit chart" }).click();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByLabel("Chart title").fill("Updated wrapped KPI");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();

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
    id: "replacement-dashboard",
    programLabel: "Imported replacement",
    dataSources: {
      external_cases: source,
    },
    datasetProfiles: {
      external_cases: profile,
    },
    chronoGroups: [],
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
    version: 3,
    metadata: {
      exportedAt: null,
      sourceFingerprints: {
        external_cases: null,
      },
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
  await expect(page.getByLabel("Program label")).toHaveValue(
    "Imported replacement",
  );
  await expect(page.locator('[data-panel-id="external_cases_chart"]')).toBeVisible();

  await page.getByLabel("Program label").fill("Imported profile retained");
  await page.getByRole("button", { name: "Save edits" }).click();

  await expect.poll(() => page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key));
    return {
      profileIds: Object.keys(stored.datasetProfiles ?? {}),
      sourceIds: Object.keys(stored.dataSources ?? {}),
      programLabel: stored.programLabel,
    };
  }, STORAGE_KEY)).toEqual({
    profileIds: ["external_cases"],
    sourceIds: ["external_cases"],
    programLabel: "Imported profile retained",
  });

  await page.reload();
  await expect(page.getByRole("heading", {
    name: "Dashboard configuration error",
  })).toHaveCount(0);
  await expect(page.getByRole("heading", {
    name: "Replacement",
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
  await page.getByRole("button", { name: "Build" }).click();
  await page.getByLabel("Program label").fill("Imported profile retained");
  await page.getByRole("button", { name: "Save edits" }).click();

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
  request,
}) => {
  await installDashboard(page, await fetchJson(request, "/config/dashboard.json"));
  await openDashboard(page);
  await page.getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByRole("button", { name: "Build" }).click();
  const navigation = page.locator('[data-build-page-navigation="anchored"]');
  await navigation.getByRole("button", {
    name: "Page actions for Biomedical",
    exact: true,
  }).click();
  await navigation.getByRole("button", { name: "Edit Page Biomedical" }).click();
  const orbit = page.getByLabel("Page Orbit for Biomedical");
  await orbit.getByRole("button", { name: "Remove Page", exact: true }).click();
  await orbit.getByLabel("I understand these named consequences.").check();
  await orbit.getByRole("button", { name: "Confirm", exact: true }).click();
  const saveLayout = page.getByRole("button", { name: "Save Layout Changes", exact: true });
  await saveLayout.click();
  await expect(saveLayout).toBeDisabled();
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
  await page.getByRole("button", {
    name: "Explore the live dashboard",
  }).click();
}
