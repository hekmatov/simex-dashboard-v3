import { expect, test } from "@playwright/test";

import { compareCentralCanvasGeometry } from "../dashboardGeometryContract.test.js";

export { compareCentralCanvasGeometry };

const CONTROL_URL = "http://127.0.0.1:4174";

export const WORKSPACE_VIEWPORTS = Object.freeze([
  Object.freeze({ width: 1024, height: 768 }),
  Object.freeze({ width: 1200, height: 900 }),
  Object.freeze({ width: 1440, height: 900 }),
]);

const CANONICAL_ATTRIBUTES = Object.freeze({
  page: "data-canonical-page-id",
  canvas: "data-canonical-canvas-id",
  grid: "data-canonical-grid-id",
  section: "data-canonical-section-id",
  panel: "data-canonical-panel-id",
  placement: "data-canonical-placement-id",
  plot: "data-canonical-plot-id",
});

export async function readCanonicalGeometry(page, expectedIds = null, { hydrate = true } = {}) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  if (hydrate) {
    const panels = page.locator("[data-canonical-panel-id], .chart-panel");
    for (let index = 0; index < await panels.count(); index += 1) {
      await panels.nth(index).scrollIntoViewIfNeeded();
    }
  }
  if (expectedIds?.plot?.length) {
    await expect.poll(
      () => page.locator("[data-canonical-plot-id]").count(),
      { message: "all lazy-rendered canonical plots", timeout: 30_000 },
    ).toBe(expectedIds.plot.length);
  }
  await page.evaluate(() => window.scrollTo(0, 0));

  return page.evaluate((attributes) => {
    const geometry = {};
    for (const [kind, attribute] of Object.entries(attributes)) {
      geometry[kind] = [...document.querySelectorAll(`[${attribute}]`)].map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          id: element.getAttribute(attribute),
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          relativeX: rect.x - document.querySelector("[data-canonical-canvas-id]").getBoundingClientRect().x,
          relativeY: rect.y - document.querySelector("[data-canonical-canvas-id]").getBoundingClientRect().y,
        };
      });
    }
    return {
      viewport: {
        clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight,
        devicePixelRatio: window.devicePixelRatio,
        scrollY: window.scrollY,
      },
      geometry,
    };
  }, CANONICAL_ATTRIBUTES);
}

export function expectedCanonicalIdsForPage(dashboard, pageId) {
  const dashboardPage = dashboard.pages.find(({ id }) => id === pageId);
  const panels = dashboardPage.sections.flatMap(({ panels: sectionPanels }) => sectionPanels);
  return {
    page: [dashboardPage.id],
    canvas: [dashboardPage.id],
    grid: [dashboardPage.id],
    section: dashboardPage.sections.map(({ id }) => id),
    panel: panels.map(({ id }) => id),
    placement: panels.map(({ id }) => id),
    plot: panels.map(({ id }) => id),
  };
}

test.describe.configure({ timeout: 150_000 });

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("central View Build geometry", async ({ page, request }) => {
  const fixtureResponse = await request.get("/config/dashboard.json");
  expect(fixtureResponse.ok()).toBe(true);
  const expectedIds = expectedCanonicalIdsForPage(await fixtureResponse.json(), "biomedical");

  for (const viewport of WORKSPACE_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.locator(".dashboard-command-page-scroller")
      .getByRole("button", { name: "Biomedical", exact: true })
      .click();
    await expect(page.locator(".chart-panel").first()).toBeVisible();
    const viewGeometry = await readCanonicalGeometry(page, expectedIds);
    const viewLegacy = await readLegacyDiagnostic(page);

    await page.getByLabel("Dashboard mode")
      .getByRole("button", { name: "Build", exact: true })
      .click();
    await expect(page.locator(".build-workspace")).toBeVisible();
    const buildGeometry = await readCanonicalGeometry(page, expectedIds);
    const buildLegacy = await readLegacyDiagnostic(page);

    const label = `${viewport.width}x${viewport.height}`;
    expect(buildGeometry.viewport, `${label} reference viewport`).toEqual(viewGeometry.viewport);

    let comparisons = [];
    let contractError = null;
    try {
      comparisons = compareCentralCanvasGeometry(viewGeometry, buildGeometry, expectedIds);
    } catch (error) {
      contractError = error;
    }
    expect(
      contractError,
      `${label} legacy canvas View ${formatRect(viewLegacy.canvas)} Build ${formatRect(buildLegacy.canvas)}; `
        + `first section View ${formatRect(viewLegacy.section)} Build ${formatRect(buildLegacy.section)}; `
        + `first panel View ${formatRect(viewLegacy.panel)} Build ${formatRect(buildLegacy.panel)}`,
    ).toBeNull();

    const mismatches = comparisons
      .filter(({ delta }) => Object.values(delta).some((value) => value !== "0.00"))
      .map(({ kind, id, view, build, delta }) => ({
        kind,
        id,
        view: formatRect(view),
        build: formatRect(build),
        delta,
      }));
    expect(mismatches, `${label} central canvas mismatches`).toEqual([]);
    const canvas = comparisons.find(({ kind }) => kind === "canvas");
    console.log("CENTRAL_CANVAS_GEOMETRY", JSON.stringify({
      viewport: label,
      counts: Object.fromEntries(Object.entries(viewGeometry.geometry).map(([kind, entries]) => [kind, entries.length])),
      canvas: { view: canvas.view, build: canvas.build, delta: canvas.delta },
      comparisons: comparisons.length,
    }));
  }
});

