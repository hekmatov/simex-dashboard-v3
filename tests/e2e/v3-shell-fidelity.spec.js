import { expect, test } from "@playwright/test";
import { enterAuthoredDashboard, openDashboardPage } from "./support/landingWorkflow.js";

async function openFullChartEditor(page, panel) {
  await panel.getByRole("button", { name: "Edit chart", exact: true }).click();
  const quick = page.locator(".chart-quick-editor");
  await expect(quick).toBeVisible();
  await quick.getByRole("button", { name: "Open full editor", exact: true }).click();
  const full = page.getByRole("dialog", { name: "Edit chart" });
  await expect(full).toBeVisible();
  return full;
}

const CONTROL_URL = "http://127.0.0.1:4174";

async function readCanvasState(page) {
  await page.evaluate(async () => document.fonts.ready);
  await expect(page.locator("[data-canonical-canvas-id]")).toBeVisible();
  return page.evaluate(() => {
    const frame = document.querySelector(".canonical-dashboard-frame");
    const canvas = document.querySelector("[data-canonical-canvas-id]");
    const rect = (element) => {
      const bounds = element.getBoundingClientRect();
      return { width: bounds.width, height: bounds.height };
    };
    return {
      frame: rect(frame),
      canvas: rect(canvas),
      maxWidth: getComputedStyle(document.documentElement)
        .getPropertyValue("--simex-canonical-canvas-max-width").trim(),
      frameMaxWidth: getComputedStyle(frame).maxWidth,
      canonicalMode: frame.getAttribute("data-canonical-mode"),
      grids: [...document.querySelectorAll("[data-canonical-grid-id]")]
        .map((element) => getComputedStyle(element).gridTemplateColumns),
      sections: [...document.querySelectorAll("[data-canonical-section-id]")]
        .map((element) => element.getAttribute("data-canonical-section-id")),
      panels: [...document.querySelectorAll("[data-canonical-panel-id]")]
        .map((element) => ({
          id: element.getAttribute("data-canonical-panel-id"),
          footprint: element.getAttribute("data-footprint"),
        })),
      scrollY: window.scrollY,
    };
  });
}

test.describe.configure({ timeout: 150_000 });

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("wide View and Build use the shared canonical canvas maximum", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  const view = await readCanvasState(page);

  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();
  const build = await readCanvasState(page);

  expect(view.maxWidth).toBe("1392px");
  expect(build.maxWidth).toBe(view.maxWidth);
  expect(view.canonicalMode).toBe("view");
  expect(build.canonicalMode).toBe("build");
  expect(Number.parseFloat(build.frameMaxWidth))
    .toBeLessThanOrEqual(Number.parseFloat(view.frameMaxWidth));
  expect(view.frame.width).toBeLessThanOrEqual(Number.parseFloat(view.maxWidth));
  expect(build.frame.width).toBeLessThanOrEqual(Number.parseFloat(build.maxWidth));
});

test("Dashboard map preserves saved layout, reveals the chart, and restores the closed canvas", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();
  await expect(page.locator(".build-workspace")).toBeVisible();

  const closed = await readCanvasState(page);
  const savedLayout = await page.evaluate(() => (
    localStorage.getItem("simex-dashboard-config-v3-three-mode-v1")
  ));
  const panelToggle = page.getByRole("button", { name: "Dashboard map", exact: true });
  await panelToggle.click();
  const drawer = page.locator("#dashboard-map-panel");
  await expect(drawer).toHaveAttribute("data-open", "true");
  const open = await readCanvasState(page);
  expect(open.panels).toEqual(closed.panels);
  expect(open.sections).toEqual(closed.sections);
  expect(await page.evaluate(() => (
    localStorage.getItem("simex-dashboard-config-v3-three-mode-v1")
  ))).toBe(savedLayout);

  const clearance = await page.evaluate(() => {
    const chart = document.querySelector('article[data-build-placement-id="bio_confirmed_cases"]').getBoundingClientRect();
    const panel = document.querySelector("#dashboard-map-panel").getBoundingClientRect();
    return {
      chartWidth: chart.width,
      visibleWidth: Math.max(0, Math.min(chart.right, panel.left, window.innerWidth) - Math.max(chart.left, 0)),
    };
  });
  expect(clearance.visibleWidth).toBeGreaterThanOrEqual(Math.min(220, clearance.chartWidth * 0.4));

  await panelToggle.click();
  await expect(drawer).toHaveAttribute("data-open", "false");
  const restored = await readCanvasState(page);
  expect(restored.frame).toEqual(closed.frame);
  expect(restored.canvas).toEqual(closed.canvas);
  expect(restored.grids).toEqual(closed.grids);
  expect(restored.sections).toEqual(closed.sections);
  expect(restored.panels).toEqual(closed.panels);
  expect(restored.scrollY).toBe(closed.scrollY);
  expect(await page.evaluate(() => (
    localStorage.getItem("simex-dashboard-config-v3-three-mode-v1")
  ))).toBe(savedLayout);

  const target = page.locator('article[data-build-placement-id="bio_confirmed_cases"]');
  const full = await openFullChartEditor(page, target);
  await expect(target).toHaveClass(/selected/);
  await expect(full.getByRole("navigation", { name: "Chart editing steps" })).toBeVisible();
});

