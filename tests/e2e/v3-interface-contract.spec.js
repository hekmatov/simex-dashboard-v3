import { expect, test } from "@playwright/test";

import { chartAuthoringWorkflow } from "./support/chart-authoring-workflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("Build Page management uses one full-size trigger and full-size grouped actions", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  const navigation = page.locator('[data-build-page-navigation="anchored"]');
  await navigation.getByRole("button", { name: "Biomedical", exact: true }).click();

  const trigger = navigation.getByRole("button", { name: "Page actions for Biomedical", exact: true });
  await expect(trigger).toBeVisible();
  await expectMinimumTarget(trigger);
  await trigger.click();

  const actions = navigation.getByRole("group", { name: "Biomedical Page actions", exact: true });
  await expect(actions).toBeVisible();
  await expect(actions.getByRole("button")).toHaveCount(3);
  await expectMinimumTargets(actions.locator("button"));
  expect(await navigation.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
});

test("source-first Step 7 Build controls and fields use the shared 44px interaction contract", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();

  const map = page.getByRole("complementary", { name: "Dashboard map" });
  await map.getByRole("treeitem", { name: "Biomedical", exact: true }).click();
  await map.getByRole("button", { name: "Inspector", exact: true }).click();
  await expectMinimumTargets(map.locator('button:visible, input:visible, select:visible, textarea:visible'));
  await expect(map.getByLabel("Page title")).toHaveCSS("color", await semanticColor(page, "--simex-text-strong"));

  await map.getByRole("button", { name: "Structure", exact: true }).click();
  const structure = map.getByRole("navigation", { name: "Dashboard structure" });
  const contrast = await structure.getByRole("treeitem", { name: "Biomedical", exact: true }).evaluate((item) => {
    const surface = item.closest(".build-side-sheet");
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

  await page.getByRole("button", { name: "Add chart", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add new chart" });
  const stageLabels = await wizard.getByRole("navigation", { name: "Chart creation steps" })
    .getByRole("button").allTextContents();
  expect(stageLabels.map((label) => label.replace(/(Complete|In progress|Not started|Waiting on prerequisite|Needs attention)$/u, "")))
    .toEqual(["Destination", "Data source", "Chart type", "Map and prepare", "Configure", "Review"]);
  await expectMinimumTargets(wizard.locator('button:visible, input:visible:not([type="checkbox"]):not([type="radio"]), select:visible, textarea:visible'));
  const flow = chartAuthoringWorkflow(wizard);
  await flow.goToChartType();
  await expectMinimumTargets(wizard.locator('button:visible, input:visible:not([type="checkbox"]):not([type="radio"]), select:visible, textarea:visible'));
});

test("phone Build stays operational beneath its persistent recovery notice", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();

  const notice = page.locator('[data-phone-mode-notice="build"]');
  await expect(notice).toBeVisible();
  await expect(notice.getByRole("button", { name: "Switch to View", exact: true })).toBeVisible();
  await expectMinimumTarget(notice.getByRole("button"));
  const buildShell = page.locator(".build-mode-shell");
  const mapToggle = page.getByRole("button", { name: "Dashboard map", exact: true });
  await expect(buildShell).toBeVisible();
  await expect(mapToggle).toBeEnabled();
  await mapToggle.click();
  await expect(page.getByRole("complementary", { name: "Dashboard map" })).toBeVisible();
  await expect(notice).toBeVisible();
});

test("operation status shows blocking Finish Build work, completion, and footer-safe geometry", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();

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
  await expect(failedRestoreNotice).toBeVisible();
  await restoreDialog.getByRole("button", { name: "Keep local dashboard", exact: true }).click();
  await passport.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  const moveSection = page.getByRole("button", {
    name: "Move Outbreak dynamics later",
    exact: true,
  });
  await moveSection.click();
  const layoutOwner = page.locator('[data-pending-work-kind="layout"]');
  await expect(layoutOwner).toHaveAttribute("data-pending-work-state", "dirty");
  await expect(failedRestoreNotice).toBeVisible();

  await footer.evaluate((node) => node.scrollIntoView({ block: "end", behavior: "auto" }));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const integratedGeometry = await page.evaluate(() => {
    const notice = [...document.querySelectorAll('[data-operation-status]')]
      .find((item) => item.textContent.includes("Restoring online dashboard"))?.getBoundingClientRect();
    const drawer = document.querySelector('#dashboard-map-panel')?.getBoundingClientRect();
    const pending = document.querySelector('[data-pending-work-kind="layout"]')?.getBoundingClientRect();
    const dashboardFooter = document.querySelector(".dashboard-footer")?.getBoundingClientRect();
    const overlaps = (first, second) => Boolean(first && second
      && first.left < second.right && first.right > second.left
      && first.top < second.bottom && first.bottom > second.top);
    return {
      width: window.innerWidth,
      drawerGap: drawer && notice ? drawer.left - notice.right : -1,
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

  await page.setViewportSize({ width: 820, height: 900 });
  await page.getByRole("button", { name: "Dashboard look", exact: true }).click();
  const lookDrawer = page.getByRole("dialog", { name: "Dashboard look", exact: true });
  await expect(lookDrawer).toBeVisible();
  await expect.poll(async () => page.evaluate(() => {
    const viewportBox = document.querySelector(".operation-status-viewport")?.getBoundingClientRect();
    const drawerBox = document.querySelector(".look-drawer")?.getBoundingClientRect();
    return viewportBox && drawerBox ? drawerBox.left - viewportBox.right : -1;
  })).toBeGreaterThanOrEqual(15);
  expect(await lookDrawer.evaluate((drawer) => drawer.getBoundingClientRect().width))
    .toBeGreaterThanOrEqual(399);
});

test("same-page section reorder paints status first and moves the existing chart DOM without chart work", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  const mapToggle = page.getByRole("button", { name: "Dashboard map", exact: true });
  await mapToggle.click();

  const section = page.locator('[data-canonical-section-id="outbreak_dynamics"]');
  const panel = section.locator("[data-panel-id]").first();
  await expect(panel.locator("canvas").first()).toBeAttached();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await panel.evaluate((panelNode) => {
    const sectionNode = panelNode.closest("[data-canonical-section-id]");
    window.__sectionZeroWorkProbe = {
      sectionNode,
      panelNode,
      canvasNode: panelNode.querySelector("canvas"),
      panelMutations: 0,
      lifecycle: [],
    };
    new MutationObserver((records) => {
      window.__sectionZeroWorkProbe.panelMutations += records.length;
    }).observe(panelNode, { attributes: true, childList: true, subtree: true });
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

  await page.getByRole("button", { name: "Move Outbreak dynamics later", exact: true }).click();
  await expect.poll(() => page.locator("[data-canonical-section-id]").evaluateAll(
    (nodes) => nodes.map((node) => node.getAttribute("data-canonical-section-id")).slice(0, 2),
  )).toEqual(["health_system", "outbreak_dynamics"]);

  const result = await page.evaluate(() => {
    const probe = window.__sectionZeroWorkProbe;
    const currentSection = document.querySelector('[data-canonical-section-id="outbreak_dynamics"]');
    const currentPanel = currentSection?.querySelector("[data-panel-id]");
    const currentCanvas = currentPanel?.querySelector("canvas");
    const workingIndex = probe.lifecycle.findIndex(({ status }) => status === "working");
    const movedIndex = probe.lifecycle.findIndex(({ order }) => (
      order[0] === "health_system" && order[1] === "outbreak_dynamics"
    ));
    return {
      sameSection: probe.sectionNode === currentSection,
      samePanel: probe.panelNode === currentPanel,
      sameCanvas: probe.canvasNode === currentCanvas,
      panelMutations: probe.panelMutations,
      workingIndex,
      movedIndex,
    };
  });
  expect(result).toEqual({
    sameSection: true,
    samePanel: true,
    sameCanvas: true,
    panelMutations: 0,
    workingIndex: expect.any(Number),
    movedIndex: expect.any(Number),
  });
  expect(result.workingIndex).toBeGreaterThanOrEqual(0);
  expect(result.movedIndex).toBeGreaterThan(result.workingIndex);
});

test("disabled reasons remain pointer-visible without reintroducing DOM focus", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Add chart", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Add new chart" })).toBeVisible();

  const finish = page.getByRole("button", { name: "Finish Build", exact: true });
  await expect(finish).toBeDisabled();
  await expect(finish).not.toHaveAttribute("aria-describedby", /.+/);
  const anchor = finish.locator("..");
  await expect(anchor).toHaveAttribute("data-control-tooltip-anchor", "true");
  await expect(anchor).toHaveAttribute("tabindex", "-1");
  const reasonId = await anchor.getAttribute("aria-describedby");
  expect(reasonId).toBeTruthy();

  await anchor.focus();
  await expect(anchor).not.toBeFocused();
  await expect(page.locator(`#${reasonId}`)).toHaveText("Finish or cancel the open chart draft.");

  await page.getByRole("dialog", { name: "Add new chart" })
    .getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Add new chart" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Finish Build", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Finish Build", exact: true }).locator(".."))
    .not.toHaveAttribute("tabindex", "0");
});

async function expectMinimumTargets(locator, minimum = 44) {
  const undersized = await locator.evaluateAll((controls, threshold) => controls
    .map((control) => {
      const box = control.getBoundingClientRect();
      return {
        label: control.getAttribute("aria-label") || control.textContent?.trim() || control.tagName,
        width: Math.round(box.width),
        height: Math.round(box.height),
      };
    })
    .filter(({ width, height }) => width < threshold || height < threshold), minimum);
  expect(undersized, JSON.stringify(undersized)).toEqual([]);
}

async function expectMinimumTarget(locator, minimum = 44) {
  await expectMinimumTargets(locator, minimum);
}

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