test("open Build panel preserves the central canvas and reveals the edited chart", async ({ page, request }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const fixtureResponse = await request.get("/config/dashboard.json");
  expect(fixtureResponse.ok()).toBe(true);
  const expectedIds = expectedCanonicalIdsForPage(await fixtureResponse.json(), "biomedical");

  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true })
    .click();
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();
  await expect(page.locator(".build-workspace")).toBeVisible();

  const closedGeometry = await readCanonicalGeometry(page, expectedIds);
  await page.getByRole("button", { name: "Build panel", exact: true }).click();
  const drawer = page.locator("#build-authoring-panel");
  await expect(drawer).toHaveAttribute("data-open", "true");
  const openGeometry = await readCanonicalGeometry(page, expectedIds);
  const mismatches = compareCentralCanvasGeometry(closedGeometry, openGeometry, expectedIds)
    .filter(({ delta }) => Object.values(delta).some((value) => value !== "0.00"));
  expect(mismatches, "opening Build must not shrink or reflow the central canvas").toEqual([]);

  const target = page.locator('[data-build-placement-id="bio_confirmed_cases"]');
  await target.scrollIntoViewIfNeeded();
  await target.getByRole("button", { name: "Edit chart", exact: true }).click();
  await expect(target).toHaveClass(/selected/);
  await expect(page.locator(".chart-editor-v3")).toBeVisible();

  const clearance = await page.evaluate(() => {
    const chart = document.querySelector('[data-build-placement-id="bio_confirmed_cases"]').getBoundingClientRect();
    const panel = document.querySelector("#build-authoring-panel").getBoundingClientRect();
    return { chartLeft: chart.left, chartRight: chart.right, panelLeft: panel.left };
  });
  expect(clearance.chartRight).toBeGreaterThan(0);
  expect(clearance.chartRight).toBeLessThanOrEqual(clearance.panelLeft - 12);
});

test("Build section rename target keeps 44px activation and 3px focus", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true })
    .click();
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();

  const renameButton = page.locator(".build-section-title-button").first();
  await expect(renameButton).toBeVisible();
  const target = await renameButton.boundingBox();
  expect(target.width).toBeGreaterThanOrEqual(44);
  expect(target.height).toBeGreaterThanOrEqual(44);

  await page.keyboard.press("Tab");
  await renameButton.focus();
  const focus = await renameButton.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineWidth: style.outlineWidth,
      outlineStyle: style.outlineStyle,
    };
  });
  expect(focus).toEqual({
    outlineWidth: "3px",
    outlineStyle: "solid",
  });
});

test("dirty Build chart blocks crown Page navigation until the draft resolves", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  const crownPages = page.locator(".dashboard-command-page-scroller");
  await crownPages.getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();

  const frame = page.locator(".canonical-dashboard-frame");
  const target = page.locator('[data-build-placement-id="bio_confirmed_cases"]');
  await target.scrollIntoViewIfNeeded();
  const editChart = target.getByRole("button", { name: "Edit chart", exact: true });
  await editChart.focus();
  await page.keyboard.press("Enter");

  const editor = page.locator(".chart-editor-v3");
  await editor.getByRole("button", { name: "Appearance", exact: true }).click();
  const title = editor.getByLabel("Chart title");
  await title.fill("Draft survives crown navigation");

  await crownPages.getByRole("button", { name: "Socio-economic", exact: true }).click();
  await expect(frame).toHaveAttribute("data-canonical-page-id", "biomedical");
  await expect(editor).toHaveCount(1);
  await expect(title).toHaveValue("Draft survives crown navigation");
  await expect(page.getByRole("alert")).toContainText(
    "Finish or cancel the open chart editor before changing Page.",
  );

  await editor.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await crownPages.getByRole("button", { name: "Socio-economic", exact: true }).click();
  await expect(frame).toHaveAttribute("data-canonical-page-id", "socio_economic");
});