test("Build Structure double click navigates, highlights, and opens section rename", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();

  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  const structure = page.getByRole("navigation", { name: "Dashboard structure" });
  const section = structure.getByRole("treeitem", { name: "Outbreak dynamics", exact: true });
  await section.locator(":scope > .build-tree-row .build-tree-label").dblclick();
  await expect(section).toHaveAttribute("aria-selected", "true");
  const rename = structure.getByRole("textbox", { name: "Rename section Outbreak dynamics" });
  await expect(rename).toBeVisible();
  await expect(rename).toHaveValue("Outbreak dynamics");
});

test("dirty Build chart blocks crown Page navigation until the draft resolves", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  const crownPages = page.locator(".dashboard-command-page-scroller");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();

  const frame = page.locator(".canonical-dashboard-frame");
  const target = page.locator('article[data-build-placement-id="bio_confirmed_cases"]');
  await target.scrollIntoViewIfNeeded();
  const editChart = target.getByRole("button", { name: "Edit chart", exact: true });
  await editChart.click();

  const quick = page.locator(".chart-quick-editor");
  await quick.getByRole("button", { name: "Open full editor", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit chart" });
  await editor.getByRole("button", { name: /^Configure\./ }).click();
  const title = editor.getByRole("textbox", { name: "Chart title", exact: true });
  await title.fill("Draft survives crown navigation");

  const blockedPage = crownPages.getByRole("button", { name: "Socio-economic", exact: true });
  await expect(blockedPage).toBeDisabled();
  await expect(frame).toHaveAttribute("data-canonical-page-id", "biomedical");
  await expect(editor).toHaveCount(1);
  await expect(title).toHaveValue("Draft survives crown navigation");

  await expect(editor).toBeVisible();
  await expect(title).toHaveValue("Draft survives crown navigation");
  await editor.getByRole("button", { name: "Discard changes", exact: true }).click();
  await page.getByRole("dialog", { name: "Discard changes?" })
    .getByRole("button", { name: "Discard", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(blockedPage).toBeEnabled();
  await blockedPage.click();
  await expect(frame).toHaveAttribute("data-canonical-page-id", "socio_economic");
});

test("shared Page row pins only the accepted View and Build actions", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await enterAuthoredDashboard(page);
  const pinned = page.locator('[data-command-crown-pinned-actions="true"]');

  await expect(pinned.getByRole("button", { name: "Theme", exact: true }))
    .toHaveCount(1);
  await expect(pinned.getByRole("button", { name: "Chrono view", exact: true }))
    .toHaveCount(1);
  await expect(pinned.getByRole("button", { name: "Compare charts", exact: true }))
    .toHaveCount(1);
  await expect(page.locator(".view-page-actions")).toHaveCount(0);

  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();
  const anchoredPages = page.locator('[data-build-page-navigation="anchored"]');
  await expect(anchoredPages.getByRole("button", { name: "Add page", exact: true }))
    .toHaveCount(1);
  await expect(pinned.getByRole("button", { name: "Theme", exact: true }))
    .toHaveCount(1);
  await expect(pinned.getByRole("button", { name: "Dashboard map", exact: true }))
    .toHaveCount(1);
  await expect(pinned.getByRole("button")).toHaveCount(2);
  await expect(pinned.getByRole("button", { name: "Chrono view", exact: true }))
    .toHaveCount(0);
  await expect(pinned.getByRole("button", { name: "Compare charts", exact: true }))
    .toHaveCount(0);
  await expect(pinned.getByRole("button", { name: "Add page", exact: true })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Choose a layout for this device" })).toHaveCount(0);

  await anchoredPages.getByRole("button", { name: "Add page", exact: true }).click();
  const createDialog = page.getByRole("dialog", { name: "Create Page" });
  await createDialog.getByLabel("Page name").fill("New page");
  await createDialog.getByRole("button", { name: "Create page", exact: true }).click();
  await expect(page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "New page", exact: true }))
    .toHaveCount(1);
});

test("repeated public Add Page requests use current dashboard state and unique IDs", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await enterAuthoredDashboard(page);
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();

  const addPage = page.locator('[data-build-page-navigation="anchored"]')
    .getByRole("button", { name: "Add page", exact: true });
  const frame = page.locator(".canonical-dashboard-frame");
  const crownPages = page.locator(".dashboard-command-page-scroller");
  const createNewPage = async () => {
    await addPage.click();
    const createDialog = page.getByRole("dialog", { name: "Create Page" });
    await createDialog.getByLabel("Page name").fill("New page");
    await createDialog.getByRole("button", { name: "Create page", exact: true }).click();
  };

  await createNewPage();
  await expect(frame).toHaveAttribute("data-canonical-page-id", "new_page");
  await expect(addPage).toBeEnabled();

  await createNewPage();
  await expect(frame).toHaveAttribute("data-canonical-page-id", "new_page_2");
  await expect(crownPages.getByRole("button", { name: "New page", exact: true }))
    .toHaveCount(2);
  const labels = await crownPages.locator("button").evaluateAll((buttons) => (
    buttons.map((button) => button.textContent?.trim())
  ));
  expect(labels.filter((label) => label === "New page")).toHaveLength(2);
});

