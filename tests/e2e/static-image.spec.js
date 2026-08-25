import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 900 },
];
const PNG = Buffer.from(
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
    expect(storageInspection.persistedPanel).toBeNull();
    expect(storageInspection.persistedAssets).toBeUndefined();
    expect(storageInspection.sessionAssets).toHaveLength(1);
    expect(storageInspection.sessionAssets[0].id).toMatch(/^asset-[0-9a-f]{64}$/);
    expect(storageInspection.sessionAssets[0].entry).not.toHaveProperty("bytes");
    expect(storageInspection.sessionAssets[0].entry.mediaType).toBe("image/png");

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
      buffer: PNG,
    });
    await expect(editor.getByText(/replacement\.png is ready/)).toBeVisible();
    await expect(editor.getByLabel("Crop x")).toHaveValue("0");
    await expect(editor.getByText(/Review alternative text after replacement/)).toBeVisible();
    await editor.getByRole("button", { name: "Undo replacement" }).click();
    await expect(editor.getByLabel("Crop x")).toHaveValue("200");
    await expect(editor.getByText(/Review alternative text after replacement/)).toHaveCount(0);

    const cropSelection = editor.getByRole("group", { name: /Crop selection/ });
    await cropSelection.focus();
    await cropSelection.press("ArrowRight");
    await expect(editor.getByLabel("Crop x")).toHaveValue("210");
    await editor.getByRole("button", { name: "Rotate right" }).click();
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
    const savedTransform = panel.locator(".chart-image-saved-window");
    await expect(panel.locator('img[alt="Updated clinic readiness map"]')).toBeVisible();
    await expect(savedTransform).toHaveCSS("--image-crop-x", "10%");
    await expect(savedTransform).toHaveCSS("--image-crop-y", "21%");
    await expect(savedTransform).toHaveCSS("--image-crop-width", "80%");
    await expect(savedTransform).toHaveCSS("--image-crop-height", "70%");
    await expect(savedTransform).toHaveCSS("--image-saved-rotation", "180deg");

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
    await expect(imageView.locator(".chart-image-saved-window")).toHaveCSS("--image-crop-x", "10%");
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
  test.info().annotations.push({
    type: "blocked-by-slice-4",
    description: "Authored IndexedDB durability and dashboard/bundle v4 reload are owned by Slice 4.",
  });
  test.fixme(true, "Blocked by Slice 4: authored IndexedDB durability and dashboard/bundle v4 reload are not part of Slice 3.");
  await page.setViewportSize({ width: 1024, height: 768 });
  await openBiomedicalBuild(page);
  await createImage(page, "Reload image checkpoint");
  const before = await readSavedImage(page, "Reload image checkpoint");
  await page.reload();
  await page.locator(".dashboard-command-page-scroller").getByRole("button", { name: "Biomedical", exact: true }).click();
  const after = await readSavedImage(page, "Reload image checkpoint");
  expect(after.source).toEqual(before.source);
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

async function openImageEditor(panel, page, title) {
  await panel.hover();
  await panel.getByLabel(`${title} actions`).getByRole("button", { name: "Edit chart" }).click();
  await expect(page.getByRole("dialog", { name: "Edit static content" })).toBeVisible();
}