test("shared Page row pins only the accepted View and Build actions", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  const pinned = page.locator('[data-command-crown-pinned-actions="true"]');

  await expect(pinned.getByRole("button", { name: "Dashboard look", exact: true }))
    .toHaveCount(1);
  await expect(pinned.getByRole("button", { name: "Chrono view", exact: true }))
    .toHaveCount(1);
  await expect(pinned.getByRole("button", { name: "Compare charts", exact: true }))
    .toHaveCount(1);
  await expect(page.locator(".view-page-actions")).toHaveCount(0);

  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();
  await expect(pinned.getByRole("button", { name: "Add Page", exact: true }))
    .toHaveCount(1);
  await expect(pinned.getByRole("button", { name: "Dashboard look", exact: true }))
    .toHaveCount(1);
  await expect(pinned.getByRole("button", { name: "Build panel", exact: true }))
    .toHaveCount(1);
  await expect(pinned.getByRole("button")).toHaveCount(3);
  await expect(pinned.getByRole("button", { name: "Chrono view", exact: true }))
    .toHaveCount(0);
  await expect(pinned.getByRole("button", { name: "Compare charts", exact: true }))
    .toHaveCount(0);
  await expect(page.locator(".build-page-navigation .build-add-page")).toHaveCount(0);

  await pinned.getByRole("button", { name: "Add Page", exact: true }).click();
  await expect(page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "New page", exact: true }))
    .toHaveCount(1);
});

test("repeated public Add Page requests use current dashboard state and unique IDs", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();

  const pinned = page.locator('[data-command-crown-pinned-actions="true"]');
  const addPage = pinned.getByRole("button", { name: "Add Page", exact: true });
  const frame = page.locator(".canonical-dashboard-frame");
  const crownPages = page.locator(".dashboard-command-page-scroller");

  await addPage.click();
  await expect(frame).toHaveAttribute("data-canonical-page-id", "new_page");
  await expect(addPage).toBeEnabled();

  await addPage.click();
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
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true })
    .click();

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

test("live Build Page actions expose 44px targets and a visible 3px focus ring", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();

  const actionRail = page.getByLabel("Home Page actions");
  const actions = actionRail.getByRole("button");
  await expect(actions).toHaveCount(3);
  for (const action of await actions.all()) {
    const box = await action.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }

  const edit = actionRail.getByRole("button", { name: "Edit Home", exact: true });
  await edit.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(edit).toBeFocused();
  const focus = await edit.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });
  expect(focus).toEqual({
    outlineStyle: "solid",
    outlineWidth: "3px",
  });
});

test("canonical View and Build frames project landing and analytical Page metadata", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  const frame = page.locator(".canonical-dashboard-frame");
  const header = frame.locator(".dashboard-header");

  await expect(frame).toHaveAttribute("data-page-type", "landing");
  expect(await header.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return [style.paddingTop, style.paddingRight];
  })).toEqual(["18px", "22px"]);

  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();
  await expect(frame).toHaveAttribute("data-canonical-mode", "build");
  await expect(frame).toHaveAttribute("data-page-type", "landing");
  expect(await header.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return [style.paddingTop, style.paddingRight];
  })).toEqual(["18px", "22px"]);

  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true })
    .click();
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

async function readLegacyDiagnostic(page) {
  return page.evaluate(() => {
    const read = (selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
    };
    return {
      canvas: read(".dashboard-workspace"),
      section: read(".dashboard-section"),
      panel: read(".chart-panel"),
    };
  });
}

function formatRect(rect) {
  if (!rect) return "missing";
  return `x=${rect.x.toFixed(2)} y=${rect.y.toFixed(2)} width=${rect.width.toFixed(2)} height=${rect.height.toFixed(2)}`;
}

