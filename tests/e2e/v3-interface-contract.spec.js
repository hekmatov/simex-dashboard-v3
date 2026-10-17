import { expect, test } from "@playwright/test";
import { choosePanelAction, chooseSectionAction, propertiesPane, structureRail } from "./support/buildWorkflow.js";

import { chartAuthoringWorkflow } from "./support/chart-authoring-workflow.js";
import { resetSourceDashboard } from "./support/dashboardFixture.js";
import { openDashboardPage } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const BIOMEDICAL_FIRST_SECTION_ID = "biomedical_section";
const BIOMEDICAL_SECOND_SECTION_ID = "biomedical_section_1788164839437";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("Build Page management uses the selected Page tab as its one grouped-actions trigger", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  const navigation = page.locator('[data-build-page-navigation="anchored"]');

  const trigger = navigation.getByRole("button", { name: "Biomedical", exact: true });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-current", "page");
  await trigger.click();

  const actions = navigation.getByRole("group", { name: "Biomedical Page actions", exact: true });
  await expect(actions).toBeVisible();
  await expect(actions.getByRole("button")).toHaveText(["Rename", "Move earlier", "Move later", "Merge", "Remove"]);
  await expect(navigation.getByRole("button", { name: "Page actions for Biomedical", exact: true })).toHaveCount(0);
  expect(await navigation.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
});

test("source-first Step 7 Build controls and fields use the shared dense desktop contract", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await resetSourceDashboard(page, { fixture: "fable-m0" });
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();

  const map = structureRail(page);
  await map.locator('[data-build-node-id="m0-dashboard"] > .build-tree-row').click();
  const pageTitle = propertiesPane(page).getByLabel("Page title");
  await expect(pageTitle).toHaveCSS("min-height", "32px");
  await expect(pageTitle).toHaveCSS("color", await semanticColor(page, "--simex-text-strong"));

  const structure = map.getByRole("navigation", { name: "Dashboard structure" });
  const contrast = await structure.getByRole("treeitem", { name: "Fixture dashboard", exact: true }).evaluate((item) => {
    const surface = item.closest(".build-rail");
    const parse = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number);
    const luminance = (value) => parse(value)
      .map((channel) => channel / 255)
      .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const first = luminance(getComputedStyle(item).color);
    const second = luminance(getComputedStyle(surface).backgroundColor);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);

  await page.locator('[data-build-command-action="add-chart"]').click();
  const wizard = page.getByRole("dialog", { name: "Add new chart" });
  const stageButtons = wizard.getByRole("navigation", { name: "Chart creation steps" })
    .getByRole("button");
  await expect(stageButtons).toHaveCount(6);
  const stages = await stageButtons.evaluateAll((buttons) => buttons.map((button) => ({
      id: button.id,
      label: button.querySelector("span")?.textContent,
      status: button.querySelector("small")?.textContent,
      attributeStatus: button.getAttribute("data-status"),
      accessibleName: button.getAttribute("aria-label"),
    })));
  expect(stages).toEqual([
    ["destination", "Destination", "Complete"],
    ["data-source", "Data source", "Not started"],
    ["chart-type", "Chart type", "Waiting on prerequisite"],
    ["map-and-prepare-data", "Map and prepare", "Waiting on prerequisite"],
    ["configure-chart", "Configure", "Waiting on prerequisite"],
    ["review-and-create", "Review", "Waiting on prerequisite"],
  ].map(([id, label, status]) => ({
    id: `chart-stage-${id}`,
    label,
    status,
    attributeStatus: status,
    accessibleName: `${label}. ${status}.`,
  })));
  const flow = chartAuthoringWorkflow(wizard);
  await flow.goToChartType();
  await expect(wizard.locator(".chart-wizard-step-button").first()).toHaveCSS("min-height", "36px");
});

