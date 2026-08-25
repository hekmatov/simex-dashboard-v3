import { expect, test } from "@playwright/test";
import { imageFixtureBytes } from "../fixtures/imageFixtureBytes.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 900 },
];
const PNG = Buffer.from(imageFixtureBytes("image/png"));
const REPLACEMENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

for (const viewport of VIEWPORTS) {
  test(`Image completes its in-session production journey at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize(viewport);
    await page.route("https://example.test/**", (route) => route.abort("failed"));
    await openBiomedicalBuild(page);

    const title = `Readiness image ${viewport.width}`;
    const panelId = await createImage(page, title);
    const storageInspection = await inspectStagedImageStorage(page, title);
    expect(storageInspection.persistedPanel?.id).toBe(panelId);
    const [originalAssetId] = Object.keys(storageInspection.persistedAssets ?? {});
    expect(originalAssetId).toMatch(/^asset-[0-9a-f]{64}$/);
    expect(storageInspection.persistedAssets[originalAssetId]).toMatchObject({
      mediaType: "image/png",
      storageState: "durable",
    });
    expect(storageInspection.persistedAssets[originalAssetId]).not.toHaveProperty("bytes");
    expect(storageInspection.sessionAssets).toHaveLength(0);
    await createAndEditOrdinaryChart(page, `Post-image chart ${viewport.width}`);
    await expect.poll(() => sessionAssetIds(page)).toEqual([]);

    let panel = canonicalPanel(page, panelId);
    await panel.scrollIntoViewIfNeeded();
    await expect(panel.locator('img[alt="Clinic readiness by district"]')).toBeVisible();
    await expect(panel).not.toContainText(/Dataset|Chrono Group|Scene|Time controls/i);

    await openImageEditor(panel, page, title);
    let editor = page.getByRole("dialog", { name: "Edit static content" });
    await editor.getByLabel("Alternative text").fill("Unsaved alternative text");
    await editor.getByLabel("Crop width").fill("700");
    await editor.getByRole("button", { name: "Reset image" }).click();
    await expect(editor.getByLabel("Crop width")).toHaveValue("1000");
    await expect(panel.locator('img[alt="Clinic readiness by district"]')).toBeVisible();
    await editor.getByRole("button", { name: "Cancel", exact: true }).click();
    let confirmation = page.getByRole("dialog", { name: "Discard static content changes?" });
    await confirmation.getByRole("button", { name: "Keep editing" }).click();
    await expect(editor.getByLabel("Alternative text")).toHaveValue("Unsaved alternative text");
    await expect(editor.getByLabel("Crop width")).toHaveValue("1000");
    await editor.getByRole("button", { name: "Cancel", exact: true }).click();
    confirmation = page.getByRole("dialog", { name: "Discard static content changes?" });
    await confirmation.getByRole("button", { name: "Discard" }).click();
    await expect(editor).toHaveCount(0);
    panel = canonicalPanel(page, panelId);
    await expect(panel.locator('img[alt="Clinic readiness by district"]')).toBeVisible();

    panel = canonicalPanel(page, panelId);
    await panel.scrollIntoViewIfNeeded();
    await openImageEditor(panel, page, title);
    editor = page.getByRole("dialog", { name: "Edit static content" });
    await editor.locator("#static-image-file").setInputFiles({
      name: "replacement.png",
      mimeType: "image/png",
      buffer: REPLACEMENT_PNG,
    });
    await expect(editor.getByText(/replacement\.png is ready/)).toBeVisible();
    await expect(editor.getByLabel("Crop x")).toHaveValue("0");
    await expect(editor.getByText(/Review alternative text after replacement/)).toBeVisible();
    expect(await sessionAssetIds(page)).toHaveLength(1);
    await editor.getByRole("button", { name: "Undo replacement" }).click();
    await expect(editor.getByLabel("Crop x")).toHaveValue("200");
    await expect(editor.getByText(/Review alternative text after replacement/)).toHaveCount(0);
    await expect.poll(() => sessionAssetIds(page)).toEqual([]);

    const cropSelection = editor.getByRole("group", { name: /Crop selection/ });
    await cropSelection.focus();
    await cropSelection.press("ArrowRight");
    await expect(editor.getByLabel("Crop x")).toHaveValue("210");
    await editor.getByLabel("Alternative text").fill("Updated clinic readiness map");
    const resetImage = editor.getByRole("button", { name: "Reset image" });
    await resetImage.focus();
    await expect(resetImage).toBeFocused();
    const focusIsUnobscured = await resetImage.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const footer = node.closest("form")?.querySelector(":scope > footer")?.getBoundingClientRect();
      return !footer || rect.bottom <= footer.top;
    });
    expect(focusIsUnobscured).toBe(true);
    await editor.getByRole("button", { name: "Continue" }).click();
    await expect(editor.getByLabel("Canonical static content preview").locator('img[alt="Updated clinic readiness map"]')).toBeVisible();
    await editor.getByRole("button", { name: "Save" }).click();
    await expect(editor).toHaveCount(0);

    panel = canonicalPanel(page, panelId);
    let savedTransform = panel.locator(".chart-image-saved-geometry");
    await expect(panel.locator('img[alt="Updated clinic readiness map"]')).toBeVisible();
    await expect(savedTransform).toHaveAttribute("data-image-transform-order", "rotation-crop-fit");
    await expect(savedTransform).toHaveAttribute("data-image-source-width", "2");
    await expect(savedTransform).toHaveAttribute("data-image-source-height", "3");
    await expect(savedTransform).toHaveAttribute("data-image-rotated-width", "3");
    await expect(savedTransform).toHaveAttribute("data-image-rotated-height", "2");
    await expect(savedTransform).toHaveAttribute("viewBox", "0.63 0.2 2.1 1.6");
    await expect(savedTransform).toHaveAttribute("preserveAspectRatio", "xMidYMid slice");
    await expect(savedTransform.locator(".chart-image-saved-rotation"))
      .toHaveAttribute("transform", "matrix(0 1 -1 0 3 0)");
    const transformComposition = await savedTransform.evaluate((svg) => {
      const group = svg.querySelector(".chart-image-saved-rotation");
      const source = svg.querySelector("foreignObject");
      const image = svg.querySelector("img");
      const outer = svg.getScreenCTM();
      const rotation = group.transform.baseVal.consolidate().matrix;
      const rendered = group.getScreenCTM();
      const expected = outer.multiply(rotation);
      const delta = Math.max(...["a", "b", "c", "d", "e", "f"]
        .map((key) => Math.abs(rendered[key] - expected[key])));
      const viewBox = svg.viewBox.baseVal;
      const sourceCorners = [
        new DOMPoint(0, 0),
        new DOMPoint(2, 0),
        new DOMPoint(2, 3),
        new DOMPoint(0, 3),
      ].map((point) => point.matrixTransform(rotation));
      const bounds = {
        x: [Math.min(...sourceCorners.map(({ x }) => x)), Math.max(...sourceCorners.map(({ x }) => x))],
        y: [Math.min(...sourceCorners.map(({ y }) => y)), Math.max(...sourceCorners.map(({ y }) => y))],
      };
      const rect = svg.getBoundingClientRect();
      const expectedCoverScale = Math.max(rect.width / viewBox.width, rect.height / viewBox.height);
      const actualScale = Math.hypot(outer.a, outer.b);
      return {
        delta,
        bounds,
        sourcePlane: [source.width.baseVal.value, source.height.baseVal.value],
        intrinsic: [image.naturalWidth, image.naturalHeight],
        actualScale,
        expectedCoverScale,
        viewBox: [viewBox.x, viewBox.y, viewBox.width, viewBox.height],
      };
    });
    expect(transformComposition.sourcePlane).toEqual([2, 3]);
    expect(transformComposition.intrinsic).toEqual([2, 3]);
    expect(transformComposition.bounds).toEqual({ x: [0, 3], y: [0, 2] });
    for (const [index, expectedValue] of [0.63, 0.2, 2.1, 1.6].entries()) {
      expect(Math.abs(transformComposition.viewBox[index] - expectedValue)).toBeLessThan(0.000001);
    }
    expect(transformComposition.delta).toBeLessThan(0.001);
    expect(Math.abs(transformComposition.actualScale - transformComposition.expectedCoverScale)).toBeLessThan(0.01);

    await openImageEditor(panel, page, title);
    editor = page.getByRole("dialog", { name: "Edit static content" });
    await editor.getByLabel("Fit", { exact: true }).selectOption("contain");
    await editor.getByRole("button", { name: "Continue" }).click();
    await editor.getByRole("button", { name: "Save" }).click();
    await expect(editor).toHaveCount(0);
    panel = canonicalPanel(page, panelId);
    savedTransform = panel.locator(".chart-image-saved-geometry");
    await expect(savedTransform).toHaveAttribute("preserveAspectRatio", "xMidYMid meet");
    const containComposition = await savedTransform.evaluate((svg) => {
      const viewBox = svg.viewBox.baseVal;
      const rect = svg.getBoundingClientRect();
      const matrix = svg.getScreenCTM();
      return {
        actualScale: Math.hypot(matrix.a, matrix.b),
        expectedContainScale: Math.min(rect.width / viewBox.width, rect.height / viewBox.height),
      };
    });
    expect(Math.abs(containComposition.actualScale - containComposition.expectedContainScale)).toBeLessThan(0.01);

    await openImageEditor(panel, page, title);
    editor = page.getByRole("dialog", { name: "Edit static content" });
    await editor.locator("#static-image-file").setInputFiles({
      name: "cancelled-replacement.png",
      mimeType: "image/png",
      buffer: REPLACEMENT_PNG,
    });
    expect(await sessionAssetIds(page)).toHaveLength(1);
    await editor.getByRole("button", { name: "Cancel", exact: true }).click();
    confirmation = page.getByRole("dialog", { name: "Discard static content changes?" });
    await confirmation.getByRole("button", { name: "Discard" }).click();
    await expect.poll(() => sessionAssetIds(page)).toEqual([]);
    panel = canonicalPanel(page, panelId);

    await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
    panel = canonicalPanel(page, panelId);
    await panel.scrollIntoViewIfNeeded();
    const imageView = panel.locator(".chart-image-view");
    const imageActions = imageView.locator(".chart-image-actions");
    await page.mouse.move(0, 0);
    await expect(imageActions).toHaveCSS("opacity", "0");
    const beforeBox = await imageView.boundingBox();
    await imageView.hover();
    await expect(imageActions).toHaveCSS("opacity", "1");
    const afterBox = await imageView.boundingBox();
    expect(afterBox).toEqual(beforeBox);
    await imageView.getByRole("button", { name: "Zoom in" }).focus();
    await expect(imageActions).toHaveCSS("opacity", "1");
    await imageView.evaluate((node) => node.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      pointerType: "touch",
      pointerId: 81,
      button: 0,
    })));
    await expect(imageView).toHaveClass(/chart-image-view--touch-actions/);
    await imageView.getByRole("button", { name: "Zoom in" }).click();
    await expect(imageView).toHaveAttribute("data-image-zoom-scale", "1.25");
    await expect(imageView.locator(".chart-image-saved-geometry")).toHaveAttribute("viewBox", "0.63 0.2 2.1 1.6");
    await imageView.getByRole("button", { name: "Reset view" }).click();
    await expect(imageView).toHaveAttribute("data-image-zoom-scale", "1");

    await panel.getByRole("button", { name: "Focus chart" }).click();
    const fullscreen = page.getByRole("dialog", { name: "Focused chart" });
    await expect(fullscreen.locator('img[alt="Updated clinic readiness map"]')).toBeVisible();
    await expect(fullscreen.getByRole("button", { name: "Zoom in" })).toBeAttached();
    await fullscreen.getByRole("button", { name: "Exit focus" }).click();

    await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
    panel = canonicalPanel(page, panelId);
    await panel.scrollIntoViewIfNeeded();
    await openImageEditor(panel, page, title);
    editor = page.getByRole("dialog", { name: "Edit static content" });
    await editor.getByLabel("Image origin").selectOption("url");
    await editor.getByLabel("HTTPS image URL").fill("https://example.test/unavailable.png");
    await editor.getByLabel("HTTPS image URL").blur();
    await expect(editor.getByText("Image source is ready.")).toBeVisible();
    await editor.getByRole("button", { name: "Continue" }).click();
    await editor.getByRole("button", { name: "Save" }).click();
    await expect(editor).toHaveCount(0);

    panel = canonicalPanel(page, panelId);
    await panel.scrollIntoViewIfNeeded();
    await expect(panel.locator('[data-static-failure="image-load-failed"]')).toBeVisible();
    await expect(panel.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Replace" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
    await expect(panel).not.toContainText(/example\.test|static-|asset-/);
    await expect(page.locator(
      `[data-panel-id]:not([data-panel-id="${panelId}"])[data-canonical-panel-id]`,
    ).first()).toBeAttached();

    await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
    panel = canonicalPanel(page, panelId);
    await expect(panel.locator('[data-static-failure="image-load-failed"]')).toBeVisible();
    await expect(panel.getByText("Editing is available in Build.")).toBeVisible();
    await expect(panel.getByRole("button", { name: "Replace" })).toHaveCount(0);
    await expect(panel.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);

    const pageGeometry = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(pageGeometry.documentWidth).toBeLessThanOrEqual(pageGeometry.viewportWidth);
  });
}

test("IM-06 reload continuation restores the original asset and saved transform", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openBiomedicalBuild(page);
  await createImage(page, "Reload image checkpoint");
  const before = await readSavedImage(page, "Reload image checkpoint");
  await page.reload();
  await page.locator(".dashboard-command-page-scroller").getByRole("button", { name: "Biomedical", exact: true }).click();
  const after = await readSavedImage(page, "Reload image checkpoint");
  expect(after.source).toEqual(before.source);
  await scrollPanelIntoView(page, after.panel.id);
  await expect(canonicalPanel(page, after.panel.id).locator('img[alt="Clinic readiness by district"]')).toBeVisible();
});

async function openBiomedicalBuild(page) {
  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller").getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
}

async function createImage(page, title) {
  await page.getByRole("button", { name: "Add static content", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add static content" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Image").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill(title);
  await wizard.getByLabel("PNG, JPEG, or WebP file").setInputFiles({
    name: "readiness.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(wizard.getByText(/readiness\.png is ready/)).toBeVisible();
  await wizard.getByLabel("Alternative text").fill("Clinic readiness by district");
  await wizard.getByLabel("Crop width").fill("800");
  await wizard.getByLabel("Crop height").fill("700");
  await wizard.getByLabel("Crop x").fill("100");
  await wizard.getByLabel("Crop y").fill("100");
  await wizard.getByRole("button", { name: "Rotate right" }).click();
  await wizard.getByLabel("Fit", { exact: true }).selectOption("cover");
  await expect(wizard.locator("[data-image-crop-preview]")).toBeVisible();
  await expect(wizard).not.toContainText(/Choose dataset|Time field|Chrono Group|Scene/i);
  await wizard.getByRole("button", { name: "Continue" }).click();
  await expect(wizard.getByLabel("Canonical static content preview").locator('img[alt="Clinic readiness by district"]')).toBeVisible();
  await wizard.getByRole("button", { name: "Add", exact: true }).click();
  await expect(wizard).toHaveCount(0);
  const panel = page.getByLabel(`${title} actions`).locator("..");
  await expect(panel).toBeAttached();
  return panel.getAttribute("data-panel-id");
}

async function createAndEditOrdinaryChart(page, title) {
  await page.getByRole("button", { name: "Add chart", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add new chart" });
  const stageLabels = await wizard.getByRole("navigation", { name: "Chart creation steps" })
    .getByRole("button").allTextContents();
  expect(stageLabels.map((label) => label.replace(
    /(Complete|In progress|Not started|Waiting on prerequisite|Needs attention)$/u,
    "",
  ))).toEqual([
    "Destination",
    "Chart type",
    "Data source",
    "Map and prepare data",
    "Configure chart",
    "Review and create",
  ]);
  await wizard.getByRole("button", { name: /^Chart type\./ }).click();
  await wizard.getByRole("button", { name: /^Line\./ }).click();
  await wizard.getByLabel("Dashboard data source").selectOption("bio_cases");
  await wizard.getByRole("button", { name: /^Map and prepare data\./ }).click();
  await wizard.getByRole("button", { name: "Add measurement" }).click();
  await wizard.getByLabel("Observation / X-axis").selectOption("date");
  await wizard.getByRole("button", { name: /^Configure chart\./ }).click();
  await wizard.getByLabel("Chart title").fill(title);
  await wizard.getByRole("button", { name: /^Review and create\./ }).click();
  await wizard.getByRole("button", { name: "Create chart" }).click();
  await expect(wizard).toHaveCount(0);

  await expect.poll(() => findPersistedChartId(page, title)).not.toBeNull();
  const chartId = await findPersistedChartId(page, title);
  const map = page.getByRole("complementary", { name: "Dashboard map" });
  if (await map.isVisible()) {
    await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  }
  const panel = canonicalPanel(page, chartId);
  await panel.scrollIntoViewIfNeeded();
  await panel.hover();
  await panel.getByRole("button", { name: "Edit chart", exact: true }).click();
  const editor = page.locator(".chart-editor-v3");
  await editor.getByRole("button", { name: "Appearance", exact: true }).click();
  await editor.getByLabel("Chart title").fill(`${title} updated`);
  await editor.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect.poll(() => findPersistedChartId(page, `${title} updated`)).toBe(chartId);
  const durableShape = await page.evaluate((key) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    return {
      configVersion: dashboard.configVersion,
      hasAssets: Object.hasOwn(dashboard, "assets"),
      staticImages: Object.values(dashboard.dataSources)
        .filter(({ kind }) => kind === "staticImage").length,
    };
  }, STORAGE_KEY);
  expect(durableShape).toEqual({ configVersion: 4, hasAssets: true, staticImages: 1 });
}

async function findPersistedChartId(page, title) {
  return page.evaluate(({ key, expectedTitle }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    return dashboard.pages.flatMap(({ sections }) => sections)
      .flatMap(({ panels }) => panels)
      .map((placement) => placement.chart ?? placement)
      .find((chart) => chart.title === expectedTitle)?.id ?? null;
  }, { key: STORAGE_KEY, expectedTitle: title });
}

async function inspectStagedImageStorage(page, title) {
  return page.evaluate(({ key, expectedTitle }) => {
    const persistedText = localStorage.getItem(key);
    const persisted = persistedText ? JSON.parse(persistedText) : null;
    let persistedPanel = null;
    for (const pageItem of persisted?.pages ?? []) {
      for (const section of pageItem.sections ?? []) {
        persistedPanel ??= (section.panels ?? [])
          .map((placement) => placement.chart ?? placement)
          .find((panel) => panel.title === expectedTitle) ?? null;
      }
    }
    const sessionKey = Object.getOwnPropertySymbols(globalThis)
      .find((symbol) => Symbol.keyFor(symbol) === "simex.session-image-assets");
    const sessionMap = sessionKey ? globalThis[sessionKey] : new Map();
    return {
      persistedPanel,
      persistedAssets: persisted?.assets,
      sessionAssets: [...sessionMap.entries()].map(([id, entry]) => ({ id, entry: { ...entry } })),
    };
  }, { key: STORAGE_KEY, expectedTitle: title });
}

async function sessionAssetIds(page) {
  return page.evaluate(() => {
    const sessionKey = Object.getOwnPropertySymbols(globalThis)
      .find((symbol) => Symbol.keyFor(symbol) === "simex.session-image-assets");
    return sessionKey ? [...globalThis[sessionKey].keys()].sort() : [];
  });
}

async function readSavedImage(page, title) {
  return page.evaluate(({ key, expectedTitle }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    for (const pageItem of dashboard.pages ?? []) {
      for (const section of pageItem.sections ?? []) {
        for (const placement of section.panels ?? []) {
          const panel = placement.chart ?? placement;
          if (panel.title !== expectedTitle) continue;
          const source = dashboard.dataSources[panel.sourceId];
          return {
            panel,
            source,
            sourceId: panel.sourceId,
            asset: source.origin.kind === "asset" ? dashboard.assets[source.origin.assetId] : null,
          };
        }
      }
    }
    return null;
  }, { key: STORAGE_KEY, expectedTitle: title });
}

function canonicalPanel(page, panelId) {
  return page.locator(`[data-panel-id="${panelId}"][data-canonical-panel-id]`);
}

async function scrollPanelIntoView(page, panelId) {
  const found = await page.evaluate((id) => {
    const panel = document.querySelector(
      `[data-panel-id="${CSS.escape(id)}"][data-canonical-panel-id]`,
    );
    panel?.scrollIntoView({ block: "center" });
    return panel !== null;
  }, panelId);
  expect(found).toBe(true);
}

async function openImageEditor(panel, page, title) {
  await panel.hover();
  await panel.getByLabel(`${title} actions`).getByRole("button", { name: "Edit chart" }).click();
  await expect(page.getByRole("dialog", { name: "Edit static content" })).toBeVisible();
}