test("active comparison selection disables repeated crown activation without clearing selection", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");

  const pinned = page.locator('[data-command-crown-pinned-actions="true"]');
  const compareCharts = pinned.getByRole("button", { name: "Compare charts", exact: true });
  await compareCharts.click();

  const firstPanel = page.locator(".chart-panel").first();
  await firstPanel.hover();
  await firstPanel.getByRole("button", { name: "Add chart to comparison" }).click();
  const selectionDock = page.getByRole("region", { name: "Chart comparison selection" });
  await expect(selectionDock).toContainText("1of 4 selected");

  await compareCharts.evaluate((button) => button.click());

  await expect(selectionDock).toContainText("1of 4 selected");
  await expect(compareCharts).toBeDisabled();
  await selectionDock.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(compareCharts).toBeEnabled();
});

test("live Build Structure tree exposes a compact utility caret without redundant Page actions", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await enterAuthoredDashboard(page);
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();

  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  const structure = page.getByRole("navigation", { name: "Dashboard structure" });
  const biomedical = structure.getByRole("treeitem", { name: "Biomedical", exact: true });
  const caret = biomedical.getByRole("button", { name: "Collapse Biomedical", exact: true });
  const target = await caret.boundingBox();
  expect(target?.width).toBeGreaterThanOrEqual(24);
  expect(target?.width).toBeLessThanOrEqual(32);
  expect(target?.height).toBeGreaterThanOrEqual(24);
  expect(target?.height).toBeLessThanOrEqual(32);
  await caret.click();
  await expect(biomedical.getByRole("button", { name: "Expand Biomedical", exact: true })).toBeVisible();
  await expect(page.locator(".build-page-navigation [aria-label$='Page actions']"))
    .toHaveCount(0);
});