test("Build remains usable below the recommended 1024px desktop width", async ({ page }) => {
  await page.setViewportSize({ width: 1023, height: 768 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();

  const notice = page.locator('[data-desktop-width-notice="build"]');
  await expect(notice).toBeVisible();
  await expect(notice).toHaveText("A minimum width of 1024px is recommended for Build.");
  await expect(notice).toHaveCSS("font-size", "12px");
  await expect(notice.getByRole("button")).toHaveCount(0);
  const buildShell = page.locator(".build-mode-shell");
  await expect(buildShell).toBeVisible();
  await expect(page.locator('[data-build-command-action="add-chart"]')).toBeEnabled();
});

test("operation status shows blocking Finish Build work, completion, and footer-safe geometry", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await propertiesPane(page).getByLabel("Page title", { exact: true }).fill("Operation status baseline");
  await expect(page.getByRole("button", { name: "Finish Build", exact: true })).toBeEnabled();

  await page.evaluate(() => {
    window.__stage1OperationHistory = [];
    const record = () => {
      const notices = [...document.querySelectorAll('[data-operation-status]')];
      window.__stage1OperationHistory.push(notices.map((notice) => ({
        key: notice.querySelector("strong")?.textContent,
        status: notice.getAttribute("data-operation-status"),
      })));
    };
    new MutationObserver(record).observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["data-operation-status"],
    });
  });

  await page.getByRole("button", { name: "Finish Build", exact: true }).click();
  const notice = page.locator('[data-operation-status]').filter({ hasText: "Finishing Build" });
  await expect(notice).toBeVisible();
  await expect(notice).toHaveAttribute("data-operation-status", "completed");
  await expect(notice).toContainText("Build finished.");
  await expect(page.locator('[data-live-region="polite"]')).toContainText("Build finished.");
  const lifecycle = await page.evaluate(() => window.__stage1OperationHistory.flat());
  expect(lifecycle).toContainEqual({ key: "Finishing Build", status: "working" });
  expect(lifecycle).toContainEqual({ key: "Finishing Build", status: "completed" });

  const footer = page.locator(".dashboard-footer");
  await expect(footer).toBeVisible();

  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await page.route("**/config/dashboard.json", (route) => route.fulfill({
    status: 503,
    contentType: "text/plain",
    body: "Stage 12 injected online restore outage",
  }));
  await page.locator(".dashboard-scenario-trigger").click();
  const passport = page.getByRole("complementary", { name: "Scenario Passport" });
  await passport.getByRole("button", { name: "Restore online dashboard", exact: true }).click();
  const restoreDialog = page.getByRole("dialog", { name: "Restore online dashboard?" });
  await restoreDialog.getByRole("button", { name: "Restore online dashboard", exact: true }).click();
  const failedRestoreNotice = page.locator('[data-operation-status="failed"]')
    .filter({ hasText: "Restoring online dashboard" });
  await expect(failedRestoreNotice).toHaveCount(1);
  await expect(failedRestoreNotice).toBeHidden();
  await restoreDialog.getByRole("button", { name: "Keep local dashboard", exact: true }).click();
  await expect(failedRestoreNotice).toBeVisible();
  await passport.getByRole("button", { name: "Close", exact: true }).click();

  const mapDrawer = structureRail(page);
  await page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Biomedical", exact: true }).click();
  await chooseSectionAction(page, BIOMEDICAL_FIRST_SECTION_ID, "move-later");
  const layoutOwner = page.locator('[data-pending-work-kind="layout"]');
  await expect(layoutOwner).toHaveAttribute("data-pending-work-state", "dirty");
  await expect(failedRestoreNotice).toBeVisible();

  await footer.evaluate((node) => node.scrollIntoView({ block: "end", behavior: "auto" }));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const integratedGeometry = await page.evaluate(() => {
    const notice = [...document.querySelectorAll('[data-operation-status]')]
      .find((item) => item.textContent.includes("Restoring online dashboard"))?.getBoundingClientRect();
    const drawer = document.querySelector('[data-build-rail="structure"]')?.getBoundingClientRect();
    const pending = document.querySelector('[data-pending-work-kind="layout"]')?.getBoundingClientRect();
    const dashboardFooter = document.querySelector(".dashboard-footer")?.getBoundingClientRect();
    const overlaps = (first, second) => Boolean(first && second
      && first.left < second.right && first.right > second.left
      && first.top < second.bottom && first.bottom > second.top);
    return {
      width: window.innerWidth,
      drawerGap: drawer && notice ? notice.left - drawer.right : -1,
      footerGap: dashboardFooter && notice ? dashboardFooter.top - notice.bottom : -1,
      pendingOverlap: overlaps(notice, pending),
      drawerOverlap: overlaps(notice, drawer),
    };
  });
  expect(integratedGeometry).toEqual({
    width: 1440,
    drawerGap: expect.any(Number),
    footerGap: expect.any(Number),
    pendingOverlap: false,
    drawerOverlap: false,
  });
  expect(integratedGeometry.drawerGap).toBeGreaterThanOrEqual(15);
  expect(integratedGeometry.footerGap).toBeGreaterThanOrEqual(15);
  console.log("stage12-1440-geometry", JSON.stringify(integratedGeometry));
  await layoutOwner.getByRole("button", { name: "Discard Layout Changes", exact: true }).click();
  await expect(mapDrawer).toBeVisible();

  await page.setViewportSize({ width: 820, height: 900 });
  await page.getByRole("button", { name: "Theme", exact: true }).click();
  const lookDrawer = page.getByRole("dialog", { name: "Theme", exact: true });
  await expect(lookDrawer).toBeVisible();
  await expect.poll(async () => page.evaluate(() => {
    const viewportBox = document.querySelector(".operation-status-viewport")?.getBoundingClientRect();
    const drawerBox = document.querySelector(".look-drawer")?.getBoundingClientRect();
    return viewportBox && drawerBox ? drawerBox.left - viewportBox.right : -1;
  })).toBeGreaterThanOrEqual(15);
  expect(await lookDrawer.evaluate((drawer) => drawer.getBoundingClientRect().width))
    .toBeGreaterThanOrEqual(399);
});