test("look drawer allows transient compression and restores dashboard geometry and state", async ({ page, request }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const fixtureResponse = await request.get("/config/dashboard.json");
  expect(fixtureResponse.ok()).toBe(true);
  const expectedIds = expectedCanonicalIdsForPage(await fixtureResponse.json(), "biomedical");

  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true })
    .click();
  await expect(page.locator(".chart-panel").first()).toBeVisible();
  const before = await readCanonicalGeometry(page, expectedIds);
  const contentBefore = await page.evaluate(() => ({
    panels: [...document.querySelectorAll("[data-canonical-panel-id]")]
      .map((element) => [element.getAttribute("data-canonical-panel-id"), element.getAttribute("data-footprint")]),
    sections: [...document.querySelectorAll("[data-canonical-section-id]")]
      .map((element) => element.getAttribute("data-canonical-section-id")),
  }));

  await page.evaluate(() => window.scrollTo(0, 700));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const scrollBefore = await page.evaluate(() => window.scrollY);
  const trigger = page.getByRole("button", { name: "Dashboard look", exact: true });
  await trigger.evaluate((button) => button.click());
  const drawer = page.getByRole("dialog", { name: "Dashboard look" });
  await expect(drawer).toBeVisible();
  const drawerBox = await drawer.boundingBox();
  expect(drawerBox.width).toBeGreaterThanOrEqual(380);
  expect(drawerBox.width).toBeLessThanOrEqual(420);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);

  const system = drawer.getByLabel("System", { exact: true });
  const dark = drawer.getByLabel("Dark", { exact: true });
  await drawer.getByRole("button", { name: "Close", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(system).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(dark).toBeFocused();
  await expect(dark).toBeChecked();
  const focus = await dark.evaluate((element) => {
    const style = getComputedStyle(element.closest("label"));
    return { width: style.outlineWidth, style: style.outlineStyle };
  });
  expect(focus).toEqual({ width: "3px", style: "solid" });
  await expect(page.locator(".look-drawer-layer")).toHaveAttribute("data-resolved-appearance", "dark");
  expect(await drawer.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect(drawer.locator('[data-icon-id="auto"]')).toHaveCount(1);
  await expect(drawer.locator('[data-icon-id="appearanceLight"]')).toHaveCount(1);
  await expect(drawer.locator('[data-icon-id="appearanceDark"]')).toHaveCount(1);

  await drawer.getByRole("button", { name: "Close", exact: true }).click();
  await expect(drawer).toHaveCount(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);

  await page.evaluate(() => window.scrollTo(0, 0));
  await trigger.click();
  await expect(drawer).toBeVisible();
  const openGeometry = await readCanonicalGeometry(page, expectedIds, { hydrate: false });
  const closedCanvas = before.geometry.canvas[0];
  const openCanvas = openGeometry.geometry.canvas[0];
  expect(closedCanvas.width - openCanvas.width).toBeGreaterThan(0);
  expect(closedCanvas.width - openCanvas.width).toBeLessThanOrEqual(420);

  await drawer.getByRole("button", { name: "Close", exact: true }).click();
  await expect(drawer).toHaveCount(0);
  const restored = await readCanonicalGeometry(page, expectedIds, { hydrate: false });
  const restorationMismatches = compareCentralCanvasGeometry(before, restored, expectedIds)
    .filter(({ delta }) => Object.values(delta).some((value) => value !== "0.00"));
  expect(restorationMismatches).toEqual([]);
  const contentAfter = await page.evaluate(() => ({
    panels: [...document.querySelectorAll("[data-canonical-panel-id]")]
      .map((element) => [element.getAttribute("data-canonical-panel-id"), element.getAttribute("data-footprint")]),
    sections: [...document.querySelectorAll("[data-canonical-section-id]")]
      .map((element) => element.getAttribute("data-canonical-section-id")),
  }));
  expect(contentAfter).toEqual(contentBefore);
});

test("look drawer phone sheet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Dashboard look", exact: true }).click();

  const drawer = page.getByRole("dialog", { name: "Dashboard look" });
  await expect(drawer).toBeVisible();
  const box = await drawer.boundingBox();
  expect(box).not.toBeNull();
  expect(box.width).toBe(390);
  expect(box.height).toBe(844);
  await expect(page.locator(".look-drawer-click-catcher")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(drawer.getByRole("button", { name: "Close", exact: true })).toHaveCSS("min-height", "44px");
});