test("canonical View and Build frames project analytical Page metadata", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await enterAuthoredDashboard(page);
  const frame = page.locator(".canonical-dashboard-frame");
  const header = frame.locator(".dashboard-header");

  await expect(frame).toHaveAttribute("data-page-type", "analytical");
  expect(await header.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return [style.paddingTop, style.paddingRight];
  })).toEqual(["12px", "20px"]);

  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();
  await expect(frame).toHaveAttribute("data-canonical-mode", "build");
  await expect(frame).toHaveAttribute("data-page-type", "analytical");
  expect(await header.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return [style.paddingTop, style.paddingRight];
  })).toEqual(["12px", "20px"]);

  await page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Biomedical", exact: true }).click();
  await expect(frame).toHaveAttribute("data-page-type", "analytical");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "View", exact: true })
    .click();
  await expect(frame).toHaveAttribute("data-canonical-mode", "view");
  await expect(frame).toHaveAttribute("data-page-type", "analytical");
  expect(await header.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return [style.paddingTop, style.paddingRight];
  })).toEqual(["12px", "20px"]);
});

test("look drawer allows transient compression and restores dashboard geometry and state", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  const before = await readCanvasState(page);

  await page.evaluate(() => window.scrollTo(0, 700));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const scrollBefore = await page.evaluate(() => window.scrollY);
  const trigger = page.getByRole("button", { name: "Theme", exact: true });
  await trigger.evaluate((button) => button.click());
  const drawer = page.getByRole("dialog", { name: "Theme" });
  await expect(drawer).toBeVisible();
  const drawerBox = await drawer.boundingBox();
  expect(drawerBox.width).toBeGreaterThanOrEqual(380);
  expect(drawerBox.width).toBeLessThanOrEqual(420);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);

  const dark = drawer.getByLabel("Dark", { exact: true });
  await dark.check();
  await expect(dark).toBeChecked();
  await expect(drawer).toHaveAttribute("data-resolved-appearance", "dark");
  expect(await drawer.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect(drawer.locator('[data-icon-id="auto"]')).toHaveCount(1);
  await expect(drawer.locator('[data-icon-id="appearanceLight"]')).toHaveCount(1);
  await expect(drawer.locator('[data-icon-id="appearanceDark"]')).toHaveCount(1);

  await drawer.getByRole("button", { name: "Close Theme", exact: true }).click();
  await expect(drawer).toHaveCount(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);

  await page.evaluate(() => window.scrollTo(0, 0));
  await trigger.click();
  await expect(drawer).toBeVisible();
  const open = await readCanvasState(page);
  expect(open.canvas.width).toBeLessThanOrEqual(before.canvas.width);
  expect(before.canvas.width - open.canvas.width).toBeLessThanOrEqual(420);
  expect(open.sections).toEqual(before.sections);
  expect(open.panels).toEqual(before.panels);

  await drawer.getByRole("button", { name: "Close Theme", exact: true }).click();
  await expect(drawer).toHaveCount(0);
  const restored = await readCanvasState(page);
  expect(restored.frame).toEqual(before.frame);
  expect(restored.canvas).toEqual(before.canvas);
  expect(restored.grids).toEqual(before.grids);
  expect(restored.sections).toEqual(before.sections);
  expect(restored.panels).toEqual(before.panels);
});

test("denied Theme and appearance writes remain live with session-only feedback", async ({ page }) => {
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function denyLookPersistence(key, value) {
      if (
        key === "simex-dashboard-config-v3-three-mode-v1"
        || key === "simex-dashboard-appearance-v3"
      ) {
        throw new DOMException("Storage denied", "SecurityError");
      }
      return setItem.call(this, key, value);
    };
  });
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Theme", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Theme" });
  const feedback = drawer.locator(".look-drawer-feedback");

  await drawer.getByLabel("Humanist", { exact: true }).check();
  await expect(page.locator(".app-frame")).toHaveAttribute(
    "data-dashboard-style", "humanist-standard",
  );
  await expect(feedback).toHaveText(
"Theme applied for this session but cannot be retained after reload.",
  );
  await expect(feedback).not.toContainText("saved");

  await drawer.getByLabel("Dark", { exact: true }).check();
  await expect(page.locator(".app-frame")).toHaveAttribute("data-resolved-appearance", "dark");
  await expect(feedback).toHaveText(
    "Appearance applied for this session but cannot be retained after reload.",
  );
  await expect(page.locator(".app-persistence-notice")).toContainText(
    "Appearance applied for this session but cannot be retained after reload.",
  );
});