test("same-page section reorder paints status first and preserves the React-owned chart surface", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();

  const section = page.locator(`[data-canonical-section-id="${BIOMEDICAL_FIRST_SECTION_ID}"]`);
  const panel = section.locator("[data-panel-id]").first();
  const chartFrame = panel.locator(".chart-view-frame");
  const chartHost = panel.locator(".chart-echarts-host");
  await expect(chartFrame).toBeAttached();
  await expect(chartHost).toBeAttached();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await panel.evaluate((panelNode) => {
    const sectionNode = panelNode.closest("[data-canonical-section-id]");
    window.__sectionZeroWorkProbe = {
      sectionNode,
      panelNode,
      chartFrameNode: panelNode.querySelector(".chart-view-frame"),
      chartHostNode: panelNode.querySelector(".chart-echarts-host"),
      lifecycle: [],
    };
    const record = () => {
      const currentSections = [...document.querySelectorAll("[data-canonical-section-id]")]
        .map((candidate) => candidate.getAttribute("data-canonical-section-id"));
      const notice = [...document.querySelectorAll("[data-operation-status]")]
        .find((candidate) => candidate.textContent.includes("Reordering Section"));
      window.__sectionZeroWorkProbe.lifecycle.push({
        order: currentSections,
        status: notice?.getAttribute("data-operation-status") ?? null,
      });
    };
    new MutationObserver(record).observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["data-operation-status"],
    });
    record();
  });

  await chooseSectionAction(page, BIOMEDICAL_FIRST_SECTION_ID, "move-later");
  await expect.poll(() => page.locator("[data-canonical-section-id]").evaluateAll(
    (nodes) => nodes.map((node) => node.getAttribute("data-canonical-section-id")).slice(0, 2),
  )).toEqual([BIOMEDICAL_SECOND_SECTION_ID, BIOMEDICAL_FIRST_SECTION_ID]);
  const mapDrawer = structureRail(page);
  await expect(mapDrawer).toBeVisible();

  const result = await page.evaluate(() => {
    const probe = window.__sectionZeroWorkProbe;
    const currentSection = document.querySelector('[data-canonical-section-id="biomedical_section"]');
    const currentPanel = currentSection?.querySelector("[data-panel-id]");
    const currentChartFrame = currentPanel?.querySelector(".chart-view-frame");
    const currentChartHost = currentPanel?.querySelector(".chart-echarts-host");
    const workingIndex = probe.lifecycle.findIndex(({ status }) => status === "working");
    const movedIndex = probe.lifecycle.findIndex(({ order }) => (
      order[0] === "biomedical_section_1788164839437" && order[1] === "biomedical_section"
    ));
    return {
      sameSection: probe.sectionNode === currentSection,
      samePanel: probe.panelNode === currentPanel,
      sameChartFrame: probe.chartFrameNode === currentChartFrame,
      sameChartHost: probe.chartHostNode === currentChartHost,
      workingIndex,
      movedIndex,
    };
  });
  expect(result).toEqual({
    sameSection: true,
    samePanel: true,
    sameChartFrame: true,
    sameChartHost: true,
    workingIndex: expect.any(Number),
    movedIndex: expect.any(Number),
  });
  expect(result.workingIndex).toBeGreaterThanOrEqual(0);
  expect(result.movedIndex).toBeGreaterThan(result.workingIndex);
});

test("disabled Finish Build exposes its blocking reason on pointer hover", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  const target = page.locator('article[data-build-placement-id="chart-line-mtgz6v76"]');
  await target.scrollIntoViewIfNeeded();
  await target.hover();
  await choosePanelAction(page, await target.getAttribute("data-build-placement-id"), "edit");
  const quick = page.locator(".chart-quick-editor");
  await expect(quick).toBeVisible();
  await quick.getByRole("textbox", { name: "Chart title", exact: true }).fill("Pending quick title");
  await expect(quick).toHaveAttribute("data-chart-edit-dirty", "true");

  const finish = page.getByRole("button", { name: "Finish Build", exact: true });
  await expect(finish).toBeDisabled();
  const anchor = finish.locator("..");
  await expect(anchor).toHaveAttribute("data-control-tooltip-anchor", "true");
  await anchor.hover();
  const reason = anchor.locator(".control-tooltip__reason");
  await expect(reason).toBeVisible();
  await expect(reason).toHaveText("Finish or cancel the open chart draft.");

  await quick.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(quick).toHaveAttribute("data-chart-edit-dirty", "false");
  await expect(finish).toBeDisabled();
  await quick.getByRole("button", { name: "Close", exact: true }).click();
  await expect(quick).toHaveCount(0);
});

async function semanticColor(page, token) {
  return page.evaluate((name) => {
    const probe = document.createElement("span");
    probe.style.color = `var(${name})`;
    document.querySelector(".app-frame").append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, token);
}
