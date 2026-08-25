import { expect, test } from "@playwright/test";

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
].join("\n");

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
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
    await prepareFreeTextEditorTrigger(panel, title);
    const beforeDiscard = await inspectBuildStaticState(page, panel);

    await openFreeTextEditor(panel, page, title);
    let editor = page.getByRole("dialog", { name: "Edit static content" });
    await expectStaticEditorCompression(page, viewport, beforeDiscard);
    const editorSource = editor.getByLabel("QMD-style source");
    await editorSource.fill(INERT_QMD);
    await expect(editor.getByRole("status")).toContainText("Preview is up to date");
    await expect(editor.getByRole("button", { name: "Continue" })).toBeEnabled();
    await expect(editor.getByRole("button", { name: "Preview & add", exact: true })).toBeEnabled();
    await expectInertAuthoredSurface(editor.locator('[data-free-text-pane="preview"]'), "Cancelled copy");
    expect(await page.evaluate(() => window.authoredCodeRan)).toBeUndefined();
    expect(authoredResourceRequests).toEqual([]);
    expect((await readSavedFreeText(page, title)).source.qmd).toBe(INITIAL_QMD);
    await editor.getByRole("button", { name: "Cancel", exact: true }).click();
    let confirmation = page.getByRole("dialog", { name: "Discard static content changes?" });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole("button", { name: "Keep editing" }).click();
    await expect(editorSource).toHaveValue(/Cancelled copy/);
    await editor.getByRole("button", { name: "Cancel", exact: true }).click();
    confirmation = page.getByRole("dialog", { name: "Discard static content changes?" });
    await confirmation.getByRole("button", { name: "Discard" }).click();
    await expect(editor).toHaveCount(0);
    expect((await readSavedFreeText(page, title)).source.qmd).toBe(INITIAL_QMD);
    await expectBuildStaticRestored(page, saved.panel.id, beforeDiscard);

    panel = canonicalPanel(page, saved.panel.id);
    await panel.scrollIntoViewIfNeeded();
    await prepareFreeTextEditorTrigger(panel, title);
    const beforeSave = await inspectBuildStaticState(page, panel);
    await openFreeTextEditor(panel, page, title);
    editor = page.getByRole("dialog", { name: "Edit static content" });
    await expectStaticEditorCompression(page, viewport, beforeSave);
    await editor.getByLabel("QMD-style source").fill(SAVED_QMD);
    await expect(editor.getByRole("status")).toContainText("Preview is up to date");
    await editor.getByRole("button", { name: "Continue" }).click();
    await expect(editor.getByLabel("Canonical static content preview")).toContainText("Updated priorities");
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
    expect(buildComposition.sourceRevision).toBe("2");
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
    expect(fullscreenComposition.content).toBe(viewComposition.content);
    expect(fullscreenComposition.sourceRevision).toBe(viewComposition.sourceRevision);
    expect(fullscreenComposition.overflowY).toBe("auto");
    expect(fullscreenComposition.authoringActionCount).toBe(0);
    expect(authoredResourceRequests).toEqual([]);
    await fullscreen.getByRole("button", { name: "Exit focus" }).click();
    await expect(panel.getByRole("button", { name: "Focus chart" })).toBeFocused();

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
    await page.locator(".dashboard-command-page-scroller")
      .getByRole("button", { name: "Biomedical", exact: true }).click();
    const reloaded = await readSavedFreeText(page, "Reload handoff field guide");
    expect(reloaded.source.qmd).toBe(INITIAL_QMD);
    expect(reloaded.source.revision).toBe(1);
    const panel = canonicalPanel(page, reloaded.panel.id);
    await panel.scrollIntoViewIfNeeded();
    await expect(panel).toContainText("Operational priorities");
  },
);

async function openBiomedicalBuild(page) {
  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true }).click();
}

async function createFreeText(page, { title, qmd, viewport }) {
  await page.getByRole("button", { name: "Add static content", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add static content" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Free text").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Panel title").fill(title);
  const source = wizard.getByLabel("QMD-style source");
  await source.fill(qmd);
  await expect(wizard.getByRole("status")).toContainText("Preview is up to date");

  const sourceEditor = wizard.locator(".free-text-source-editor");
  if (viewport.width <= 860) {
    await expect(sourceEditor).toHaveAttribute("data-layout", "tabs");
    await expect(wizard.getByRole("tab", { name: "Source" })).toHaveAttribute("aria-selected", "true");
    await wizard.getByRole("tab", { name: "Preview" }).click();
    await expect(wizard.getByRole("tabpanel", { name: "Preview" })).toContainText("Operational priorities");
    await wizard.getByRole("tab", { name: "Source" }).click();
    await expect(source).toBeVisible();
    await source.focus();
    await expect(source).toBeFocused();
  } else {
    await expect(sourceEditor).toHaveAttribute("data-layout", "split");
    await expect(wizard.getByRole("tabpanel", { name: "Preview" })).toContainText("Operational priorities");
    await expect(wizard.getByRole("tablist", { name: "Free text editor panes" })).toBeHidden();
  }

  await wizard.getByRole("button", { name: "Continue" }).click();
  await expect(wizard.getByLabel("Canonical static content preview")).toContainText("Operational priorities");
  await wizard.getByRole("button", { name: "Add", exact: true }).click();
  await expect(wizard).toHaveCount(0);
}

async function readSavedFreeText(page, title) {
  return page.evaluate(({ key, expectedTitle }) => {
    const dashboard = JSON.parse(localStorage.getItem(key));
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

function canonicalPanel(page, panelId) {
  return page.locator(`[data-panel-id="${panelId}"][data-canonical-panel-id]`);
}

async function openFreeTextEditor(panel, page, title) {
  await panel.getByLabel(`${title} actions`)
    .getByRole("button", { name: "Edit chart" }).click();
  await expect(page.getByRole("dialog", { name: "Edit static content" })).toBeVisible();
}

async function prepareFreeTextEditorTrigger(panel, title) {
  await panel.hover();
  const trigger = panel.getByLabel(`${title} actions`)
    .getByRole("button", { name: "Edit chart" });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.focus();
  await expect(trigger).toBeFocused();
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

async function expectBuildStaticRestored(page, panelId, before, { preserveContentScroll = true } = {}) {
  const frame = page.locator(".canonical-dashboard-frame.build-workspace");
  await expect(frame).toHaveAttribute("data-build-static-authoring-open", "false");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(before.scrollTop);
  await expect.poll(() => page.evaluate((placementId) => (
    document.activeElement?.getAttribute("data-build-edit-for") === placementId
  ), before.placementId)).toBe(true);
  const panel = canonicalPanel(page, panelId);
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
