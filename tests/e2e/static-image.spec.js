import { expect, test } from "@playwright/test";
import { imageFixtureBytes } from "../fixtures/imageFixtureBytes.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 900 },
];
const IM08_VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
];
const PNG = Buffer.from(imageFixtureBytes("image/png"));
const JPEG = Buffer.from(imageFixtureBytes("image/jpeg"));
const WEBP = Buffer.from(imageFixtureBytes("image/webp"));
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

    const beforeDiscard = await inspectBuildImageState(page, panel);
    await openImageEditor(panel, page, title);
    let editor = page.getByRole("dialog", { name: "Edit static content" });
    await expectStaticEditorCompression(page, viewport, beforeDiscard);
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
    await expectBuildImageRestored(page, panelId, beforeDiscard);

    panel = canonicalPanel(page, panelId);
    await panel.scrollIntoViewIfNeeded();
    const beforeSave = await inspectBuildImageState(page, panel);
    await openImageEditor(panel, page, title);
    editor = page.getByRole("dialog", { name: "Edit static content" });
    await expectStaticEditorCompression(page, viewport, beforeSave);
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
    await expectBuildImageRestored(page, panelId, beforeSave, { preserveViewer: false });

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
    const buildComposition = await inspectImageComposition(panel);
    expect(buildComposition.authoringActionCount).toBe(1);

    await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
    panel = canonicalPanel(page, panelId);
    await panel.scrollIntoViewIfNeeded();
    const viewComposition = await inspectImageComposition(panel);
    expect(viewComposition).toEqual({ ...buildComposition, authoringActionCount: 0 });
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
    const fullscreenImageView = fullscreen.locator(".chart-image-view");
    const fullscreenActions = fullscreenImageView.locator(".chart-image-actions");
    const exitFocus = fullscreen.getByRole("button", { name: "Exit focus" });
    await page.mouse.move(0, 0);
    await exitFocus.focus();
    await expect(fullscreenActions).toHaveCSS("opacity", "0");
    const fullscreenRestBox = await fullscreenImageView.boundingBox();
    await fullscreenImageView.hover();
    await expect(fullscreenActions).toHaveCSS("opacity", "1");
    expect(await fullscreenImageView.boundingBox()).toEqual(fullscreenRestBox);
    await page.mouse.move(0, 0);
    await exitFocus.focus();
    await expect(fullscreenActions).toHaveCSS("opacity", "0");
    await fullscreenImageView.getByRole("button", { name: "Zoom in" }).focus();
    await expect(fullscreenActions).toHaveCSS("opacity", "1");
    await exitFocus.focus();
    await expect(fullscreenActions).toHaveCSS("opacity", "0");
    await fullscreenImageView.evaluate((node) => node.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      pointerType: "touch",
      pointerId: 82,
      button: 0,
    })));
    await expect(fullscreenImageView).toHaveClass(/chart-image-view--touch-actions/);
    await expect(fullscreenActions).toHaveCSS("opacity", "1");
    const fullscreenComposition = await inspectImageComposition(fullscreen);
    expect(fullscreenComposition.sourceId).toBe(viewComposition.sourceId);
    expect(fullscreenComposition.sourceRevision).toBe(viewComposition.sourceRevision);
    expect(fullscreenComposition.alt).toBe(viewComposition.alt);
    expect(fullscreenComposition.viewBox).toBe(viewComposition.viewBox);
    expect(fullscreenComposition.rotationMatrix).toBe(viewComposition.rotationMatrix);
    expect(fullscreenComposition.fit).toBe(viewComposition.fit);
    expect(fullscreenComposition.authoringActionCount).toBe(0);
    const fullscreenSavedGeometry = await savedImageGeometry(fullscreenImageView);
    await fullscreenImageView.getByRole("button", { name: "Zoom in" }).click();
    await expect(fullscreenImageView).toHaveAttribute("data-image-zoom-scale", "1.25");
    expect(await savedImageGeometry(fullscreenImageView)).toEqual(fullscreenSavedGeometry);
    await fullscreenImageView.getByRole("button", { name: "Reset view" }).click();
    await expect(fullscreenImageView).toHaveAttribute("data-image-zoom-scale", "1");
    expect(await savedImageGeometry(fullscreenImageView)).toEqual(fullscreenSavedGeometry);
    await fullscreen.getByRole("button", { name: "Exit focus" }).click();
    await expect(panel.getByRole("button", { name: "Focus chart" })).toBeFocused();

    const siblingPanel = page.locator(
      `[data-panel-id]:not([data-panel-id="${panelId}"])[data-canonical-panel-id]`,
    ).first();
    await expect(siblingPanel).toBeAttached();
    const failedAssetId = await removeDurableImageAsset(page, title);
    expect(failedAssetId).toMatch(/^asset-[0-9a-f]{64}$/);
    await panel.hover();
    await panel.getByRole("button", { name: "Focus chart" }).click();
    const failedFullscreen = page.getByRole("dialog", { name: "Focused chart" });
    await expect(failedFullscreen.locator('[data-static-failure="asset-read-failed"]')).toBeVisible();
    await expect(failedFullscreen.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(failedFullscreen.getByRole("button", { name: "Replace" })).toHaveCount(0);
    await expect(failedFullscreen.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
    await expect(siblingPanel).toBeAttached();
    await restoreDurableImageAsset(page, failedAssetId);
    await failedFullscreen.getByRole("button", { name: "Retry" }).click();
    const recoveredFullscreenImage = failedFullscreen.locator('img[alt="Updated clinic readiness map"]');
    await expect(recoveredFullscreenImage).toBeVisible();
    await expect(recoveredFullscreenImage).toHaveAttribute("src", /^blob:/);
    await expect(siblingPanel).toBeAttached();
    await failedFullscreen.getByRole("button", { name: "Exit focus" }).click();
    await expect(panel.getByRole("button", { name: "Focus chart" })).toBeFocused();

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
    await panel.getByRole("button", { name: "Retry" }).click();
    await expect(panel.locator('[data-static-failure="image-load-failed"]')).toBeVisible();
    await panel.getByRole("button", { name: "Replace" }).click();
    editor = page.getByRole("dialog", { name: "Edit static content" });
    await expect(editor).toBeVisible();
    await expect(editor.getByLabel("HTTPS image URL")).toHaveValue("https://example.test/unavailable.png");
    await editor.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(editor).toHaveCount(0);
    panel = canonicalPanel(page, panelId);
    await expect(panel.locator('[data-static-failure="image-load-failed"]')).toBeVisible();

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

test("IM-02 live intake classifies every rejection and accepts real PNG JPEG WebP replacements", async ({ page }) => {
  test.setTimeout(240_000);
  await installControllableStorageQuota(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openBiomedicalBuild(page);
  await page.getByRole("button", { name: "Add static content", exact: true }).click();
  let wizard = page.getByRole("dialog", { name: "Add static content" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Image").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill("Intake boundary corpus");
  const input = wizard.getByLabel("PNG, JPEG, or WebP file");

  const oversized = Buffer.alloc((12 * 1024 * 1024) + 1);
  PNG.copy(oversized);
  const cases = [
    {
      code: "media-type-mismatch",
      file: upload("spoofed.jpg", "image/jpeg", PNG),
      message: "The declared image type does not match its file signature.",
    },
    {
      code: "corrupt-image",
      file: upload("truncated.png", "image/png", PNG.subarray(0, 20)),
      message: "The PNG chunk is truncated.",
    },
    {
      code: "animated-image",
      file: upload("animated.png", "image/png", pngWithChunk("acTL", Buffer.from([0, 0, 0, 2, 0, 0, 0, 0]))),
      message: "APNG is not supported; choose a single-frame raster image.",
    },
    {
      code: "animated-image",
      file: upload("animated.webp", "image/webp", animatedWebp()),
      message: "Animated WebP is not supported; choose a single-frame raster image.",
    },
    {
      code: "file-size-limit",
      file: upload("too-large.png", "image/png", oversized),
      message: "The image exceeds the 12 MiB encoded file limit.",
    },
    {
      code: "dimension-limit",
      file: upload("too-wide.png", "image/png", pngWithDimensions(16_385, 1)),
      message: "The image exceeds the 16,384 px dimension limit.",
    },
    {
      code: "megapixel-limit",
      file: upload("too-many-pixels.png", "image/png", pngWithDimensions(10_000, 5_001)),
      message: "The decoded image exceeds the 50 megapixel limit.",
    },
  ];
  for (const rejected of cases) {
    await input.setInputFiles(rejected.file);
    const error = wizard.locator(`[data-validation-code="${rejected.code}"]`);
    await expect(error).toHaveText(rejected.message);
    expect(await sessionAssetIds(page)).toEqual([]);
  }

  await wizard.getByLabel("Image origin").selectOption("url");
  const url = wizard.getByLabel("HTTPS image URL");
  for (const [value, message] of [
    ["not-a-url", "Image URL must be a valid https URL."],
    ["http://unsafe.example.test/map.png", "Image URL must use https."],
    ["file:///C:/private/map.png", "Image URL must use https."],
  ]) {
    await url.fill(value);
    await url.blur();
    await expect(wizard.locator('[data-validation-code="invalid-origin"]')).toHaveText(message);
  }
  await wizard.getByLabel("Image origin").selectOption("package");
  const packagePath = wizard.getByLabel("Dashboard package path");
  for (const value of ["../private/map.png", "assets/%2e%2e/private.png", "C:\\private\\map.png"]) {
    await packagePath.fill(value);
    await packagePath.blur();
    await expect(wizard.locator('[data-validation-code="invalid-origin"]'))
      .toHaveText("Image package path must be a safe dashboard-owned relative path.");
  }

  await wizard.getByLabel("Image origin").selectOption("asset");
  const localInput = wizard.getByLabel("PNG, JPEG, or WebP file");
  await localInput.setInputFiles(upload("accepted.png", "image/png", PNG));
  await expect(wizard.getByText(/accepted\.png is ready/)).toBeVisible();
  await wizard.getByLabel("Alternative text").fill("Validated intake corpus");
  await wizard.getByLabel("Crop x").fill("120");
  await localInput.setInputFiles(upload("accepted.jpg", "image/jpeg", JPEG));
  await expect(wizard.getByText(/accepted\.jpg is ready/)).toBeVisible();
  await expect(wizard.getByLabel("Crop x")).toHaveValue("0");
  await expect(wizard.getByText("Review alternative text after replacement.")).toBeVisible();
  await localInput.setInputFiles(upload("accepted.webp", "image/webp", WEBP));
  await expect(wizard.getByText(/accepted\.webp is ready/)).toBeVisible();
  await expect(wizard.locator(".static-image-validation")).toHaveCount(0);
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByRole("button", { name: "Add", exact: true }).click();
  await expect(wizard).toHaveCount(0);
  const accepted = await readSavedImage(page, "Intake boundary corpus");
  expect(accepted.source.revision).toBe(1);
  expect(accepted.asset.mediaType).toBe("image/webp");
});

test("IM-02 dashboard-budget and browser-quota failures recover through an exact replacement", async ({ page }) => {
  test.setTimeout(180_000);
  await installControllableStorageQuota(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openBiomedicalBuild(page);
  await createImage(page, "Intake budget corpus");
  await addDashboardBudgetFixture(page);
  await page.reload();
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  let saved = await readSavedImage(page, "Intake budget corpus");
  expect(await page.evaluate((key) => Boolean(
    JSON.parse(localStorage.getItem(key)).assets["asset-budget-fixture"],
  ), STORAGE_KEY)).toBe(true);
  await page.getByRole("button", { name: "Add static content", exact: true }).click();
  let wizard = page.getByRole("dialog", { name: "Add static content" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Image").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill("Rejected near-budget create");
  await wizard.locator("#static-image-file").setInputFiles(upload("budget.png", "image/png", PNG));
  await expect(wizard.locator('[data-validation-code="product-budget"]'))
    .toHaveText("The image would exceed the dashboard's 200 MiB authored-asset budget.");
  await wizard.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("dialog", { name: "Discard static content changes?" })
    .getByRole("button", { name: "Discard" }).click();
  await expect(wizard).toHaveCount(0);
  expect(await sessionAssetIds(page)).toEqual([]);

  await removeDashboardBudgetFixture(page);
  await page.reload();
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  saved = await readSavedImage(page, "Intake budget corpus");
  await scrollPanelIntoView(page, saved.panel.id);
  await openImageEditor(canonicalPanel(page, saved.panel.id), page, "Intake budget corpus");
  wizard = page.getByRole("dialog", { name: "Edit static content" });
  await setStorageQuotaMode(page, "insufficient");
  await wizard.locator("#static-image-file").setInputFiles(upload("quota.png", "image/png", PNG));
  await expect(wizard.locator('[data-validation-code="browser-quota"]'))
    .toHaveText("Browser storage quota is insufficient for this image.");
  await setStorageQuotaMode(page, "available");
  await wizard.locator("#static-image-file").setInputFiles(upload("recovered.jpg", "image/jpeg", JPEG));
  await expect(wizard.getByText(/recovered\.jpg is ready/)).toBeVisible();
  await expect(wizard.getByText("Review alternative text after replacement.")).toBeVisible();
  await wizard.getByLabel("Alternative text").fill("Recovered validated intake corpus");
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByRole("button", { name: "Save" }).click();
  await expect(wizard).toHaveCount(0);
  saved = await readSavedImage(page, "Intake budget corpus");
  expect(saved.source.revision).toBe(2);
  expect(saved.asset.mediaType).toBe("image/jpeg");
  await expect(canonicalPanel(page, saved.panel.id)
    .locator('img[alt="Recovered validated intake corpus"]')).toBeVisible();
});

test("dirty static selection keeps the complete draft until explicit Discard", async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openBiomedicalBuild(page);
  const panelId = await createImage(page, "Dirty selection image");
  const savedBefore = await readSavedImage(page, "Dirty selection image");
  const panel = canonicalPanel(page, panelId);
  await panel.scrollIntoViewIfNeeded();
  await openImageEditor(panel, page, "Dirty selection image");
  const editor = page.getByRole("dialog", { name: "Edit static content" });
  await editor.getByLabel("Image origin").selectOption("url");
  await editor.getByLabel("HTTPS image URL").fill("https://example.test/dirty-selection.png");
  await editor.getByLabel("Alternative text").fill("Complete retained draft");
  await editor.getByLabel("Crop x").fill("120");
  await editor.getByLabel("Crop y").fill("80");
  await editor.getByLabel("Crop width").fill("700");
  await editor.getByLabel("Crop height").fill("800");
  await editor.getByRole("button", { name: "Rotate right" }).click();
  await editor.getByLabel("Fit", { exact: true }).selectOption("cover");
  const retainedDraft = {
    url: await editor.getByLabel("HTTPS image URL").inputValue(),
    alt: await editor.getByLabel("Alternative text").inputValue(),
    cropX: await editor.getByLabel("Crop x").inputValue(),
    cropY: await editor.getByLabel("Crop y").inputValue(),
    cropWidth: await editor.getByLabel("Crop width").inputValue(),
    cropHeight: await editor.getByLabel("Crop height").inputValue(),
    rotation: await editor.locator(".image-rotation-controls output").textContent(),
    fit: await editor.getByLabel("Fit", { exact: true }).inputValue(),
  };

  const activateTreeItem = async (label) => {
    await page.evaluate(() => {
      const mapButton = [...document.querySelectorAll("button")]
        .find((node) => node.textContent?.trim() === "Dashboard map");
      mapButton?.click();
    });
    const activated = await page.evaluate((itemLabel) => {
      const item = [...document.querySelectorAll('[role="treeitem"]')]
        .find((node) => node.getAttribute("aria-label") === itemLabel);
      item?.click();
      return Boolean(item);
    }, label);
    await page.waitForTimeout(350);
    return activated;
  };

  expect(await activateTreeItem("Dirty selection image")).toBe(true);
  await expect(page.getByRole("dialog", { name: "Discard static content changes?" })).toHaveCount(0);
  await expect(editor.getByLabel("Alternative text")).toHaveValue("Complete retained draft");

  expect(await activateTreeItem("Confirmed cases")).toBe(true);
  let confirmation = page.getByRole("dialog", { name: "Discard static content changes?" });
  await confirmation.getByRole("button", { name: "Keep editing" }).click();
  await expect(editor.getByLabel("HTTPS image URL")).toHaveValue(retainedDraft.url);
  await expect(editor.getByLabel("Alternative text")).toHaveValue(retainedDraft.alt);
  await expect(editor.getByLabel("Crop x")).toHaveValue(retainedDraft.cropX);
  await expect(editor.getByLabel("Crop y")).toHaveValue(retainedDraft.cropY);
  await expect(editor.getByLabel("Crop width")).toHaveValue(retainedDraft.cropWidth);
  await expect(editor.getByLabel("Crop height")).toHaveValue(retainedDraft.cropHeight);
  await expect(editor.locator(".image-rotation-controls output")).toHaveText(retainedDraft.rotation);
  await expect(editor.getByLabel("Fit", { exact: true })).toHaveValue(retainedDraft.fit);

  expect(await activateTreeItem("Confirmed cases")).toBe(true);
  confirmation = page.getByRole("dialog", { name: "Discard static content changes?" });
  await confirmation.getByRole("button", { name: "Discard" }).click();
  await expect(editor).toHaveCount(0);
  const savedAfter = await readSavedImage(page, "Dirty selection image");
  expect(savedAfter.source).toEqual(savedBefore.source);
});

test("packaged Image source appears in the real guided crop preview", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openBiomedicalBuild(page);
  const panelId = await createImage(page, "Packaged crop preview");
  const packagedPath = `data/authored/${"a".repeat(64)}.png`;
  await page.evaluate(({ key, title, path }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const placement = dashboard.pages.flatMap((pageEntry) => pageEntry.sections)
      .flatMap((section) => section.panels)
      .find((entry) => (entry.chart ?? entry).title === title);
    const panel = placement.chart ?? placement;
    const previous = dashboard.dataSources[panel.sourceId];
    dashboard.dataSources[panel.sourceId] = {
      ...previous,
      revision: previous.revision + 1,
      origin: { kind: "package", path },
    };
    localStorage.setItem(key, JSON.stringify(dashboard));
  }, { key: STORAGE_KEY, title: "Packaged crop preview", path: packagedPath });
  await page.route(`**/${packagedPath}`, (route) => route.fulfill({
    status: 200,
    contentType: "image/png",
    body: PNG,
  }));
  await page.reload();
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  const panel = canonicalPanel(page, panelId);
  await panel.scrollIntoViewIfNeeded();
  await openImageEditor(panel, page, "Packaged crop preview");
  const editor = page.getByRole("dialog", { name: "Edit static content" });
  const preview = editor.locator('[data-image-crop-preview] img');
  await expect(preview).toHaveAttribute("src", packagedPath);
  await expect(preview).toBeVisible();
});

for (const viewport of IM08_VIEWPORTS) {
test(`IM-08 guided crop remains operable with keyboard and pointer at actual 200 percent page zoom at ${viewport.width}x${viewport.height}`, async ({ page, context }) => {
  test.setTimeout(150_000);
  await page.setViewportSize(viewport);
  await openBiomedicalBuild(page);
  await page.getByRole("button", { name: "Add static content", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add static content" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Image").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill(`Zoomed crop proof ${viewport.width}`);
  await wizard.getByLabel("PNG, JPEG, or WebP file").setInputFiles(
    upload("zoom-crop.png", "image/png", PNG),
  );
  await expect(wizard.getByText(/zoom-crop\.png is ready/)).toBeVisible();
  await wizard.getByLabel("Alternative text").fill("Zoomed crop fixture");
  await wizard.getByLabel("Crop width").fill("800");
  await wizard.getByLabel("Crop height").fill("800");

  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
  await expect.poll(() => page.evaluate(() => window.visualViewport?.scale)).toBe(2);
  const crop = wizard.getByRole("group", { name: /Crop selection/ });
  await crop.scrollIntoViewIfNeeded();
  await crop.focus();
  await expect(crop).toBeFocused();
  await crop.press("Shift+ArrowRight");
  await expect(wizard.getByLabel("Crop x")).toHaveValue("1");

  const beforeMove = await crop.boundingBox();
  await page.mouse.move(beforeMove.x + (beforeMove.width / 2), beforeMove.y + (beforeMove.height / 2));
  await page.mouse.down();
  await page.mouse.move(beforeMove.x + (beforeMove.width * 0.6), beforeMove.y + (beforeMove.height * 0.6));
  await page.mouse.up();
  await expect(wizard.getByLabel("Crop x")).not.toHaveValue("1");
  await expect(wizard.getByLabel("Crop y")).not.toHaveValue("0");

  const widthBeforeResize = await wizard.getByLabel("Crop width").inputValue();
  const resize = wizard.getByRole("button", { name: "Resize crop from bottom right" });
  await resize.scrollIntoViewIfNeeded();
  const resizeBox = await resize.boundingBox();
  await page.mouse.move(resizeBox.x + (resizeBox.width / 2), resizeBox.y + (resizeBox.height / 2));
  await page.mouse.down();
  await page.mouse.move(resizeBox.x + resizeBox.width + 16, resizeBox.y + resizeBox.height + 12);
  await page.mouse.up();
  await expect(wizard.getByLabel("Crop width")).not.toHaveValue(widthBeforeResize);

  const cropX = wizard.getByLabel("Crop x");
  await cropX.scrollIntoViewIfNeeded();
  await cropX.focus();
  await expect(cropX).toBeFocused();
  const zoomGeometry = await wizard.evaluate((dialog) => {
    const focused = document.activeElement;
    const focusRect = focused.getBoundingClientRect();
    const cropSelection = dialog.querySelector(".image-crop-selection");
    const style = getComputedStyle(cropSelection);
    return {
      pageScale: window.visualViewport?.scale,
      focusVisible: focusRect.top >= 0 && focusRect.bottom <= window.innerHeight,
      focusOutline: getComputedStyle(focused).outlineStyle,
      documentFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      dialogFits: dialog.scrollWidth <= dialog.clientWidth,
      cropVariables: [
        style.getPropertyValue("--image-crop-x").trim(),
        style.getPropertyValue("--image-crop-y").trim(),
        style.getPropertyValue("--image-crop-width").trim(),
        style.getPropertyValue("--image-crop-height").trim(),
      ],
      cropBounds: cropSelection.getBoundingClientRect().toJSON(),
    };
  });
  expect(zoomGeometry.pageScale).toBe(2);
  expect(zoomGeometry.focusVisible).toBe(true);
  expect(zoomGeometry.focusOutline).not.toBe("none");
  expect(zoomGeometry.documentFits).toBe(true);
  expect(zoomGeometry.dialogFits).toBe(true);
  expect(zoomGeometry.cropVariables.every(Boolean)).toBe(true);
  expect(zoomGeometry.cropBounds.width).toBeGreaterThan(0);
  expect(zoomGeometry.cropBounds.height).toBeGreaterThan(0);
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
});
}

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

async function inspectBuildImageState(page, panel) {
  return panel.evaluate((node) => {
    const frame = document.querySelector(".canonical-dashboard-frame.build-workspace");
    const viewer = node.querySelector(".chart-image-view");
    const rect = node.getBoundingClientRect();
    return {
      frameWidth: frame.getBoundingClientRect().width,
      footprint: node.getAttribute("data-footprint"),
      placementId: node.getAttribute("data-canonical-placement-id"),
      selected: node.classList.contains("selected"),
      panelWidth: rect.width,
      scrollLeft: window.scrollX,
      scrollTop: window.scrollY,
      viewerScale: viewer?.getAttribute("data-image-zoom-scale") ?? null,
      viewerPanX: viewer?.getAttribute("data-image-pan-x") ?? null,
      viewerPanY: viewer?.getAttribute("data-image-pan-y") ?? null,
    };
  });
}

async function expectStaticEditorCompression(page, viewport, before) {
  const frame = page.locator(".canonical-dashboard-frame.build-workspace");
  await expect(frame).toHaveAttribute("data-build-static-authoring-open", "true");
  const openState = await page.evaluate(() => {
    const frameNode = document.querySelector(".canonical-dashboard-frame.build-workspace");
    const dialog = document.querySelector('.static-content-dialog[role="dialog"]');
    const focused = document.activeElement;
    const rect = focused?.getBoundingClientRect();
    return {
      frameWidth: frameNode.getBoundingClientRect().width,
      focusInside: Boolean(dialog?.contains(focused)),
      focusClear: Boolean(rect && rect.top >= 0 && rect.bottom <= window.innerHeight),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  if (viewport.width >= 900) expect(openState.frameWidth).toBeLessThan(before.frameWidth - 80);
  else expect(Math.abs(openState.frameWidth - before.frameWidth)).toBeLessThan(1);
  expect(openState.focusInside).toBe(true);
  expect(openState.focusClear).toBe(true);
  expect(openState.documentWidth).toBeLessThanOrEqual(openState.viewportWidth);
}

async function expectBuildImageRestored(page, panelId, before, { preserveViewer = true } = {}) {
  const frame = page.locator(".canonical-dashboard-frame.build-workspace");
  await expect(frame).toHaveAttribute("data-build-static-authoring-open", "false");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(before.scrollTop);
  await expect.poll(() => page.evaluate((placementId) => (
    document.activeElement?.getAttribute("data-build-edit-for") === placementId
  ), before.placementId)).toBe(true);
  const restored = await inspectBuildImageState(page, canonicalPanel(page, panelId));
  expect(restored.footprint).toBe(before.footprint);
  expect(restored.placementId).toBe(before.placementId);
  expect(restored.selected).toBe(true);
  expect(Math.abs(restored.frameWidth - before.frameWidth)).toBeLessThan(1);
  expect(Math.abs(restored.panelWidth - before.panelWidth)).toBeLessThan(1);
  if (preserveViewer) {
    expect(restored.viewerScale).toBe(before.viewerScale);
    expect(restored.viewerPanX).toBe(before.viewerPanX);
    expect(restored.viewerPanY).toBe(before.viewerPanY);
  }
}

async function inspectImageComposition(surface) {
  return surface.evaluate((node) => {
    const panel = node.matches("[data-panel-id]") ? node : node.querySelector("[data-panel-id]");
    const viewer = node.querySelector(".chart-image-view");
    const geometry = node.querySelector(".chart-image-saved-geometry");
    return {
      sourceId: viewer?.getAttribute("data-static-source-id") ?? null,
      sourceRevision: viewer?.getAttribute("data-static-source-revision") ?? null,
      alt: node.querySelector(".chart-image-view img")?.getAttribute("alt") ?? null,
      viewBox: geometry?.getAttribute("viewBox") ?? null,
      rotationMatrix: geometry?.querySelector(".chart-image-saved-rotation")?.getAttribute("transform") ?? null,
      fit: geometry?.getAttribute("preserveAspectRatio") ?? null,
      footprint: panel?.getAttribute("data-footprint") ?? null,
      columns: panel ? getComputedStyle(panel).getPropertyValue("--chart-footprint-columns").trim() : null,
      rows: panel ? getComputedStyle(panel).getPropertyValue("--chart-footprint-rows").trim() : null,
      authoringActionCount: node.querySelectorAll(".panel-actions").length,
    };
  });
}

async function savedImageGeometry(imageView) {
  return imageView.locator(".chart-image-saved-geometry").evaluate((node) => ({
    viewBox: node.getAttribute("viewBox"),
    fit: node.getAttribute("preserveAspectRatio"),
    rotation: node.querySelector(".chart-image-saved-rotation")?.getAttribute("transform") ?? null,
  }));
}

async function removeDurableImageAsset(page, title) {
  return page.evaluate(async ({ key, expectedTitle }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const panel = dashboard.pages.flatMap(({ sections }) => sections)
      .flatMap(({ panels }) => panels)
      .map((placement) => placement.chart ?? placement)
      .find((candidate) => candidate.title === expectedTitle);
    const source = dashboard.dataSources[panel.sourceId];
    const assetId = source.origin.assetId;
    const store = globalThis[Symbol.for("simex.browser-authored-asset-store")];
    const asset = await store.read(assetId);
    globalThis.__SIMEX_REMOVED_FULLSCREEN_ASSET__ = asset;
    await store.remove(assetId);
    return assetId;
  }, { key: STORAGE_KEY, expectedTitle: title });
}

async function restoreDurableImageAsset(page, expectedAssetId) {
  const restoredAssetId = await page.evaluate(async () => {
    const asset = globalThis.__SIMEX_REMOVED_FULLSCREEN_ASSET__;
    const store = globalThis[Symbol.for("simex.browser-authored-asset-store")];
    const transactionId = `fullscreen-retry-${Date.now()}`;
    const staged = await store.stage({
      bytes: asset.bytes,
      mediaType: asset.mediaType,
      width: asset.width,
      height: asset.height,
      transactionId,
    });
    await store.commit(staged.assetId, { transactionId });
    delete globalThis.__SIMEX_REMOVED_FULLSCREEN_ASSET__;
    return staged.assetId;
  });
  expect(restoredAssetId).toBe(expectedAssetId);
}

function upload(name, mimeType, buffer) {
  return { name, mimeType, buffer };
}

function pngWithDimensions(width, height) {
  const bytes = Buffer.from(PNG);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes.writeUInt32BE(crc32(bytes.subarray(12, 29)), 29);
  return bytes;
}

function pngWithChunk(type, data) {
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + data.length)), 8 + data.length);
  return Buffer.concat([PNG.subarray(0, 33), chunk, PNG.subarray(33)]);
}

function animatedWebp() {
  const bytes = Buffer.from(WEBP);
  bytes[20] |= 0x02;
  return bytes;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const value of bytes) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function installControllableStorageQuota(page) {
  await page.addInitScript(() => {
    const storage = navigator.storage;
    if (!storage) return;
    const original = storage.estimate?.bind(storage);
    Object.defineProperty(storage, "estimate", {
      configurable: true,
      value: async () => globalThis.__SIMEX_E2E_QUOTA_MODE__ === "insufficient"
        ? { quota: 1, usage: 0 }
        : original
          ? original()
          : { quota: 1024 * 1024 * 1024, usage: 0 },
    });
  });
}

async function setStorageQuotaMode(page, mode) {
  await page.evaluate((value) => {
    globalThis.__SIMEX_E2E_QUOTA_MODE__ = value;
  }, mode);
}

async function addDashboardBudgetFixture(page) {
  await page.evaluate((key) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    dashboard.assets["asset-budget-fixture"] = {
      mediaType: "image/png",
      byteLength: 200 * 1024 * 1024,
      width: 1,
      height: 1,
      sha256: "a".repeat(64),
      storageState: "durable",
    };
    localStorage.setItem(key, JSON.stringify(dashboard));
  }, STORAGE_KEY);
}

async function removeDashboardBudgetFixture(page) {
  await page.evaluate((key) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    delete dashboard.assets["asset-budget-fixture"];
    localStorage.setItem(key, JSON.stringify(dashboard));
  }, STORAGE_KEY);
}
