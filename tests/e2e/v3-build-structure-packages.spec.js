import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

import { serializeDashboardBundle } from "../../src/charting/config/dashboardBundleV3.js";
import { openDashboardPage } from "./support/landingWorkflow.js";

async function openBuildStructure(page, appUrl = "/") {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto(appUrl);
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  await expect(page.getByRole("tree")).toBeVisible();
}

async function openScenarioPassport(page, { preserveFocus = false } = {}) {
  const passport = page.getByRole("complementary", { name: "Scenario Passport" });
  if (!await passport.isVisible().catch(() => false)) {
    const trigger = page.locator(".dashboard-scenario-trigger");
    if (preserveFocus) await trigger.evaluate((element) => element.click());
    else await trigger.click();
  }
  await expect(passport).toBeVisible();
  return passport;
}

function treeItemLabel(tree, name) {
  return tree.getByRole("treeitem", { name, exact: true })
    .locator(":scope > .build-tree-row .build-tree-label");
}

test("Clear dashboard in Scenario Passport preserves canonical Home identity and Look after durable deletion", async ({ page }) => {
  test.setTimeout(60_000);
  const sourceDashboard = JSON.parse(await readFile(
    new URL("../../public/config/dashboard.json", import.meta.url),
    "utf8",
  ));
  await openBuildStructure(page, "http://127.0.0.1:4175/");

  const passport = await openScenarioPassport(page);
  await passport.getByLabel("Show Home", { exact: true }).uncheck();

  const clearTrigger = passport.getByRole("button", { name: "Clear dashboard", exact: true });
  await clearTrigger.click();
  const dialog = page.getByRole("dialog", { name: "Delete all dashboard content?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    "Delete all authored dashboard pages, charts, sources, media, Chrono Groups, and Scenes. Canonical Home remains available.",
  );
  await expect(dialog.getByRole("button", { name: "Delete all dashboard content", exact: true }))
    .toBeDisabled();
  await expect(dialog.getByText(/Pages$/)).toBeVisible();
  await expect(dialog.getByText(/data sources$/)).toBeVisible();

  await dialog.getByLabel(/I understand that the authored dashboard content/).check();
  await dialog.getByRole("button", { name: "Delete all dashboard content", exact: true }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Home", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-canonical-mode="home"]')).toBeFocused();
  await expect(page.locator('[aria-label="Dashboard pages"]')).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem(
    "simex-dashboard-config-v3-three-mode-v1",
  )));
  expect(stored.pages).toEqual([]);
  expect(stored.home).toEqual({ enabled: true });
  expect(stored.dataSources).toEqual({});
  expect(stored.datasetProfiles).toBeUndefined();
  expect(stored.contentLibrary).toEqual({ mediaItems: {}, sourceEntries: {} });
  expect(stored.assets).toEqual({});
  expect(stored.chronoGroups).toEqual([]);
  expect(stored.scenes).toEqual([]);
  expect(stored.id).toBe(sourceDashboard.id);
  expect(stored.title).toBe(sourceDashboard.title);
  expect(stored.scenarioLabel).toBe(sourceDashboard.scenarioLabel);
  expect(stored.programLabel).toBe(sourceDashboard.programLabel);
  expect(stored.globalStyles).toEqual(sourceDashboard.globalStyles);
  expect(stored.layout).toEqual(sourceDashboard.layout);

  await page.getByRole("button", { name: "Build", exact: true }).click();
  await page.locator(".dashboard-scenario-trigger").click();
  const rebasedPassport = page.getByRole("complementary", { name: "Scenario Passport" });
  await expect(rebasedPassport.getByLabel("Show Home", { exact: true })).toBeChecked();
  await expect(rebasedPassport.getByText("Scenario saved", { exact: true })).toBeVisible();
  await rebasedPassport.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Home", exact: true }).click();

  await page.reload();
  await expect(page.getByRole("button", { name: "Home", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("storage-rejected Clear dashboard is atomic and Cancel restores the Passport trigger focus", async ({ page }) => {
  test.setTimeout(60_000);
  const sourceDashboard = await readFile(
    new URL("../../public/config/dashboard.json", import.meta.url),
    "utf8",
  );
  await page.addInitScript(({ dashboard, dashboardKey, modeKey }) => {
    localStorage.setItem(dashboardKey, dashboard);
    localStorage.setItem(modeKey, "build");
  }, {
    dashboard: sourceDashboard,
    dashboardKey: "simex-dashboard-config-v3-three-mode-v1",
    modeKey: "simex-dashboard-ui-mode-v1",
  });
  await openBuildStructure(page, "http://127.0.0.1:4175/");

  const passport = await openScenarioPassport(page);
  const clearTrigger = passport.getByRole("button", { name: "Clear dashboard", exact: true });
  await clearTrigger.click();
  const dialog = page.getByRole("dialog", { name: "Delete all dashboard content?" });
  await dialog.getByLabel(/I understand that the authored dashboard content/).check();
  const before = await page.evaluate(() => ({
    dashboard: localStorage.getItem("simex-dashboard-config-v3-three-mode-v1"),
    mode: localStorage.getItem("simex-dashboard-ui-mode-v1"),
  }));
  await page.evaluate((dashboardKey) => {
    const setItem = Storage.prototype.setItem;
    let rejectNextDashboardWrite = true;
    Storage.prototype.setItem = function rejectOneClearWrite(key, value) {
      if (rejectNextDashboardWrite && key === dashboardKey) {
        rejectNextDashboardWrite = false;
        throw new DOMException("Storage full", "QuotaExceededError");
      }
      return setItem.call(this, key, value);
    };
  }, "simex-dashboard-config-v3-three-mode-v1");

  await dialog.getByRole("button", { name: "Delete all dashboard content", exact: true }).click();

  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("alert")).toContainText("Browser storage is full");
  const after = await page.evaluate(() => ({
    dashboard: localStorage.getItem("simex-dashboard-config-v3-three-mode-v1"),
    mode: localStorage.getItem("simex-dashboard-ui-mode-v1"),
  }));
  expect(after).toEqual(before);
  await expect(page.getByRole("button", { name: "Build", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Home", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator('[data-canonical-mode="home"]')).toHaveCount(0);
  await expect(page.getByRole("treeitem", { name: "Biomedical", exact: true })).toBeVisible();

  await dialog.getByRole("button", { name: "Keep dashboard", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(clearTrigger).toBeFocused();
});

test("Restore online dashboard in Scenario Passport replaces dirty local work with the deployed copy", async ({ page }) => {
  test.setTimeout(90_000);
  const sourceDashboard = JSON.parse(await readFile(
    new URL("../../public/config/dashboard.json", import.meta.url),
    "utf8",
  ));
  expect(sourceDashboard.pages[0].id).toBe("biomedical");
  expect(sourceDashboard.dataSources.bio_occupancy_gauges).toBeTruthy();
  expect(sourceDashboard.dataSources.bio_wastewater_latest).toBeTruthy();
  const localDashboard = structuredClone(sourceDashboard);
  localDashboard.scenarioLabel = "Local-only scenario";
  localDashboard.programLabel = "Local-only program";
  localDashboard.lastUpdated = "2026-08-29";
  localDashboard.pages[0].title = "Local-only biomedical page";
  await page.addInitScript(({ dashboard, dashboardKey, modeKey }) => {
    localStorage.setItem(dashboardKey, JSON.stringify(dashboard));
    localStorage.setItem(modeKey, "build");
  }, {
    dashboard: localDashboard,
    dashboardKey: "simex-dashboard-config-v3-three-mode-v1",
    modeKey: "simex-dashboard-ui-mode-v1",
  });
  await openBuildStructure(page, "http://127.0.0.1:4175/");

  const passport = await openScenarioPassport(page);
  const discard = passport.getByRole("button", { name: "Discard Build changes", exact: true });
  await discard.focus();
  await expect(page.locator(`#${await discard.getAttribute("aria-describedby")}`)).toContainText(
    "baseline captured when you entered Build. It does not contact the deployed online dashboard.",
  );
  const restore = passport.getByRole("button", { name: "Restore online dashboard", exact: true });
  await restore.focus();
  await expect(page.locator(`#${await restore.getAttribute("aria-describedby")}`)).toContainText(
    "dashboard served by this deployed SimEx instance. Unlike Discard Build changes",
  );
  await restore.click();

  let exportPrompt = null;
  page.once("dialog", async (dialog) => {
    exportPrompt = dialog.message();
    await dialog.dismiss();
  });
  const restoreDialog = page.getByRole("dialog", { name: "Restore online dashboard?" });
  await expect(restoreDialog).toContainText("replaces your local dashboard");
  await expect(restoreDialog).toContainText(
    "Download a dashboard package first if you want to preserve your local work.",
  );
  await restoreDialog.getByRole("button", { name: "Download package first", exact: true }).click();
  expect(exportPrompt).toContain("Name this exported dashboard bundle");
  await expect(restoreDialog).toBeVisible();
  await restoreDialog.getByRole("button", { name: "Keep local dashboard", exact: true }).click();

  await passport.getByRole("button", { name: /^Edit Program:/ }).click();
  await passport.getByLabel("Program", { exact: true }).fill("Unsaved local Scenario draft");
  await expect(passport.getByText("Unsaved Scenario", { exact: true })).toBeVisible();
  await expect(restore).toBeEnabled();
  await restore.click();
  await restoreDialog.getByRole("button", { name: "Restore online dashboard", exact: true }).click();

  await expect(restoreDialog).toHaveCount(0);
  await expect(page.getByLabel("Operation status")
    .getByText("Online dashboard restored.", { exact: true })).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem(
    "simex-dashboard-config-v3-three-mode-v1",
  )));
  expect(stored.scenarioLabel).toBe(sourceDashboard.scenarioLabel);
  expect(stored.programLabel).toBe(sourceDashboard.programLabel);
  expect(stored.lastUpdated).toBe(sourceDashboard.lastUpdated);
  expect(stored.pages[0].id).toBe("biomedical");
  expect(stored.pages[0].title).toBe(sourceDashboard.pages[0].title);
  expect(stored.dataSources.bio_occupancy_gauges).toEqual(
    sourceDashboard.dataSources.bio_occupancy_gauges,
  );
  expect(stored.dataSources.bio_wastewater_latest).toEqual(
    sourceDashboard.dataSources.bio_wastewater_latest,
  );
  expect(stored.pages.some(({ id }) => id === "old-homepage-content")).toBe(false);

  const restoredPassport = await openScenarioPassport(page);
  await expect(restoredPassport.getByRole("button", {
    name: `Edit Scenario name: ${sourceDashboard.scenarioLabel}`,
    exact: true,
  })).toBeVisible();
  await expect(restoredPassport.getByRole("button", {
    name: `Edit Program: ${sourceDashboard.programLabel}`,
    exact: true,
  })).toBeVisible();
  await expect(restoredPassport.getByRole("button", {
    name: `Edit Updated: ${sourceDashboard.lastUpdated}`,
    exact: true,
  })).toBeVisible();
  await expect(restoredPassport.getByText("Scenario saved", { exact: true })).toBeVisible();
});

async function packageFixture({ preserveSocioEconomicIds = false } = {}) {
  const config = JSON.parse(await readFile(
    new URL("../../public/config/dashboard.json", import.meta.url),
    "utf8",
  ));
  config.datasetProfiles = JSON.parse(await readFile(
    new URL("../../public/config/dataset-profiles.json", import.meta.url),
    "utf8",
  ));
  const importedPage = structuredClone(config.pages.find(({ id }) => (
    id === (preserveSocioEconomicIds ? "socio_economic" : "biomedical")
  )));
  if (!preserveSocioEconomicIds) importedPage.id = "imported_package_page";
  importedPage.label = preserveSocioEconomicIds
    ? "Imported Same-ID Page"
    : "Imported Package Page";
  importedPage.title = importedPage.label;
  importedPage.sections[0].title = "Imported Section";
  importedPage.sections = importedPage.sections.slice(0, 1);
  importedPage.sections[0].panels = importedPage.sections[0].panels.slice(0, 1);
  const firstPlacement = importedPage.sections[0].panels[0];
  const firstChart = firstPlacement.chart ?? firstPlacement;
  firstChart.title = "Imported Panel";
  const sourceId = firstChart.sourceId;
  config.dataSources = { [sourceId]: config.dataSources[sourceId] };
  config.datasetProfiles = config.datasetProfiles?.[sourceId]
    ? { [sourceId]: config.datasetProfiles[sourceId] }
    : {};
  config.contentLibrary = {
    ...config.contentLibrary,
    sourceEntries: config.contentLibrary?.sourceEntries?.[sourceId]
      ? { [sourceId]: config.contentLibrary.sourceEntries[sourceId] }
      : {},
  };
  config.id = "imported-package-dashboard";
  config.title = "Imported package dashboard";
  config.pages = [importedPage];
  config.chronoGroups = [];
  return serializeDashboardBundle(config, {
    now: "2026-08-21T09:10:11.000Z",
  });
}

test("cross-page tree selection reveals the canonical target before opening Unit Orbit", async ({ page }) => {
  await openBuildStructure(page);
  const frame = page.locator(".canonical-dashboard-frame");
  const tree = page.getByRole("tree");

  await tree.getByRole("treeitem", { name: "Public response and policy signals", exact: true }).click();
  await expect(frame).toHaveAttribute("data-canonical-page-id", "socio_economic");
  const section = page.locator('[data-canonical-section-id="public_response"]');
  await expect(section).toBeInViewport();

  await page.locator('[data-dashboard-page-id="biomedical"]').click();
  await expect(frame).toHaveAttribute("data-canonical-page-id", "biomedical");

  await tree.getByRole("treeitem", { name: "Risk perception over time", exact: true }).click();
  await expect(frame).toHaveAttribute("data-canonical-page-id", "socio_economic");
  const chart = page.locator('[data-canonical-placement-id="socio_risk_perception"]');
  await expect(chart).toBeVisible();
  await expect(chart).toBeInViewport();
  await expect(page.getByRole("complementary", { name: "Chart settings for Risk perception over time" }))
    .toBeVisible();
  await expect(page.getByText(
    "Finish or cancel the open chart editor before changing Page.", { exact: true },
  )).toHaveCount(0);
});

test("double-click rename navigates and highlights without opening Unit Orbit", async ({ page }) => {
  await openBuildStructure(page);
  const frame = page.locator(".canonical-dashboard-frame");
  const tree = page.getByRole("tree");
  const target = tree.getByRole("treeitem", { name: "Trust and wellbeing", exact: true });

  await target.locator(":scope > .build-tree-row .build-tree-label").dblclick();
  await expect(frame).toHaveAttribute("data-canonical-page-id", "socio_economic");
  await expect(page.locator('[data-canonical-section-id="trust_wellbeing"]')).toBeInViewport();
  const rename = tree.getByRole("textbox", { name: "Rename section Trust and wellbeing" });
  await expect(rename).toBeFocused();
  await expect(rename.locator('xpath=ancestor::*[@role="treeitem"][1]')).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".unit-orbit")).toHaveCount(0);
});

test("double-click rename persists complete Page Section and Chart owner updates", async ({ page }) => {
  test.setTimeout(60_000);
  await openBuildStructure(page);
  const tree = page.getByRole("tree");

  await treeItemLabel(tree, "Socio-economic").dblclick();
  const pageRename = tree.getByRole("textbox", { name: "Rename page Socio-economic" });
  await pageRename.fill("Community response");
  await pageRename.press("Enter");
  await expect(tree.getByRole("treeitem", { name: "Community response", exact: true })).toBeVisible();
  await expect(page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Community response", exact: true })).toBeVisible();

  await treeItemLabel(tree, "Public response and policy signals").dblclick();
  const sectionRename = tree.getByRole("textbox", {
    name: "Rename section Public response and policy signals",
  });
  await sectionRename.fill("Public response signals");
  await sectionRename.press("Enter");
  await expect(tree.getByRole("treeitem", { name: "Public response signals", exact: true })).toBeVisible();
  await expect(page.locator('[data-canonical-section-id="public_response"] h2'))
    .toHaveText("Public response signals");

  await treeItemLabel(tree, "Risk perception over time").dblclick();
  const chartRename = tree.getByRole("textbox", {
    name: "Rename chart Risk perception over time",
  });
  await chartRename.fill("Risk perception trend");
  await chartRename.press("Enter");
  await expect(tree.getByRole("treeitem", { name: "Risk perception trend", exact: true })).toBeVisible();
  await expect(page.locator('[data-canonical-placement-id="socio_risk_perception"] .panel-actions'))
    .toHaveAttribute("aria-label", "Risk perception trend actions");
  await expect(page.locator(".unit-orbit")).toHaveCount(0);
});

test("chart activation acknowledges the canonical reveal before mounting Unit Orbit", async ({ page }) => {
  await openBuildStructure(page);
  await page.evaluate(() => {
    globalThis.__task3ActivationOrder = [];
    const scrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function task3ScrollIntoView(...args) {
      if (this.getAttribute?.("data-canonical-placement-id") === "socio_risk_perception") {
        globalThis.__task3ActivationOrder.push("reveal");
      }
      return scrollIntoView?.apply(this, args);
    };
    const observer = new MutationObserver(() => {
      if (
        document.querySelector(".unit-orbit")
        && !globalThis.__task3ActivationOrder.includes("orbit")
      ) globalThis.__task3ActivationOrder.push("orbit");
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  await page.getByRole("tree")
    .getByRole("treeitem", { name: "Risk perception over time", exact: true })
    .click();
  await expect(page.locator(".unit-orbit")).toBeVisible();
  const order = await page.evaluate(() => globalThis.__task3ActivationOrder);
  expect(order).toContain("reveal");
  expect(order).toContain("orbit");
  expect(order.indexOf("reveal")).toBeLessThan(order.indexOf("orbit"));
});

test("an untouched chart editor closes transactionally when tree navigation changes target", async ({ page }) => {
  await openBuildStructure(page);
  const tree = page.getByRole("tree");
  const chartItem = tree.getByRole("treeitem", { name: "Risk perception over time", exact: true });
  await chartItem.click();
  await expect(page.locator(".unit-orbit")).toBeVisible();

  await chartItem.press("ArrowLeft");
  const sectionItem = tree.getByRole("treeitem", {
    name: "Public response and policy signals",
    exact: true,
  });
  await expect(sectionItem).toBeFocused();
  await sectionItem.press("Enter");
  await expect(page.locator('[data-canonical-section-id="public_response"]')).toBeInViewport();
  await expect(page.locator(".unit-orbit")).toHaveCount(0);
  await expect(page.getByText(
    "Finish or cancel the open chart editor before changing Page.", { exact: true },
  )).toHaveCount(0);
});

test("a storage-rejected delayed Page rename falls back to session state", async ({ page }) => {
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function rejectTask3Rename(key, value) {
      if (key === "simex-dashboard-config-v3-three-mode-v1") {
        throw new DOMException("Storage full", "QuotaExceededError");
      }
      return setItem.call(this, key, value);
    };
  });
  await openBuildStructure(page);
  const tree = page.getByRole("tree");
  await treeItemLabel(tree, "Socio-economic").dblclick();
  const rename = tree.getByRole("textbox", { name: "Rename page Socio-economic" });
  await rename.fill("Rejected rename");
  await rename.press("Enter");

  await expect(tree.getByRole("treeitem", { name: "Rejected rename", exact: true })).toBeVisible();
  await expect(page.getByText(
    "Browser storage is full. Dashboard changes remain available for this session only.",
    { exact: true },
  )).toBeVisible();
});

test("package import skips cosmetic warnings and reviews the manifest before atomic load", async ({ page }) => {
  await openBuildStructure(page);
  const fixture = await packageFixture();
  const importedTab = page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Imported Package Page", exact: true });

  await page.getByRole("button", { name: "Dashboard look", exact: true }).click();
  const look = page.getByRole("dialog", { name: "Dashboard look" });
  await look.getByLabel("Humanist", { exact: true }).check();
  await look.locator('[data-profile-option="humanist-standard/common-ground"] input').check();
  await expect(look.locator(".look-drawer-feedback")).toHaveText("Dashboard look saved.");
  await look.getByRole("button", { name: "Close", exact: true }).click();

  const passport = await openScenarioPassport(page);
  const chooserPromise = page.waitForEvent("filechooser");
  await passport.getByRole("button", { name: "Upload Dashboard Package", exact: true }).click();
  const chooser = await chooserPromise;
  await expect(page.getByText(
    "Unsaved changes to this dashboard will be lost.", { exact: true },
  )).toHaveCount(0);
  await chooser.setFiles({
    name: "imported-dashboard.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture)),
  });

  const review = page.getByRole("dialog", { name: "Review package contents" });
  await expect(review).toBeVisible();
  await expect(review.locator("time")).toHaveAttribute(
    "datetime",
    "2026-08-21T09:10:11.000Z",
  );
  await expect(review.getByText("Page: Imported Package Page", { exact: true })).toBeVisible();
  await expect(review.getByText("Section: Imported Section", { exact: true })).toBeVisible();
  await expect(review.getByText("Panel: Imported Panel", { exact: true })).toBeVisible();
  await expect(importedTab).toHaveCount(0);

  await review.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(review).toHaveCount(0);
  await expect(importedTab).toHaveCount(0);

  const secondPassport = await openScenarioPassport(page);
  const secondChooserPromise = page.waitForEvent("filechooser");
  await secondPassport.getByRole("button", { name: "Upload Dashboard Package", exact: true }).click();
  const secondChooser = await secondChooserPromise;
  await secondChooser.setFiles({
    name: "imported-dashboard.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  const secondReview = page.getByRole("dialog", { name: "Review package contents" });
  await expect(secondReview).toBeVisible();
  await expect(importedTab).toHaveCount(0);
  await secondReview.getByRole("button", { name: "Load package", exact: true }).click();
  await expect(secondReview).toHaveCount(0);
  await expect(importedTab).toBeVisible();
});

test("package export resolves drafts and round-trips a self-contained source", async ({ page }) => {
  test.setTimeout(90_000);
  await openBuildStructure(page);
  const fixture = await packageFixture();
  const fixtureConfig = fixture.config;
  const fixtureChart = fixtureConfig.pages[0].sections[0].panels[0].chart
    ?? fixtureConfig.pages[0].sections[0].panels[0];
  fixtureConfig.dataSources = {
    [fixtureChart.sourceId]: fixtureConfig.dataSources[fixtureChart.sourceId],
  };
  fixtureConfig.datasetProfiles = fixtureConfig.datasetProfiles?.[fixtureChart.sourceId]
    ? { [fixtureChart.sourceId]: fixtureConfig.datasetProfiles[fixtureChart.sourceId] }
    : {};
  fixtureConfig.contentLibrary = {
    ...fixtureConfig.contentLibrary,
    sourceEntries: fixtureConfig.contentLibrary?.sourceEntries?.[fixtureChart.sourceId]
      ? { [fixtureChart.sourceId]: fixtureConfig.contentLibrary.sourceEntries[fixtureChart.sourceId] }
      : {},
  };
  const compactFixture = serializeDashboardBundle(fixtureConfig, {
    now: "2026-08-21T09:10:11.000Z",
  });

  await expect(page.locator('[data-build-command-group="package"]')).toHaveCount(0);

  const packagePassport = await openScenarioPassport(page);
  const chooserPromise = page.waitForEvent("filechooser");
  await packagePassport.getByRole("button", { name: "Upload Dashboard Package", exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: "compact-dashboard.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(compactFixture)),
  });
  const importReview = page.getByRole("dialog", { name: "Review package contents" });
  await importReview.getByRole("button", { name: "Load package", exact: true }).click();

  const passport = await openScenarioPassport(page);
  await passport.getByRole("button", { name: /^Edit Program:/ }).click();
  await passport.getByLabel("Program", { exact: true }).fill("Unfinished export program");
  await passport.getByRole("button", { name: "Close", exact: true }).click();
  const downloadPassport = await openScenarioPassport(page);
  await downloadPassport.getByRole("button", { name: "Download Dashboard Package", exact: true }).click();

  const readiness = page.getByRole("dialog", { name: "Finish unfinished work before download" });
  await expect(readiness).toContainText("Scenario Passport draft");
  await readiness.getByRole("button", { name: "Open Scenario Passport", exact: true }).click();
  await expect(passport).toBeVisible();
  await passport.getByRole("button", { name: /^Edit Program:/ }).click();
  await expect(passport.getByLabel("Program", { exact: true })).toHaveValue("Unfinished export program");
  await passport.getByRole("button", { name: "Discard Scenario", exact: true }).click();
  await passport.getByRole("button", { name: "Close", exact: true }).click();

  page.once("dialog", (dialog) => dialog.accept("self-contained-roundtrip"));
  const resolvedPassport = await openScenarioPassport(page);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    resolvedPassport.getByRole("button", { name: "Download Dashboard Package", exact: true }).click(),
  ]);
  const downloadedPath = await download.path();
  const exported = JSON.parse(await readFile(downloadedPath, "utf8"));
  const exportedSource = exported.config.dataSources[fixtureChart.sourceId];
  expect(exportedSource.kind).toBe("dataset");
  expect(exportedSource.type).toBe("uploadedCsv");
  expect(exportedSource.csvText).toContain("national_total_cases");
  expect(exported.config).not.toHaveProperty("dataSourceStates");
  expect(exported.config).not.toHaveProperty("chartDataStates");

  const roundtripPassport = await openScenarioPassport(page);
  const roundtripChooserPromise = page.waitForEvent("filechooser");
  await roundtripPassport.getByRole("button", { name: "Upload Dashboard Package", exact: true }).click();
  const roundtripChooser = await roundtripChooserPromise;
  await roundtripChooser.setFiles(downloadedPath);
  const roundtripReview = page.getByRole("dialog", { name: "Review package contents" });
  await expect(roundtripReview).toContainText("Panel: Imported Panel");
  await roundtripReview.getByRole("button", { name: "Load package", exact: true }).click();
  await expect(page.locator('[data-canonical-placement-id="bio_confirmed_cases"]')).toBeVisible();
  const persistedSource = await page.evaluate((sourceId) => {
    const config = JSON.parse(localStorage.getItem(
      "simex-dashboard-config-v3-three-mode-v1",
    ));
    return config.dataSources[sourceId];
  }, fixtureChart.sourceId);
  expect(persistedSource.browserAssetId).toMatch(/^sha256-[a-f0-9]{64}$/);
  expect(persistedSource).not.toHaveProperty("csvText");
  await page.reload();
  await expect(page.locator('[data-canonical-placement-id="bio_confirmed_cases"]')).toBeVisible();
});

test("cancelling the authored-content import warning preserves inline rename state", async ({ page }) => {
  await openBuildStructure(page);
  const tree = page.getByRole("tree");
  await treeItemLabel(tree, "Socio-economic").dblclick();
  const rename = tree.getByRole("textbox", { name: "Rename page Socio-economic" });
  await rename.fill("Pending package-safe rename");

  const passport = await openScenarioPassport(page, { preserveFocus: true });
  await passport.getByRole("button", { name: "Upload Dashboard Package", exact: true })
    .evaluate((element) => element.click());
  const warning = page.getByRole("dialog", { name: "Discard unsaved dashboard changes?" });
  await expect(warning.getByText(
    "Unsaved changes to this dashboard will be lost.", { exact: true },
  )).toBeVisible();
  await warning.getByRole("button", { name: "Cancel", exact: true }).click();

  await expect(rename).toBeVisible();
  await expect(rename).toHaveValue("Pending package-safe rename");
  await expect(rename.locator('xpath=ancestor::*[@role="treeitem"][1]')).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".canonical-dashboard-frame"))
    .toHaveAttribute("data-canonical-page-id", "socio_economic");
});

test("successful same-ID import resets dirty rename state and disposes delayed tree activation", async ({ page }) => {
  await page.addInitScript(() => {
    const nativeSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = (callback, delay, ...args) => nativeSetTimeout(
      callback,
      delay === 500 ? 2_000 : delay,
      ...args,
    );
  });
  await openBuildStructure(page);
  const tree = page.getByRole("tree");
  const fixture = await packageFixture({ preserveSocioEconomicIds: true });

  await treeItemLabel(tree, "Socio-economic").dblclick();
  const rename = tree.getByRole("textbox", { name: "Rename page Socio-economic" });
  await rename.fill("Stale local Page name");

  const passport = await openScenarioPassport(page, { preserveFocus: true });
  await passport.getByRole("button", { name: "Upload Dashboard Package", exact: true })
    .evaluate((element) => element.click());
  const warning = page.getByRole("dialog", { name: "Discard unsaved dashboard changes?" });
  const chooserPromise = page.waitForEvent("filechooser");
  await warning.getByRole("button", { name: "Choose package", exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: "same-id-dashboard.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture)),
  });

  const review = page.getByRole("dialog", { name: "Review package contents" });
  await expect(review).toBeVisible();
  await tree.getByRole("treeitem", {
    name: "Risk perception over time",
    exact: true,
  }).evaluate((element) => element.click());
  await review.getByRole("button", { name: "Load package", exact: true }).click();

  await expect(review).toHaveCount(0);
  await expect(tree.getByRole("textbox")).toHaveCount(0);
  await expect(tree.getByRole("treeitem", {
    name: "Imported Same-ID Page",
    exact: true,
  })).toBeVisible();
  await page.waitForTimeout(2_200);
  await expect(page.locator(".unit-orbit")).toHaveCount(0);
  await expect(tree.getByRole("treeitem", {
    name: "Stale local Page name",
    exact: true,
  })).toHaveCount(0);
});

test("treeitem wrapper owns keyboard focus, nested groups, rename input, and a 44px pointer caret", async ({ page }) => {
  await openBuildStructure(page);
  const tree = page.getByRole("tree");
  const socio = tree.getByRole("treeitem", { name: "Socio-economic", exact: true });

  await expect(socio).toHaveAttribute("aria-expanded", "true");
  await expect(socio.locator(":scope > [role=group]")).toHaveCount(1);
  expect(await tree.locator('[role="treeitem"]').evaluateAll(
    (items) => items.filter((item) => item.tabIndex === 0).length,
  )).toBe(1);

  const caret = socio.getByRole("button", { name: "Collapse Socio-economic", exact: true });
  await expect(caret).toHaveAttribute("tabindex", "-1");
  const caretBox = await caret.boundingBox();
  expect(caretBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(caretBox?.height ?? 0).toBeGreaterThanOrEqual(44);

  await socio.focus();
  await socio.press("ArrowLeft");
  await expect(socio).toHaveAttribute("aria-expanded", "false");
  await expect(socio.locator(":scope > [role=group]")).toHaveCount(0);
  await socio.press("ArrowRight");
  await expect(socio).toHaveAttribute("aria-expanded", "true");
  await socio.press("ArrowDown");
  const section = tree.getByRole("treeitem", {
    name: "Public response and policy signals",
    exact: true,
  });
  await expect(section).toBeFocused();

  await section.locator(":scope > .build-tree-row .build-tree-label")
    .dblclick();
  const rename = tree.getByRole("textbox", {
    name: "Rename section Public response and policy signals",
  });
  await expect(rename).toBeFocused();
  await expect(rename.locator('xpath=ancestor::*[@role="treeitem"][1]'))
    .toHaveAttribute("aria-selected", "true");
  expect(await tree.locator("*").evaluateAll(
    (items) => items.filter((item) => item.tabIndex === 0).length,
  )).toBe(1);
});

test("pointer collapse moves descendant roving focus to the collapsing Section and Page", async ({ page }) => {
  await openBuildStructure(page);
  const tree = page.getByRole("tree");
  const socio = tree.getByRole("treeitem", { name: "Socio-economic", exact: true });
  const section = tree.getByRole("treeitem", {
    name: "Public response and policy signals",
    exact: true,
  });
  const chart = tree.getByRole("treeitem", {
    name: "Risk perception over time",
    exact: true,
  });
  const rovingCount = () => tree.locator('[role="treeitem"]').evaluateAll(
    (items) => items.filter((item) => item.tabIndex === 0).length,
  );

  await chart.focus();
  await expect(chart).toBeFocused();
  await section.getByRole("button", {
    name: "Collapse Public response and policy signals",
    exact: true,
  }).click();
  await expect(section).toBeFocused();
  expect(await rovingCount()).toBe(1);
  await expect(chart).toHaveCount(0);

  await section.getByRole("button", {
    name: "Expand Public response and policy signals",
    exact: true,
  }).click();
  await chart.focus();
  await socio.getByRole("button", { name: "Collapse Socio-economic", exact: true }).click();
  await expect(socio).toBeFocused();
  expect(await rovingCount()).toBe(1);
  await expect(section).toHaveCount(0);
});
