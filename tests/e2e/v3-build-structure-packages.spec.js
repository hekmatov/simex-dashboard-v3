import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

import { serializeDashboardBundle } from "../../src/charting/config/dashboardBundleV3.js";

async function openBuildStructure(page) {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true })
    .click();
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  await expect(page.getByRole("tree")).toBeVisible();
}

function treeItemLabel(tree, name) {
  return tree.getByRole("treeitem", { name, exact: true })
    .locator(":scope > .build-tree-row .build-tree-label");
}

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
  (firstPlacement.chart ?? firstPlacement).title = "Imported Panel";
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

  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true })
    .click();
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
  await tree.getByRole("treeitem", { name: "Risk perception over time", exact: true }).click();
  await expect(page.locator(".unit-orbit")).toBeVisible();

  await treeItemLabel(tree, "Public response and policy signals").click();
  await expect(page.locator('[data-canonical-section-id="public_response"]')).toBeInViewport();
  await expect(page.locator(".unit-orbit")).toHaveCount(0);
  await expect(page.getByText(
    "Finish or cancel the open chart editor before changing Page.", { exact: true },
  )).toHaveCount(0);
});

test("a rejected delayed Page rename retains the inline value for retry", async ({ page }) => {
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

  await expect(rename).toBeVisible();
  await expect(rename).toHaveValue("Rejected rename");
});

test("package import skips cosmetic warnings and reviews the manifest before atomic load", async ({ page }) => {
  await openBuildStructure(page);
  const fixture = await packageFixture();
  const importedTab = page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Imported Package Page", exact: true });

  await page.getByRole("button", { name: "Dashboard look", exact: true }).click();
  const look = page.getByRole("dialog", { name: "Dashboard look" });
  await look.getByLabel("Humanist Standard", { exact: true }).check();
  await look.locator('[data-profile-option="humanist-standard/common-ground"] input').check();
  await expect(look.locator(".look-drawer-feedback")).toHaveText("Dashboard look saved.");
  await look.getByRole("button", { name: "Close", exact: true }).click();

  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import package", exact: true }).click();
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

  const secondChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import package", exact: true }).click();
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
  const compactFixture = serializeDashboardBundle(fixtureConfig, {
    now: "2026-08-21T09:10:11.000Z",
  });

  const commandGeometry = await page.locator(".build-command-groups").evaluate((root) => {
    const rect = (selector) => {
      const box = root.querySelector(selector)?.getBoundingClientRect();
      return box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom } : null;
    };
    const rootBox = root.getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      template: getComputedStyle(root).gridTemplateColumns,
      root: { left: rootBox.left, right: rootBox.right, top: rootBox.top, bottom: rootBox.bottom },
      package: rect('[data-build-command-group="package"]'),
      session: rect('[data-build-command-group="session"]'),
      upload: rect('[data-build-command-group="package"] button'),
      reset: rect('[data-build-command-group="session"] button'),
    };
  });
  const controlsOverlap = commandGeometry.upload.right > commandGeometry.reset.left
    && commandGeometry.upload.left < commandGeometry.reset.right
    && commandGeometry.upload.bottom > commandGeometry.reset.top
    && commandGeometry.upload.top < commandGeometry.reset.bottom;
  expect(controlsOverlap, JSON.stringify(commandGeometry)).toBe(false);

  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload Dashboard Package", exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: "compact-dashboard.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(compactFixture)),
  });
  const importReview = page.getByRole("dialog", { name: "Review package contents" });
  await importReview.getByRole("button", { name: "Load package", exact: true }).click();

  const scenarioTrigger = page.getByRole("button", { name: "HeV-A26 Day 2 Simulation", exact: true });
  await scenarioTrigger.click();
  const passport = page.getByRole("complementary", { name: "Scenario Passport" });
  await passport.getByRole("button", { name: /^Edit Program:/ }).click();
  await passport.getByLabel("Program", { exact: true }).fill("Unfinished export program");
  await passport.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Download Dashboard Package", exact: true }).click();

  const readiness = page.getByRole("dialog", { name: "Finish unfinished work before download" });
  await expect(readiness).toContainText("Scenario Passport draft");
  await readiness.getByRole("button", { name: "Open Scenario Passport", exact: true }).click();
  await expect(passport).toBeVisible();
  await passport.getByRole("button", { name: /^Edit Program:/ }).click();
  await expect(passport.getByLabel("Program", { exact: true })).toHaveValue("Unfinished export program");
  await passport.getByRole("button", { name: "Discard Scenario", exact: true }).click();
  await passport.getByRole("button", { name: "Close", exact: true }).click();

  page.once("dialog", (dialog) => dialog.accept("self-contained-roundtrip"));
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download Dashboard Package", exact: true }).click(),
  ]);
  const downloadedPath = await download.path();
  const exported = JSON.parse(await readFile(downloadedPath, "utf8"));
  const exportedSource = exported.config.dataSources[fixtureChart.sourceId];
  expect(exportedSource.kind).toBe("dataset");
  expect(exportedSource.type).toBe("uploadedCsv");
  expect(exportedSource.csvText).toContain("national_total_cases");
  expect(exported.config).not.toHaveProperty("dataSourceStates");
  expect(exported.config).not.toHaveProperty("chartDataStates");

  const roundtripChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload Dashboard Package", exact: true }).click();
  const roundtripChooser = await roundtripChooserPromise;
  await roundtripChooser.setFiles(downloadedPath);
  const roundtripReview = page.getByRole("dialog", { name: "Review package contents" });
  await expect(roundtripReview).toContainText("Panel: Imported Panel");
  await roundtripReview.getByRole("button", { name: "Load package", exact: true }).click();
  await expect(page.locator('[data-canonical-placement-id="bio_confirmed_cases"]')).toBeVisible();
});

test("cancelling the authored-content import warning preserves inline rename state", async ({ page }) => {
  await openBuildStructure(page);
  const tree = page.getByRole("tree");
  await treeItemLabel(tree, "Socio-economic").dblclick();
  const rename = tree.getByRole("textbox", { name: "Rename page Socio-economic" });
  await rename.fill("Pending package-safe rename");

  await page.getByRole("button", { name: "Import package", exact: true }).click();
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

  await page.getByRole("button", { name: "Import package", exact: true }).click();
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