test("denied dashboard writes remain usable with session-only feedback", async ({ page }) => {
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function denyConfigurationPersistence(key, value) {
      if (key === "simex-dashboard-config-v3-three-mode-v1") {
        throw new DOMException("Storage denied", "SecurityError");
      }
      return setItem.call(this, key, value);
    };
  });
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await enterAuthoredDashboard(page);
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  const structure = page.getByRole("navigation", { name: "Dashboard structure" });
  const biomedical = structure.getByRole("treeitem", { name: "Biomedical", exact: true });
  await biomedical.locator(":scope > .build-tree-row .build-tree-label").dblclick();
  const rename = structure.getByRole("textbox", { name: "Rename page Biomedical" });
  await rename.fill("Session-only Home");
  await rename.blur();
  const renamedPage = page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Session-only Home", exact: true });
  await expect(renamedPage).toBeVisible();
  const layoutOwner = page.getByRole("navigation", { name: "Pending Build work" })
    .locator('[data-pending-work-kind="layout"]');
  await expect(layoutOwner).toHaveCount(1);
  await layoutOwner.getByRole("button", { name: "Save Layout Changes", exact: true }).click();
  await expect(layoutOwner).toHaveCount(0);
  await expect(renamedPage).toBeVisible();
  await expect(page.locator(".app-persistence-notice")).toContainText(
    "Dashboard changes are applied for this session but cannot be retained after reload.",
  );
});

