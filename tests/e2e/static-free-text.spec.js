import { expect, test } from "@playwright/test";
import { imageFixtureBytes } from "../fixtures/imageFixtureBytes.js";
import { openDashboardPage } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 900 },
];

const INITIAL_QMD = [
  "# Operational priorities",
  "",
  "Use **local evidence** and [the detail](#readiness-detail).",
  "",
  "## Readiness detail",
  "",
  "::: {.callout-warning}",
  "Confirm the cold chain before dispatch.",
  ":::",
  "",
  "| Facility | Ready |",
  "| --- | --- |",
  "| North | Yes |",
  "",
  "Display-only math $x^2$, $\\frac{a}{b}$, $\\sqrt{x}$, and $\\sum_{i=1}^{n} i$ with code `prepared_rows`.[^review]",
  "",
  "[^review]: Reviewed locally.",
  "",
  ...Array.from({ length: 28 }, (_, index) => `- Bounded note ${index + 1}`),
].join("\n");

const INERT_QMD = [
  "# Cancelled copy",
  "",
  "Plain comparison x<y stays text.",
  "",
  "<script>window.authoredCodeRan = true</script>",
  "<iframe src=\"https://example.test/cancelled-frame\"></iframe>",
  "![remote media](https://example.test/cancelled-image.png)",
  "{{< widget unsafe=true >}}",
  "",
  "```{python echo=true}",
  "print('display only')",
  "```",
].join("\n");

const SAVED_QMD = [
  "# Updated priorities",
  "",
  "The saved revision is **two**.",
  "",
  "| Facility | State |",
  "| --- | --- |",
  "| North | Confirmed |",
  "",
  "<script data-authored=\"true\">window.authoredCodeRan = true</script>",
  "<iframe src=\"https://example.test/saved-frame\"></iframe>",
  "![remote media](https://example.test/saved-image.png)",
  "{{< custom-widget source='authored' >}}",
  "",
  "```{python echo=true}",
  "print('saved, never executed')",
  "```",
  "",
  ...Array.from({ length: 72 }, (_, index) => `- Fullscreen controlled overflow note ${index + 1}`),
].join("\n");

const LINK_QMD = [
  "# Safe link corpus",
  "",
  "[Safe offline destination](https://safe.example.test/bounded)",
  "[Safe local detail](#local-detail)",
  "",
  "## Local detail",
  "",
  "[Unsafe javascript](javascript:window.__unsafeNavigation=true)",
  "[Unsafe encoded javascript](jav%61script:window.__unsafeNavigation=true)",
  "[Unsafe data](data:text/html,unsafe)",
  "[Unsafe blob](blob:https://safe.example.test/not-allowed)",
  "[Unsafe file](file:///C:/Windows/win.ini)",
  "[Unsafe mail](mailto:test@example.test)",
  "<a href=\"javascript:window.__unsafeMarkup=true\">Raw unsafe markup</a>",
].join("\n");

const SAFE_RECOVERY_QMD = "# Boundary recovery\n\nCurrent-session source recovered.";
const EMBEDDED_PNG = Buffer.from(imageFixtureBytes("image/png"));

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("Free-text composer authors portable semantic styles, keyboard emphasis, lists, tables, and preview", async ({ page }) => {
  await openBiomedicalBuild(page);
  await page.getByRole("button", { name: "Add Text/Image", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add Text/Image" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Free text").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  const composer = wizard.getByLabel("Portable QMD Composer editing area");

  await composer.fill("Brief");
  await composer.press("Control+a");
  await composer.press("Control+b");
  await expect(wizard.getByRole("button", { name: "Bold" }))
    .toHaveAttribute("aria-pressed", "true");
  await wizard.getByLabel("Semantic text style").selectOption("heading");
  await expect(composer.locator("h2 strong")).toHaveText("Brief");

  await composer.fill("First\nSecond");
  await composer.press("Control+a");
  await wizard.getByRole("button", { name: "Bullet list" }).click();
  await expect(composer.locator("ul li")).toHaveCount(2);

  await composer.fill("");
  await wizard.getByRole("button", { name: "Table" }).click();
  await expect(composer.locator("table")).toBeVisible();
  const preview = wizard.getByRole("region", { name: "Rendered preview" });
  await expect(preview).toBeVisible();
  await expect(preview.locator("table")).toBeVisible();
});

test("embedded image persists through reload and a second Text/Image creation", async ({ page }) => {
  test.setTimeout(120_000);
  const pageErrors = [];
  const unhandledRejections = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.exposeFunction("__captureStaticContentUnhandled", (message) => unhandledRejections.push(message));
  await page.addInitScript(() => {
    addEventListener("unhandledrejection", (event) => {
      globalThis.__captureStaticContentUnhandled?.(String(event.reason?.message ?? event.reason));
    });
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await openBiomedicalBuild(page);
  await page.getByRole("button", { name: "Add Text/Image", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add Text/Image" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Free text").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill("Embedded durability proof");
  await wizard.getByRole("button", { name: "Insert image" }).click();
  await wizard.getByRole("region", { name: "Media picker" })
    .getByLabel("PNG, JPEG, or WebP file").setInputFiles({
      name: "embedded-proof.png",
      mimeType: "image/png",
      buffer: EMBEDDED_PNG,
    });
  await expect(wizard.locator('[data-qmd-media-host] img[alt="embedded-proof.png"]')).toBeVisible();
  await expect(await rawQmdSource(wizard)).toHaveValue(/!\[embedded-proof\.png\]\(simex-media:media-/);
  await wizard.getByRole("button", { name: "Formatted text", exact: true }).click();
  await expect(wizard.getByLabel("Portable QMD Composer editing area")).toBeVisible();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByRole("button", { name: "Add", exact: true }).click();
  await expect(wizard).toHaveCount(0);

  const first = await readEmbeddedPublication(page, "Embedded durability proof");
  expect(first).toMatchObject({ placementCount: 1, sourceKind: "staticText", mediaCount: 1, assetCount: 1, assetState: "durable" });
  expect(first.qmd).toContain(`simex-media:${first.mediaId}`);
  await expect.poll(() => sessionAssetIds(page)).toEqual([]);
  let panel = canonicalPanel(page, first.panelId);
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.locator('img[alt="embedded-proof.png"]')).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "HeV-A26 Dashboard: Epidemiological overview" })).toBeVisible();
  const reloaded = await readEmbeddedPublication(page, "Embedded durability proof");
  expect(reloaded).toEqual(first);
  panel = canonicalPanel(page, first.panelId);
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.locator('img[alt="embedded-proof.png"]')).toBeVisible();

  await createFreeText(page, {
    title: "Immediate second Text/Image",
    qmd: "# Second creation\n\nPlain text remains intact.",
    viewport: { width: 1280, height: 800 },
    previewText: "Second creation",
  });
  expect((await readSavedFreeText(page, "Immediate second Text/Image")).source.qmd)
    .toBe("# Second creation\n\nPlain text remains intact.");
  panel = canonicalPanel(page, first.panelId);
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.locator('img[alt="embedded-proof.png"]')).toBeVisible();
  expect(pageErrors).toEqual([]);
  expect(unhandledRejections).toEqual([]);
});