test("best-effort phone banner preserves state and leaves Present operable", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true })
    .click();
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();

  const layoutDraftValue = "Phone-preserved Biomedical layout";
  const pageLayoutControls = page.locator(".build-page-navigation");
  const editPageLayout = pageLayoutControls
    .getByRole("button", { name: "Edit Biomedical", exact: true });
  await editPageLayout.focus();
  await expect(editPageLayout).toBeFocused();
  await page.keyboard.press("Enter");
  const pageLayoutEditor = page.getByRole("complementary", { name: "Edit Page Biomedical" });
  await pageLayoutEditor.getByLabel("Page name").fill(layoutDraftValue);
  await pageLayoutEditor.getByRole("button", { name: "Apply", exact: true }).click();
  const layoutDraft = pageLayoutControls
    .getByRole("button", { name: layoutDraftValue, exact: true });
  await expect(layoutDraft).toBeVisible();

  const appFrame = page.locator(".app-frame");
  const workspace = page.locator(".build-workspace");
  const target = page.locator('[data-build-placement-id="bio_confirmed_cases"]');
  await target.scrollIntoViewIfNeeded();
  const editChart = target.getByRole("button", { name: "Edit chart", exact: true });
  await editChart.focus();
  await expect(editChart).toBeFocused();
  await page.keyboard.press("Enter");

  const editor = page.locator(".chart-editor-v3");
  await editor.getByRole("button", { name: "Appearance", exact: true }).click();
  const chartDraft = editor.getByLabel("Chart title");
  const saveChanges = editor.getByRole("button", { name: "Save changes", exact: true });
  await chartDraft.fill("Phone-preserved confirmed cases");
  await chartDraft.click();
  await expect(chartDraft).toBeFocused();
  await expect(saveChanges).toBeEnabled();

  const before = await page.evaluate(() => {
    const targetElement = document.querySelector('[data-build-placement-id="bio_confirmed_cases"]');
    return {
      scrollY: window.scrollY,
      targetId: targetElement?.getAttribute("data-build-placement-id"),
      targetTop: targetElement?.getBoundingClientRect().top,
    };
  });

  await page.setViewportSize({ width: 390, height: 844 });
  const buildNotice = page.locator('[data-phone-mode-notice="build"]');
  await expect(buildNotice).toBeVisible();
  await expect(buildNotice.getByRole("button", { name: "Switch to View", exact: true }))
    .toHaveCount(1);
  await expect(workspace).toHaveCount(1);
  await expect(chartDraft).toBeEnabled();
  await expect(saveChanges).toBeEnabled();
  await expect(chartDraft).toHaveValue("Phone-preserved confirmed cases");
  await expect(layoutDraft).toHaveText(layoutDraftValue);
  await expect(chartDraft).toBeFocused();
  await expect(target).toHaveAttribute("data-build-placement-id", "bio_confirmed_cases");
  await expect(target).toHaveClass(/\bselected\b/);
  expect(await page.evaluate(() => window.scrollY)).toBe(before.scrollY);

  await page.setViewportSize({ width: 1200, height: 900 });
  await expect(buildNotice).toBeHidden();
  await expect(workspace).toHaveCount(1);
  await expect(chartDraft).toHaveValue("Phone-preserved confirmed cases");
  await expect(layoutDraft).toHaveText(layoutDraftValue);
  await expect(chartDraft).toBeFocused();
  await expect(target).toHaveClass(/\bselected\b/);
  const after = await page.evaluate(() => {
    const targetElement = document.querySelector('[data-build-placement-id="bio_confirmed_cases"]');
    return {
      scrollY: window.scrollY,
      targetId: targetElement?.getAttribute("data-build-placement-id"),
      targetTop: targetElement?.getBoundingClientRect().top,
    };
  });
  expect(after.scrollY).toBe(before.scrollY);
  expect(after.targetId).toBe(before.targetId);
  expect(Math.abs(after.targetTop - before.targetTop)).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 390, height: 844 });
  const switchToView = buildNotice.getByRole("button", { name: "Switch to View", exact: true });
  const switchTarget = await switchToView.boundingBox();
  expect(switchTarget.width).toBeGreaterThanOrEqual(44);
  expect(switchTarget.height).toBeGreaterThanOrEqual(44);
  await switchToView.click();
  await expect(appFrame).toHaveAttribute("data-dashboard-mode", "build");
  await expect(page.getByRole("alert")).toHaveText(
    "Finish or cancel the open chart editor before leaving Build.",
  );
  await expect(chartDraft).toHaveValue("Phone-preserved confirmed cases");

  await editor.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await buildNotice.getByRole("button", { name: "Switch to View", exact: true }).click();
  await expect(appFrame).toHaveAttribute("data-dashboard-mode", "view");

  const presentMode = page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Present", exact: true });
  await presentMode.click();
  const presentWorkspace = page.locator(".present-workspace");
  await expect(page.locator('[data-phone-mode-notice="present"]')).toBeVisible();
  await expect(presentWorkspace).toHaveCount(1);
  await expect(presentWorkspace.getByLabel("Current page")).toHaveCount(0);
  const blackout = presentWorkspace.getByRole("button", { name: "Blackout", exact: true });
  const restore = presentWorkspace.getByRole("button", { name: "Restore", exact: true });
  await expect(blackout).toBeEnabled();
  await blackout.click();
  await expect(blackout).toBeDisabled();
  await expect(restore).toBeEnabled();
});