test("desktop width recommendation leaves Build and Present visible and usable", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();

  const layoutDraftValue = "Width-preserved Biomedical layout";
  const mapToggle = page.getByRole("button", { name: "Dashboard map", exact: true });
  await mapToggle.click();
  const mapPanel = page.locator("#dashboard-map-panel");
  const structure = page.getByRole("navigation", { name: "Dashboard structure" });
  const biomedical = structure.getByRole("treeitem", { name: "Biomedical", exact: true });
  await biomedical.locator(":scope > .build-tree-row .build-tree-label").dblclick();
  const pageRename = structure.getByRole("textbox", { name: "Rename page Biomedical" });
  await pageRename.fill(layoutDraftValue);
  await pageRename.blur();
  const renamedPage = structure.getByRole("treeitem", { name: layoutDraftValue, exact: true });
  const layoutDraft = renamedPage.locator(":scope > .build-tree-row .build-tree-label");
  await expect(layoutDraft).toBeVisible();
  const crownPages = page.locator(".dashboard-command-page-scroller");
  const renamedCrownPage = crownPages.getByRole("button", { name: layoutDraftValue, exact: true });
  const canonicalFrame = page.locator(".canonical-dashboard-frame");
  await mapPanel.getByRole("button", { name: "Close Dashboard map", exact: true }).click();
  await expect(mapPanel).toHaveAttribute("data-open", "false");
  await expect(renamedCrownPage).toBeVisible();
  await expect(canonicalFrame).toHaveAttribute("data-canonical-page-id", "biomedical");

  const appFrame = page.locator(".app-frame");
  const workspace = page.locator(".build-mode-shell");
  const target = page.locator('article[data-build-placement-id="bio_confirmed_cases"]');
  await target.scrollIntoViewIfNeeded();
  await target.hover();
  const editChart = target.getByRole("button", { name: "Edit chart", exact: true });
  await editChart.click();

  const quick = page.locator(".chart-quick-editor");
  await quick.getByRole("button", { name: "Open full editor", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit chart" });
  await editor.getByRole("button", { name: /^Configure\./ }).click();
  const chartDraft = editor.getByRole("textbox", { name: "Chart title", exact: true });
  const discardChanges = editor.getByRole("button", { name: "Discard changes", exact: true });
  await chartDraft.fill("Width-preserved confirmed cases");
  await expect(discardChanges).toBeEnabled();

  const before = await page.evaluate(() => {
    const targetElement = document.querySelector('article[data-build-placement-id="bio_confirmed_cases"]');
    return {
      scrollY: window.scrollY,
      targetId: targetElement?.getAttribute("data-build-placement-id"),
      targetTop: targetElement?.getBoundingClientRect().top,
    };
  });

  await page.setViewportSize({ width: 900, height: 720 });
  const buildNotice = page.locator('[data-desktop-width-notice="build"]');
  await expect(buildNotice).toBeVisible();
  await expect(buildNotice).toHaveText("A minimum width of 1024px is recommended for Build.");
  await expect(buildNotice.getByRole("button")).toHaveCount(0);
  await expect(workspace).toBeVisible();
  await expect(editor).toBeVisible();
  await expect(chartDraft).toBeVisible();
  await expect(discardChanges).toBeVisible();
  await expect(chartDraft).toHaveValue("Width-preserved confirmed cases");
  await expect(renamedCrownPage).toHaveText(layoutDraftValue);
  await expect(canonicalFrame).toHaveAttribute("data-canonical-page-id", "biomedical");
  await expect(target).toHaveAttribute("data-build-placement-id", "bio_confirmed_cases");
  await expect(target).toHaveClass(/\bselected\b/);

  await page.setViewportSize({ width: 1200, height: 900 });
  await expect(buildNotice).toBeHidden();
  await expect(workspace).toBeVisible();
  await expect(chartDraft).toHaveValue("Width-preserved confirmed cases");
  await expect(renamedCrownPage).toHaveText(layoutDraftValue);
  await expect(canonicalFrame).toHaveAttribute("data-canonical-page-id", "biomedical");
  await expect(target).toHaveClass(/\bselected\b/);
  const after = await page.evaluate(() => {
    const targetElement = document.querySelector('article[data-build-placement-id="bio_confirmed_cases"]');
    return {
      scrollY: window.scrollY,
      targetId: targetElement?.getAttribute("data-build-placement-id"),
      targetTop: targetElement?.getBoundingClientRect().top,
    };
  });
  expect(after.scrollY).toBe(before.scrollY);
  expect(after.targetId).toBe(before.targetId);
  expect(Math.abs(after.targetTop - before.targetTop)).toBeLessThanOrEqual(1);

  await expect(editor).toBeVisible();
  await expect(chartDraft).toHaveValue("Width-preserved confirmed cases");
  await editor.getByRole("button", { name: "Discard changes", exact: true }).click();
  await page.getByRole("dialog", { name: "Discard changes?" })
    .getByRole("button", { name: "Discard", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await mapToggle.click();
  await expect(mapPanel).toHaveAttribute("data-open", "true");
  await expect(layoutDraft).toHaveText(layoutDraftValue);
  await renamedPage.getByRole("button", { name: `Collapse ${layoutDraftValue}`, exact: true }).click();
  await expect(renamedPage).toHaveAttribute("aria-expanded", "false");
  await renamedPage.getByRole("button", { name: `Expand ${layoutDraftValue}`, exact: true }).click();
  await expect(renamedPage).toHaveAttribute("aria-expanded", "true");
  await mapPanel.getByRole("button", { name: "Close Dashboard map", exact: true }).click();
  await expect(mapPanel).toHaveAttribute("data-open", "false");
  await page.setViewportSize({ width: 900, height: 720 });
  await expect(buildNotice).toBeVisible();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
  await expect(appFrame).toHaveAttribute("data-dashboard-mode", "view");

  const presentMode = page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Present", exact: true });
  await presentMode.click();
  const presentWorkspace = page.locator(".present-workspace");
  const presentNotice = page.locator('[data-desktop-width-notice="present"]');
  await expect(presentNotice).toBeVisible();
  await expect(presentNotice).toHaveText("A minimum width of 1024px is recommended for Present.");
  await expect(presentWorkspace).toBeVisible();
  const chronoGroups = page.getByRole("button", { name: "Chrono Groups", exact: true });
  await expect(chronoGroups).toBeEnabled();
  await chronoGroups.click();
  await expect(page.locator(".present-action-dock")).toBeVisible();
});