test("Free Text edit embedded image retries durably through reload", async ({ page }) => {
  test.setTimeout(120_000);
  const pageErrors = [];
  const unhandledRejections = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.exposeFunction("__captureStaticEditUnhandled", (message) => unhandledRejections.push(message));
  await page.addInitScript((storageKey) => {
    addEventListener("unhandledrejection", (event) => {
      globalThis.__captureStaticEditUnhandled?.(String(event.reason?.message ?? event.reason));
    });
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function staticEditSetItem(key, value) {
      if (key === storageKey && globalThis.__STATIC_EDIT_FAIL_ONCE__ === true) {
        globalThis.__STATIC_EDIT_FAIL_ONCE__ = false;
        throw new DOMException("Injected Free Text edit persistence failure", "QuotaExceededError");
      }
      return original.call(this, key, value);
    };
  }, STORAGE_KEY);

  await page.setViewportSize({ width: 1280, height: 800 });
  await openBiomedicalBuild(page);
  await createFreeText(page, {
    title: "Embedded edit durability",
    qmd: "This text must survive a failed media edit.",
    viewport: { width: 1280, height: 800 },
    previewText: "This text must survive a failed media edit.",
  });
  const before = await readSavedFreeText(page, "Embedded edit durability");
  let panel = canonicalPanel(page, before.panel.id);
  await panel.scrollIntoViewIfNeeded();
  await openFreeTextEditor(panel, page, "Embedded edit durability");
  const editor = page.getByRole("dialog", { name: "Text/Image editor" });
  await expect(editor.getByLabel("Portable QMD Composer editing area")).toBeVisible();
  await editor.getByRole("button", { name: "Insert image" }).click();
  await editor.getByRole("region", { name: "Media picker" })
    .getByLabel("PNG, JPEG, or WebP file").setInputFiles({
      name: "embedded-edit-proof.png",
      mimeType: "image/png",
      buffer: EMBEDDED_PNG,
    });
  await expect(editor.locator('[data-qmd-media-host] img[alt="embedded-edit-proof.png"]')).toBeVisible();
  await editor.getByRole("button", { name: "Continue" }).click();
  await page.evaluate(() => { globalThis.__STATIC_EDIT_FAIL_ONCE__ = true; });
  await editor.getByRole("button", { name: "Save", exact: true }).click();

  await expect(editor).toBeVisible();
  await expect(editor.getByRole("alert")).toHaveText(
    "Browser storage is full. Remove an uploaded dataset or choose a smaller CSV, then try again.",
  );
  await expect(editor.getByRole("button", { name: "Retry Save" })).toBeVisible();
  expect((await readSavedFreeText(page, "Embedded edit durability")).source.qmd).toBe(before.source.qmd);
  expect(await sessionAssetIds(page)).toHaveLength(1);

  await editor.getByRole("button", { name: "Retry Save" }).click();
  await expect(editor).toHaveCount(0);
  const saved = await readEmbeddedPublication(page, "Embedded edit durability");
  expect(saved).toMatchObject({ placementCount: 1, sourceKind: "staticText", mediaCount: 1, assetCount: 1, assetState: "durable" });
  expect(saved.panelId).toBe(before.panel.id);
  await expect.poll(() => sessionAssetIds(page)).toEqual([]);
  panel = canonicalPanel(page, saved.panelId);
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.locator('img[alt="embedded-edit-proof.png"]')).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "HeV-A26 Dashboard: Epidemiological overview" })).toBeVisible();
  expect(await readEmbeddedPublication(page, "Embedded edit durability")).toEqual(saved);
  panel = canonicalPanel(page, saved.panelId);
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.locator('img[alt="embedded-edit-proof.png"]')).toBeVisible();
  expect(pageErrors).toEqual([]);
  expect(unhandledRejections).toEqual([]);
});

for (const viewport of VIEWPORTS) {
  test(`Free text completes its in-session production journey at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(180_000);
    const authoredResourceRequests = [];
    page.on("request", (request) => {
      if (request.url().startsWith("https://example.test/")) authoredResourceRequests.push(request.url());
    });
    await page.setViewportSize(viewport);
    await openBiomedicalBuild(page);

    const title = `Field guide ${viewport.width}`;
    await createFreeText(page, { title, qmd: INITIAL_QMD, viewport });

    const saved = await readSavedFreeText(page, title);
    expect(saved.panel.typeId).toBe("freeText");
    expect(saved.source).toMatchObject({
      kind: "staticText",
      sourceVersion: 1,
      renderingPolicy: "portable-qmd-v1",
      qmd: INITIAL_QMD,
      revision: 1,
    });
    expect(saved.panel).not.toHaveProperty("chronoGroupId");

    let panel = canonicalPanel(page, saved.panel.id);
    await panel.scrollIntoViewIfNeeded();
    await expect(panel).toContainText("Operational priorities");
    await expect(panel.locator(".portable-qmd-callout")).toContainText("Confirm the cold chain");
    await expect(panel.locator("table")).toContainText("North");
    await expectProductionMathGeometry(panel);
    const overflow = await panel.locator(".free-text-chart-view").evaluate((node) => ({
      internal: node.scrollHeight > node.clientHeight,
      overflowY: getComputedStyle(node).overflowY,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(overflow.overflowY).toBe("auto");
    if (viewport.width > 860) expect(overflow.internal).toBe(true);
    expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth);

    await panel.locator(".free-text-chart-view").evaluate((node) => {
      node.scrollTop = Math.min(120, node.scrollHeight - node.clientHeight);
    });
    const discardTrigger = await prepareFreeTextEditorTrigger(panel, title);
    const beforeDiscard = await inspectBuildStaticState(page, panel);

    await openFreeTextEditor(panel, page, title, discardTrigger);
    let editor = page.getByRole("dialog", { name: "Text/Image editor" });
    await expectStaticEditorCompression(page, viewport, beforeDiscard);
    const editorSource = await rawQmdSource(editor);
    await editorSource.fill(INERT_QMD);
    await expect(editor.getByRole("button", { name: "Continue" })).toBeEnabled();
    await expect(editor.getByRole("button", { name: "Preview & add", exact: true })).toBeEnabled();
    await expectInertAuthoredSurface(
      editor.getByRole("region", { name: "Rendered preview" }),
      "Cancelled copy",
    );
    expect(await page.evaluate(() => window.authoredCodeRan)).toBeUndefined();
    expect(authoredResourceRequests).toEqual([]);
    expect((await readSavedFreeText(page, title)).source.qmd).toBe(INITIAL_QMD);
    await editor.getByRole("button", { name: "Cancel", exact: true }).click();
    let confirmation = page.getByRole("dialog", { name: "Discard Text/Image changes?" });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole("button", { name: "Keep editing" }).click();
    await expect(editorSource).toHaveValue(/Cancelled copy/);
    await editor.getByRole("button", { name: "Cancel", exact: true }).click();
    confirmation = page.getByRole("dialog", { name: "Discard Text/Image changes?" });
    await confirmation.getByRole("button", { name: "Discard" }).click();
    await expect(editor).toHaveCount(0);
    expect((await readSavedFreeText(page, title)).source.qmd).toBe(INITIAL_QMD);
    await expectBuildStaticRestored(page, saved.panel.id, beforeDiscard);

    panel = canonicalPanel(page, saved.panel.id);
    await panel.scrollIntoViewIfNeeded();
    const saveTrigger = await prepareFreeTextEditorTrigger(panel, title);
    const beforeSave = await inspectBuildStaticState(page, panel);
    await openFreeTextEditor(panel, page, title, saveTrigger);
    editor = page.getByRole("dialog", { name: "Text/Image editor" });
    await expectStaticEditorCompression(page, viewport, beforeSave);
    await (await rawQmdSource(editor)).fill(SAVED_QMD);
    await expect(editor.getByRole("region", { name: "Rendered preview" }))
      .toContainText("Updated priorities");
    await editor.getByRole("button", { name: "Continue" }).click();
    await expect(editor.getByLabel("Text/Image preview")).toContainText("Updated priorities");
    await editor.getByRole("button", { name: "Save" }).click();
    await expect(editor).toHaveCount(0);
    await expectBuildStaticRestored(page, saved.panel.id, beforeSave, { preserveContentScroll: false });

    const updated = await readSavedFreeText(page, title);
    expect(updated.source.qmd).toBe(SAVED_QMD);
    expect(updated.source.revision).toBe(2);
    panel = canonicalPanel(page, saved.panel.id);
    await panel.scrollIntoViewIfNeeded();
    await expect(panel).toContainText("Updated priorities");
    await expect(panel).not.toContainText("Cancelled copy");
    await expectInertAuthoredSurface(panel, "Updated priorities");
    expect(await page.evaluate(() => window.authoredCodeRan)).toBeUndefined();
    expect(authoredResourceRequests).toEqual([]);
    const buildComposition = await inspectStaticComposition(panel);
    expect(buildComposition.sourceId).toBe(updated.panel.sourceId);
    expect(buildComposition.sourceRevision).toBe("2");
    expect(buildComposition.content).toContain("Updated priorities");
    expect(buildComposition.authoringActionCount).toBe(1);

    await page.getByLabel("Dashboard mode")
      .getByRole("button", { name: "View", exact: true }).click();
    panel = canonicalPanel(page, saved.panel.id);
    await panel.scrollIntoViewIfNeeded();
    await expect(panel).toContainText("Updated priorities");
    await expectInertAuthoredSurface(panel, "Updated priorities");
    const viewComposition = await inspectStaticComposition(panel);
    expect(viewComposition).toEqual({ ...buildComposition, authoringActionCount: 0 });
    await panel.getByRole("button", { name: "Focus chart" }).click();
    const fullscreen = page.getByRole("dialog", { name: "Focused chart" });
    await expect(fullscreen).toContainText(title);
    await expect(fullscreen).toContainText("Updated priorities");
    await expectInertAuthoredSurface(fullscreen, "Updated priorities");
    const fullscreenComposition = await inspectStaticComposition(fullscreen);
    expect(fullscreenComposition.sourceId).toBe(viewComposition.sourceId);
    expect(fullscreenComposition.content).toBe(viewComposition.content);
    expect(fullscreenComposition.sourceRevision).toBe(viewComposition.sourceRevision);
    expect(fullscreenComposition.overflowY).toBe("auto");
    expect(fullscreenComposition.authoringActionCount).toBe(0);
    const fullscreenText = fullscreen.locator(".free-text-chart-view");
    const beforeFullscreenScroll = await fullscreenText.evaluate((node) => ({
      scrollHeight: node.scrollHeight,
      clientHeight: node.clientHeight,
      scrollTop: node.scrollTop,
    }));
    expect(beforeFullscreenScroll.scrollHeight).toBeGreaterThan(beforeFullscreenScroll.clientHeight);
    await fullscreenText.evaluate((node) => {
      node.scrollTop = Math.min(240, node.scrollHeight - node.clientHeight);
    });
    await expect.poll(() => fullscreenText.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
    expect(await fullscreenText.evaluate((node) => getComputedStyle(node).overflowY)).toBe("auto");
    expect(authoredResourceRequests).toEqual([]);
    await fullscreen.getByRole("button", { name: "Exit fullscreen" }).click();

    await page.getByLabel("Dashboard mode")
      .getByRole("button", { name: "Present", exact: true }).click();
    await expect(page.getByRole("main").getByText(title, { exact: true })).toHaveCount(0);
  });
}

test(
  "FT-11 reload continuation preserves the exact saved QMD and revision",
  async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1024, height: 768 });
    await openBiomedicalBuild(page);
    await createFreeText(page, {
      title: "Reload handoff field guide",
      qmd: INITIAL_QMD,
      viewport: { width: 1024, height: 768 },
    });
    await page.reload();
    await page.getByRole("navigation", { name: "Dashboard pages" })
      .getByRole("button", { name: "Biomedical", exact: true }).click();
    const reloaded = await readSavedFreeText(page, "Reload handoff field guide");
    expect(reloaded.source.qmd).toBe(INITIAL_QMD);
    expect(reloaded.source.revision).toBe(1);
    const panel = canonicalPanel(page, reloaded.panel.id);
    await panel.scrollIntoViewIfNeeded();
    await expect(panel).toContainText("Operational priorities");
  },
);

test("FT-05 View and fullscreen activate only safe links by pointer and keyboard", async ({ page, context }) => {
  test.setTimeout(120_000);
  const controlledRequests = [];
  const failedControlledRequests = [];
  const unexpectedExternalRequests = [];
  let browserOffline = false;
  context.on("request", (request) => {
    const url = new URL(request.url());
    if (!["127.0.0.1", "safe.example.test"].includes(url.hostname)) {
      unexpectedExternalRequests.push(request.url());
    }
  });
  context.on("requestfailed", (request) => {
    if (request.url() === "https://safe.example.test/bounded") {
      failedControlledRequests.push(request.url());
    }
  });
  await context.route("https://safe.example.test/**", async (route) => {
    controlledRequests.push(route.request().url());
    if (browserOffline) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>Bounded offline destination</title><p>Controlled local response</p>",
    });
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await openBiomedicalBuild(page);
  await createFreeText(page, {
    title: "Link activation field guide",
    qmd: LINK_QMD,
    viewport: { width: 1280, height: 800 },
    previewText: "Safe link corpus",
  });
  const saved = await readSavedFreeText(page, "Link activation field guide");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "View", exact: true }).click();
  const panel = canonicalPanel(page, saved.panel.id);
  await panel.scrollIntoViewIfNeeded();
  await expectPortableLinkCorpus(panel, saved.panel.id);
  expect(controlledRequests).toEqual([]);

  await activateSafeExternal({ context, surface: panel, method: "pointer", offline: false });
  await activateScopedFragment({ page, surface: panel, method: "keyboard", panelId: saved.panel.id });

  await panel.getByRole("button", { name: "Focus chart" }).click();
  const fullscreen = page.getByRole("dialog", { name: "Focused chart" });
  await expectPortableLinkCorpus(fullscreen, saved.panel.id);
  await activateSafeExternal({ context, surface: fullscreen, method: "keyboard", offline: false });
  await activateScopedFragment({ page, surface: fullscreen, method: "pointer", panelId: saved.panel.id });
  await fullscreen.getByRole("button", { name: "Exit fullscreen" }).click();
  await expect(fullscreen).toHaveCount(0);

  browserOffline = true;
  await context.setOffline(true);
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  await expectPortableLinkCorpus(panel, saved.panel.id);
  await activateSafeExternal({ context, surface: panel, method: "keyboard", offline: true });
  await activateScopedFragment({ page, surface: panel, method: "pointer", panelId: saved.panel.id });
  await panel.getByRole("button", { name: "Focus chart" }).click();
  const offlineFullscreen = page.getByRole("dialog", { name: "Focused chart" });
  await expectPortableLinkCorpus(offlineFullscreen, saved.panel.id);
  await activateSafeExternal({ context, surface: offlineFullscreen, method: "pointer", offline: true });
  await activateScopedFragment({ page, surface: offlineFullscreen, method: "keyboard", panelId: saved.panel.id });

  expect(controlledRequests.filter((url) => url === "https://safe.example.test/bounded")).toHaveLength(4);
  expect(failedControlledRequests).toEqual([
    "https://safe.example.test/bounded",
    "https://safe.example.test/bounded",
  ]);
  expect(unexpectedExternalRequests).toEqual([]);
  expect(await page.evaluate(() => ({
    unsafeNavigation: window.__unsafeNavigation,
    unsafeMarkup: window.__unsafeMarkup,
  }))).toEqual({ unsafeNavigation: undefined, unsafeMarkup: undefined });
});

test("FT-06 live authoring blocks every resource boundary and preserves recoverable session source", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openBiomedicalBuild(page);
  await page.getByRole("button", { name: "Add Text/Image", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add Text/Image" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Free text").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill("Boundary traversal");
  const source = await rawQmdSource(wizard);
  await source.fill(SAFE_RECOVERY_QMD);
  await expect(wizard.getByRole("region", { name: "Rendered preview" }))
    .toContainText("Current-session source recovered");

  const tooManyColumns = tableWithColumns(21);
  const tooManyRows = tableWithRows(101);
  const renderedNodeOverflow = [
    ...Array.from({ length: 2_499 }, () => "x"),
    "---", "---", "---",
  ].join("\n\n");
  const mathExpansionOverflow = `$${"\\frac{x}{x}".repeat(220)}$`;
  const cases = [
    {
      rule: "source-size",
      value: "a".repeat(102_401),
      message: "Portable QMD source is 102401 bytes; the limit is 102400.",
    },
    {
      rule: "nesting-depth",
      value: `${"> ".repeat(7)}deep`,
      message: "Portable QMD nesting is 7 levels; the limit is 6.",
    },
    {
      rule: "table-columns",
      value: tooManyColumns,
      message: "This table has 21 columns; the limit is 20.",
    },
    {
      rule: "table-rows",
      value: tooManyRows,
      message: "This table has 101 rows; the limit is 100.",
    },
    {
      rule: "rendered-nodes",
      value: renderedNodeOverflow,
      message: "Portable QMD renders 5001 DOM nodes; the limit is 5000.",
    },
    {
      rule: "rendered-nodes",
      value: mathExpansionOverflow,
      message: "Portable QMD renders 5946 DOM nodes; the limit is 5000.",
    },
  ];

  await exerciseFreeTextBoundaries({
    page,
    surface: wizard,
    source,
    cases,
    async assertNoDraftPersisted(boundary) {
      expect(await readSavedFreeText(page, "Boundary traversal")).toBeNull();
      await expectBoundaryAbsentFromStorage(page, boundary.value);
    },
  });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByRole("button", { name: "Add", exact: true }).click();
  await expect(wizard).toHaveCount(0);
  const saved = await readSavedFreeText(page, "Boundary traversal");
  expect(saved.source.qmd).toBe(SAFE_RECOVERY_QMD);

  const panel = canonicalPanel(page, saved.panel.id);
  await panel.scrollIntoViewIfNeeded();
  await openFreeTextEditor(panel, page, "Boundary traversal");
  const editor = page.getByRole("dialog", { name: "Text/Image editor" });
  const editorSource = await rawQmdSource(editor);
  await exerciseFreeTextBoundaries({
    page,
    surface: editor,
    source: editorSource,
    cases,
    async assertNoDraftPersisted(boundary) {
      expect((await readSavedFreeText(page, "Boundary traversal")).source.qmd).toBe(SAFE_RECOVERY_QMD);
      await expectBoundaryAbsentFromStorage(page, boundary.value);
    },
  });

  await editorSource.fill(cases[0].value);
  await expect(editor.locator('[data-validation-rule="source-size"]')).toBeVisible();
  await editor.getByRole("button", { name: "Cancel", exact: true }).click();
  let confirmation = page.getByRole("dialog", { name: "Discard Text/Image changes?" });
  await confirmation.getByRole("button", { name: "Keep editing" }).click();
  await expect(editorSource).toHaveValue(cases[0].value);
  await expectBoundaryAbsentFromStorage(page, cases[0].value);
  await editor.getByRole("button", { name: "Cancel", exact: true }).click();
  confirmation = page.getByRole("dialog", { name: "Discard Text/Image changes?" });
  await confirmation.getByRole("button", { name: "Discard" }).click();
  await expect(editor).toHaveCount(0);
  expect((await readSavedFreeText(page, "Boundary traversal")).source.qmd).toBe(SAFE_RECOVERY_QMD);
});

async function openBiomedicalBuild(page) {
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();
}

async function createFreeText(page, {
  title,
  qmd,
  viewport,
  previewText = "Operational priorities",
}) {
  await page.getByRole("button", { name: "Add Text/Image", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add Text/Image" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Free text").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill(title);
  const source = await rawQmdSource(wizard);
  await source.fill(qmd);
  await expect(source).toHaveValue(qmd);
  const preview = wizard.getByRole("region", { name: "Rendered preview" });
  await expect(preview).toBeVisible();
  await expect(preview).toContainText(previewText);
  await expectFreeTextAuthoringGeometry(wizard, viewport);
  await wizard.getByRole("button", { name: "Formatted text", exact: true }).click();
  await expect(wizard.getByLabel("Portable QMD Composer editing area")).toBeVisible();
  await expect(preview).toBeVisible();

  await wizard.getByRole("button", { name: "Continue" }).click();
  await expect(wizard.getByLabel("Text/Image preview")).toContainText(previewText);
  await wizard.getByRole("button", { name: "Add", exact: true }).click();
  await expect(wizard).toHaveCount(0);
}

async function rawQmdSource(surface) {
  const source = surface.getByLabel("Portable QMD raw source");
  if (!(await source.isVisible())) {
    await surface.getByRole("button", { name: "Raw text", exact: true }).click();
  }
  await expect(source).toBeVisible();
  return source;
}

async function expectFreeTextAuthoringGeometry(surface, viewport) {
  const geometry = await surface.locator(".free-text-source-editor").evaluate((node) => {
    const editor = node.getBoundingClientRect();
    const preview = node.querySelector('[aria-label="Rendered preview"]')?.getBoundingClientRect();
    return {
      documentWidth: document.documentElement.scrollWidth,
      editorLeft: editor.left,
      editorRight: editor.right,
      previewWidth: preview?.width ?? 0,
      viewportWidth: window.innerWidth,
    };
  });
  expect(geometry.viewportWidth).toBe(viewport.width);
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.editorLeft).toBeGreaterThanOrEqual(0);
  expect(geometry.editorRight).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  expect(geometry.previewWidth).toBeGreaterThan(0);
}

async function expectPortableLinkCorpus(surface, panelId) {
  const sink = surface.locator('[data-portable-qmd-sink="safe-dom"]');
  const links = sink.getByRole("link");
  await expect(links).toHaveCount(2);
  const safe = sink.getByRole("link", { name: /Safe offline destination/ });
  await expect(safe).toHaveAttribute("href", "https://safe.example.test/bounded");
  await expect(safe).toHaveAttribute("target", "_blank");
  await expect(safe).toHaveAttribute("rel", "noopener noreferrer");
  await expect(sink.getByRole("link", { name: "Safe local detail" }))
    .toHaveAttribute("href", `#${panelId}-local-detail`);
  for (const text of [
    "Unsafe javascript",
    "Unsafe encoded javascript",
    "Unsafe data",
    "Unsafe blob",
    "Unsafe file",
    "Unsafe mail",
    "Raw unsafe markup",
  ]) {
    await expect(sink).toContainText(text);
  }
  await expect(sink).toContainText('<a href="javascript:window.__unsafeMarkup=true">Raw unsafe markup</a>');
  await expect(sink.locator("script,iframe,img,video,audio,object,embed,form,button,[src],[srcset],[poster]")).toHaveCount(0);
  await expect(sink.locator("[onclick],[onerror],[onload],[onmouseover],[style]")).toHaveCount(0);
}

async function activateSafeExternal({ context, surface, method, offline }) {
  const link = surface.getByRole("link", { name: /Safe offline destination/ });
  const popupPromise = context.waitForEvent("page");
  if (method === "keyboard") {
    await link.focus();
    await expect(link).toBeFocused();
    await link.press("Enter");
  } else {
    await link.click();
  }
  const popup = await popupPromise;
  if (offline) {
    await expect.poll(() => popup.url(), { timeout: 10_000 })
      .toBe("chrome-error://chromewebdata/");
  } else {
    await popup.waitForLoadState("domcontentloaded");
    expect(popup.url()).toBe("https://safe.example.test/bounded");
    expect(await popup.evaluate(() => document.body.textContent)).toContain("Controlled local response");
  }
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  await popup.close();
}

async function activateScopedFragment({ page, surface, method, panelId }) {
  await page.evaluate(() => history.replaceState(null, "", `${location.pathname}${location.search}`));
  const link = surface.getByRole("link", { name: "Safe local detail" });
  if (method === "keyboard") {
    await link.focus();
    await expect(link).toBeFocused();
    await link.press("Enter");
  } else {
    await link.click();
  }
  await expect.poll(() => page.evaluate(() => location.hash))
    .toBe(`#${panelId}-local-detail`);
}

async function exerciseFreeTextBoundaries({
  surface,
  source,
  cases,
  assertNoDraftPersisted,
}) {
  for (const boundary of cases) {
    await source.fill(boundary.value);
    const error = surface.locator(`[data-validation-rule="${boundary.rule}"]`);
    await expect(error).toBeVisible();
    await expect(error.locator("a")).toContainText(boundary.message);
    await expect(source).toHaveValue(boundary.value);
    await expect(source).toHaveAttribute("aria-invalid", "true");
    await expect(surface.getByRole("button", { name: "Continue" })).toBeDisabled();
    await expect(surface.getByRole("button", { name: "Preview & add", exact: true })).toBeDisabled();
    await expect(surface.getByRole("region", { name: "Rendered preview" }))
      .toContainText("Current-session source recovered");
    await assertNoDraftPersisted(boundary);
    await error.locator("a").click();
    await expect(source).toBeFocused();
    await expect(source).toHaveValue(boundary.value);
    await source.fill(SAFE_RECOVERY_QMD);
    await expect(surface.getByRole("region", { name: "Rendered preview" }))
      .toContainText("Current-session source recovered");
    await expect(surface.getByRole("button", { name: "Continue" })).toBeEnabled();
    await expect(surface.getByRole("button", { name: "Preview & add", exact: true })).toBeEnabled();
  }
}

async function expectBoundaryAbsentFromStorage(page, boundaryValue) {
  expect(await page.evaluate(({ key, value }) => (
    localStorage.getItem(key)?.includes(value) ?? false
  ), { key: STORAGE_KEY, value: boundaryValue })).toBe(false);
}

function tableWithColumns(count) {
  const header = Array.from({ length: count }, (_, index) => `C${index + 1}`);
  return `| ${header.join(" | ")} |\n| ${header.map(() => "---").join(" | ")} |\n| ${header.map(() => "x").join(" | ")} |`;
}

function tableWithRows(count) {
  const body = Array.from({ length: count - 1 }, (_, index) => `| R${index + 1} | yes |`);
  return `| Facility | Ready |\n| --- | --- |\n${body.join("\n")}`;
}

async function readSavedFreeText(page, title) {
  return page.evaluate(({ key, expectedTitle }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    if (!dashboard) return null;
    for (const pageItem of dashboard.pages ?? []) {
      for (const section of pageItem.sections ?? []) {
        for (const placement of section.panels ?? []) {
          const panel = placement.chart ?? placement;
          if (panel.title === expectedTitle) {
            return { panel, source: dashboard.dataSources[panel.sourceId] };
          }
        }
      }
    }
    return null;
  }, { key: STORAGE_KEY, expectedTitle: title });
}

async function readEmbeddedPublication(page, title) {
  return page.evaluate(({ key, expectedTitle }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
    const panels = (dashboard.pages ?? []).flatMap(({ sections = [] }) => sections)
      .flatMap(({ panels: placements = [] }) => placements)
      .map((placement) => placement.chart ?? placement)
      .filter((panel) => panel.title === expectedTitle);
    const panel = panels[0];
    const source = dashboard.dataSources?.[panel?.sourceId];
    const mediaIds = [...String(source?.qmd ?? "").matchAll(/simex-media:([^)\s}]+)/g)]
      .map((match) => match[1]);
    const media = dashboard.contentLibrary?.mediaItems?.[mediaIds[0]];
    const assetId = media?.current?.kind === "asset" ? media.current.assetId : null;
    return {
      placementCount: panels.length,
      panelId: panel?.id ?? null,
      sourceKind: source?.kind ?? null,
      qmd: source?.qmd ?? "",
      mediaId: mediaIds[0] ?? null,
      mediaCount: mediaIds.length,
      assetId,
      assetCount: assetId ? 1 : 0,
      assetState: dashboard.assets?.[assetId]?.storageState ?? null,
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

function canonicalPanel(page, panelId) {
  return page.locator(`[data-panel-id="${panelId}"][data-canonical-panel-id]`);
}

async function openFreeTextEditor(panel, page, title, preparedTrigger = null) {
  if (!preparedTrigger) await panel.hover();
  const trigger = preparedTrigger ?? panel.getByLabel(`${title} actions`)
    .getByRole("button", { name: "Edit chart" });
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Text/Image editor" })).toBeVisible();
}

async function prepareFreeTextEditorTrigger(panel, title) {
  await panel.hover();
  const trigger = panel.getByLabel(`${title} actions`)
    .getByRole("button", { name: "Edit chart" });
  await trigger.scrollIntoViewIfNeeded();
  await expect(trigger).toBeVisible();
  return trigger;
}

async function inspectBuildStaticState(page, panel) {
  return panel.evaluate((node) => {
    const frame = document.querySelector(".canonical-dashboard-frame.build-workspace");
    const content = node.querySelector(".free-text-chart-view");
    const rect = node.getBoundingClientRect();
    return {
      frameWidth: frame.getBoundingClientRect().width,
      footprint: node.getAttribute("data-footprint"),
      placementId: node.getAttribute("data-canonical-placement-id"),
      selected: node.classList.contains("selected"),
      panelWidth: rect.width,
      scrollLeft: window.scrollX,
      scrollTop: window.scrollY,
      contentScrollTop: content?.scrollTop ?? 0,
    };
  });
}

async function expectStaticEditorCompression(page, viewport, before) {
  const frame = page.locator(".canonical-dashboard-frame.build-workspace");
  await expect(frame).toHaveAttribute("data-build-static-authoring-open", "true");
  const openState = await page.evaluate(() => {
    const frameNode = document.querySelector(".canonical-dashboard-frame.build-workspace");
    return {
      frameWidth: frameNode.getBoundingClientRect().width,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  if (viewport.width >= 900) expect(openState.frameWidth).toBeLessThan(before.frameWidth - 80);
  else expect(Math.abs(openState.frameWidth - before.frameWidth)).toBeLessThan(1);
  expect(openState.documentWidth).toBeLessThanOrEqual(openState.viewportWidth);
}

async function expectBuildStaticRestored(page, panelId, before, { preserveContentScroll = true } = {}) {
  const frame = page.locator(".canonical-dashboard-frame.build-workspace");
  await expect(frame).toHaveAttribute("data-build-static-authoring-open", "false");
  const panel = canonicalPanel(page, panelId);
  await expect(panel).toBeInViewport({ ratio: 0.1 });
  const restored = await inspectBuildStaticState(page, panel);
  expect(restored.footprint).toBe(before.footprint);
  expect(restored.placementId).toBe(before.placementId);
  expect(restored.selected).toBe(true);
  expect(Math.abs(restored.frameWidth - before.frameWidth)).toBeLessThan(1);
  expect(Math.abs(restored.panelWidth - before.panelWidth)).toBeLessThan(1);
  if (preserveContentScroll) expect(restored.contentScrollTop).toBe(before.contentScrollTop);
}

async function inspectStaticComposition(surface) {
  return surface.evaluate((node) => {
    const panel = node.matches("[data-panel-id]") ? node : node.querySelector("[data-panel-id]");
    const view = node.querySelector(".free-text-chart-view");
    return {
      content: node.querySelector('[data-portable-qmd-sink="safe-dom"]')?.innerHTML ?? "",
      sourceId: view?.getAttribute("data-static-source-id") ?? null,
      sourceRevision: view?.getAttribute("data-static-source-revision") ?? null,
      footprint: panel?.getAttribute("data-footprint") ?? null,
      columns: panel ? getComputedStyle(panel).getPropertyValue("--chart-footprint-columns").trim() : null,
      rows: panel ? getComputedStyle(panel).getPropertyValue("--chart-footprint-rows").trim() : null,
      overflowY: view ? getComputedStyle(view).overflowY : null,
      authoringActionCount: node.querySelectorAll(".panel-actions").length,
    };
  });
}

async function expectProductionMathGeometry(panel) {
  const math = panel.locator(".portable-qmd-math");
  await expect(math).toHaveCount(4);
  const result = await math.evaluateAll((nodes) => {
    const negativeTop = (node) => [...node.querySelectorAll('[style*="top:"]')]
      .some((element) => Number.parseFloat(getComputedStyle(element).top) < 0);
    return {
      labels: nodes.map((node) => [node.getAttribute("role"), node.getAttribute("aria-label")]),
      structures: [
        nodes[0].querySelector(".msupsub") !== null,
        nodes[1].querySelector(".mfrac .frac-line") !== null,
        nodes[2].querySelector(".sqrt .hide-tail") !== null,
        nodes[3].querySelector(".mop.op-symbol") !== null,
      ],
      visual: nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return { width: rect.width, height: rect.height, negativeTop: negativeTop(node) };
      }),
      generatedStyleCount: nodes.reduce((count, node) => count + node.querySelectorAll("[style]").length, 0),
      forbiddenForeign: nodes.reduce((count, node) => count + node.querySelectorAll("math,style,img,link").length, 0),
      trustedVectors: nodes.flatMap((node) => [...node.querySelectorAll("svg")]).map((node) => ({
        generated: node.closest('[data-portable-qmd-generated="math"]') !== null,
        resourceAttributes: node.querySelectorAll("[href],[src],[xlink\\:href]").length
          + (node.matches("[href],[src],[xlink\\:href]") ? 1 : 0),
      })),
    };
  });
  expect(result.labels).toEqual([
    ["math", "x^2"],
    ["math", "\\frac{a}{b}"],
    ["math", "\\sqrt{x}"],
    ["math", "\\sum_{i=1}^{n} i"],
  ]);
  expect(result.structures).toEqual([true, true, true, true]);
  expect(result.visual.every(({ width, height, negativeTop }) => width > 0 && height > 0 && negativeTop)).toBe(true);
  expect(result.generatedStyleCount).toBeGreaterThan(0);
  expect(result.forbiddenForeign).toBe(0);
  expect(result.trustedVectors.length).toBeGreaterThan(0);
  expect(result.trustedVectors.every(({ generated, resourceAttributes }) => generated && resourceAttributes === 0)).toBe(true);
}

async function expectInertAuthoredSurface(surface, heading) {
  const authored = surface.locator('[data-portable-qmd-sink="safe-dom"]');
  await expect(authored).toHaveCount(1);
  await expect(authored).toContainText(heading);
  await expect(authored).toContainText(/<script[^>]*>window\.authoredCodeRan = true<\/script>/);
  await expect(authored).toContainText(/<iframe src="https:\/\/example\.test\//);
  await expect(authored).toContainText(/!\[remote media\]\(https:\/\/example\.test\//);
  await expect(authored).toContainText(/custom-widget|widget unsafe/);
  await expect(authored).toContainText(/python echo=true/);
  await expect(authored.locator("script,iframe,img,video,audio,object,embed,form,button,[src],[srcset],[poster]")).toHaveCount(0);
  await expect(authored.locator("[onclick],[onerror],[onload],[onmouseover],[style]")).toHaveCount(0);
}
