import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";

test.use({
  storageState: { cookies: [], origins: [] },
  viewport: { width: 1440, height: 1200 },
  reducedMotion: "reduce",
  // Headless Chromium otherwise hides the width-consuming scrollbars involved
  // in the practitioner's native-browser feedback loop.
  launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] },
});

test("Quick editor expands Actual to the chart width and keeps Fit stable across scrollbar transitions", async ({ page, request }) => {
  test.setTimeout(90_000);
  const response = await request.get("/config/dashboard.json");
  expect(createHash("sha256").update(await response.body()).digest("hex"))
    .toBe("a6092faf3463389fea17934c005f74802c9c843abcecfb31272221a2fea11f2f");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const scrollbarWidth = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;left:-1000px;width:100px;height:10px;overflow:scroll";
    document.body.append(probe);
    const width = probe.offsetWidth - probe.clientWidth;
    probe.remove();
    return width;
  });
  expect(scrollbarWidth, "regression requires width-consuming native scrollbars").toBeGreaterThan(0);
  await page.getByRole("button", { name: "Open the dashboard", exact: true }).click({ noWaitAfter: true });
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click({ noWaitAfter: true });
  await page.getByRole("treeitem", { name: "Reproduction value", exact: true }).click();
  const quick = page.locator(".chart-quick-editor");
  const stage = quick.locator(".authoring-stage");
  const scroller = page.locator(".unit-orbit-scroll");
  const destination = page.locator('[data-canonical-page-id] [data-canonical-panel-id="bio_r_values"]');
  await expect(stage).toHaveClass(/chart-authoring-preview-ready/);
  await page.evaluate(() => document.fonts.ready);
  await sameGeometry(stage, destination);
  const fitWidth = await scroller.evaluate(el => el.clientWidth);

  await stage.getByRole("button", { name: "Actual size on dashboard", exact: true }).click();
  await expect(stage).toHaveAttribute("data-stage-scale", "1");
  await actualFits(stage);
  expect(await scroller.evaluate(el => el.clientWidth)).toBeGreaterThan(fitWidth);
  await sameGeometry(stage, destination);
  await stableSizing(stage);

  await stage.getByRole("button", { name: "Fit to preview area", exact: true }).click();
  await expect.poll(() => scroller.evaluate(el => el.clientWidth)).toBe(fitWidth);
  await sameGeometry(stage, destination);
  await stableSizing(stage);
  await quick.locator("#chart-footprint-width").selectOption({ value: "4" });
  await quick.locator("#chart-footprint-row-height").selectOption({ value: "0.5" });
  await expect(stage).toHaveAttribute("data-stage-height", "201");
  await sameGeometry(stage, destination);
  await stableSizing(stage);
  await stage.getByRole("button", { name: "Actual size on dashboard", exact: true }).click();
  await actualFits(stage);
  await sameGeometry(stage, destination);
  await stableSizing(stage);

  // Constrain height without changing the width of the destination canvas.
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(() => scroller.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  await actualFits(stage);
  await stableSizing(stage);
  expect(await scroller.evaluate(el => { el.scrollTop = el.scrollHeight; return el.scrollTop; })).toBeGreaterThan(0);
  await quick.locator("#chart-footprint-row-height").scrollIntoViewIfNeeded();
  await expect(quick.locator("#chart-footprint-row-height")).toBeVisible();
  await stage.getByRole("button", { name: "Fit to preview area", exact: true }).click();
  await expect.poll(() => scroller.evaluate(el => el.clientWidth)).toBe(fitWidth);
  await stableSizing(stage);
  await expect(quick).toHaveAttribute("data-chart-edit-dirty", "true");
});

async function actualFits(stage) {
  await expect.poll(() => stage.evaluate(el => {
    if (el.dataset.stageFit === "actual") return Math.abs(1 - Number(el.dataset.stageScale));
    const viewport = el.querySelector(".authoring-stage__viewport");
    return Number(el.dataset.stageWidth) - viewport.clientWidth;
  })).toBeLessThanOrEqual(1);
  expect(await stage.locator(".authoring-stage__viewport").evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  const orbit = stage.page().locator(".unit-orbit");
  await expect.poll(() => orbit.evaluate(el => {
    const box = el.getBoundingClientRect();
    return Math.max(12 - box.left, box.right - (window.innerWidth - 12));
  })).toBeLessThanOrEqual(1);
}

async function sameGeometry(stage, destination) {
  await expect.poll(async () => {
    const box = await destination.boundingBox();
    const size = await stage.evaluate(el => ({ width: Number(el.dataset.stageWidth), height: Number(el.dataset.stageHeight) }));
    return Math.max(Math.abs(box.width - size.width), Math.abs(box.height - size.height));
  }).toBeLessThan(1);
}

async function stableSizing(stage) {
  // Let the destination observer and its scaled preview settle, then inspect
  // consecutive actual layouts rather than accepting one fortunate sample.
  await expect.poll(() => stage.evaluate(el => {
    const viewport = el.querySelector(".authoring-stage__viewport");
    const expectedScale = el.dataset.stageFit === "actual" ? 1 : viewport.clientWidth / Number(el.dataset.stageWidth);
    return Math.abs(expectedScale - Number(el.dataset.stageScale));
  })).toBeLessThan(0.002);
  const samples = await stage.evaluate(async el => {
    const scroller = el.closest(".unit-orbit-scroll");
    const result = [];
    for (let i = 0; i < 30; i++) {
      await new Promise(requestAnimationFrame);
      result.push([scroller.clientWidth, scroller.clientHeight, scroller.scrollHeight,
        el.getBoundingClientRect().height, Number(el.dataset.stageScale)]);
    }
    return result;
  });
  for (let dimension = 0; dimension < samples[0].length; dimension++) {
    const values = samples.map(sample => sample[dimension]);
    expect(Math.max(...values) - Math.min(...values), JSON.stringify(samples)).toBeLessThan(0.01);
  }
}


test("quick editor manual positions survive edits scroll reopen and object switching", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await page.getByRole("button", { name: "Open the dashboard", exact: true }).click();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("treeitem", { name: "Reproduction value", exact: true }).click();
  const orbit = page.locator(".unit-orbit");
  const quick = page.locator(".chart-quick-editor");
  await expect(quick).toBeVisible();
  const buttons = quick.locator(".chart-editor-actions button");
  await expect(buttons.nth(0)).toHaveAccessibleName("Move quick editor");
  await expect(buttons.nth(1)).toHaveAccessibleName("Open full editor");
  const handle = quick.getByRole("button", { name: "Move quick editor", exact: true });
  const saved = await page.evaluate(() => localStorage.getItem("simex-dashboard-config-v3-three-mode-v1"));
  await dragHandle(page, handle, -50, 50);
  await expect(orbit).toHaveAttribute("data-unit-orbit-side", "manual");
  const moved = await localEditorPosition(orbit);
  await quick.getByRole("textbox", { name: "Chart title", exact: true }).fill("Retained manual position");
  await nearLocal(orbit, moved);
  const scroll = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => window.scrollBy(0, 200));
  await nearLocal(orbit, moved);
  await page.evaluate((y) => window.scrollTo(0, y), scroll);
  await nearLocal(orbit, moved);
  await quick.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("treeitem", { name: "Reproduction value", exact: true }).click();
  await expect(quick.getByRole("textbox", { name: "Chart title", exact: true })).toHaveValue("Retained manual position");
  await nearLocal(orbit, moved);
  // Reset authored changes independently from the editor position.
  await quick.getByRole("button", { name: "Reset", exact: true }).click();
  await nearLocal(orbit, moved);
  await quick.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Page settings", exact: true }).click();
  const object = page.locator(".object-quick-editor");
  const objectHandle = object.getByRole("button", { name: "Move quick editor", exact: true });
  await expect(object.locator(".chart-editor-actions button").first()).toHaveAccessibleName("Move quick editor");
  await dragHandle(page, objectHandle, -80, 40);
  const pageMoved = await localEditorPosition(orbit);
  await objectHandle.press("ArrowRight");
  await expect.poll(async () => (await localEditorPosition(orbit)).x - pageMoved.x).toBeCloseTo(10, 0);
  await objectHandle.press("Escape");
  await nearLocal(orbit, pageMoved);
  // Pointer cancellation restores the last retained position.
  const box = await objectHandle.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 70, box.y + 50, { steps: 6 });
  await objectHandle.press("Escape");
  await page.mouse.up();
  await nearLocal(orbit, pageMoved);
  await object.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("treeitem", { name: "Reproduction value", exact: true }).click();
  await nearLocal(orbit, moved);
  expect(await page.evaluate(() => localStorage.getItem("simex-dashboard-config-v3-three-mode-v1"))).toBe(saved);
  await page.setViewportSize({ width: 900, height: 900 });
  await expect(handle).toBeInViewport();
  await orbit.getByRole("button", { name: "Reset editor position", exact: true }).click();
  await expect(orbit).not.toHaveAttribute("data-unit-orbit-side", "manual");
});

async function dragHandle(page, handle, dx, dy) {
  const box = await handle.boundingBox();
  expect(box).toBeTruthy();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  await page.mouse.up();
}

async function localEditorPosition(orbit) {
  return orbit.evaluate(el => {
    const box = el.getBoundingClientRect();
    const canvas = document.querySelector("[data-canonical-canvas-id]");
    const rect = canvas.getBoundingClientRect();
    return { x: (box.left - rect.left) / (rect.width / canvas.offsetWidth), y: (box.top - rect.top) / (rect.height / canvas.offsetHeight) };
  });
}

async function nearLocal(orbit, expected) {
  await expect.poll(async () => {
    const point = await localEditorPosition(orbit);
    return Math.max(Math.abs(point.x - expected.x), Math.abs(point.y - expected.y));
  }).toBeLessThan(2);
}


test("quick editor position survives save Build reset and interrupted full-editor transfer", async ({ page }) => {
  test.setTimeout(75_000);
  await page.goto("/");
  await page.getByRole("button", { name: "Open the dashboard", exact: true }).click();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("treeitem", { name: "Reproduction value", exact: true }).click();
  const quick = page.locator(".chart-quick-editor");
  const orbit = page.locator(".unit-orbit");
  const handle = quick.getByRole("button", { name: "Move quick editor", exact: true });
  await dragHandle(page, handle, -40, 40);
  const retained = await localEditorPosition(orbit);
  await quick.getByRole("textbox", { name: "Chart title", exact: true }).fill("Position retention chart");
  await quick.getByRole("button", { name: "Save", exact: true }).click();
  await expect(quick).toHaveCount(0);
  await page.getByRole("treeitem", { name: "Position retention chart", exact: true }).click();
  await nearLocal(orbit, retained);
  const box = await handle.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 60, { steps: 5 });
  const fullButton = quick.getByRole("button", { name: "Open full editor", exact: true });
  await fullButton.focus();
  await fullButton.press("Enter");
  await page.mouse.up();
  const full = page.getByRole("dialog", { name: "Edit chart", exact: true });
  await expect(full).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(full).toBeHidden();
  await page.getByRole("treeitem", { name: "Position retention chart", exact: true }).click();
  await nearLocal(orbit, retained);
  await quick.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Discard Build changes", exact: true }).click();
  await page.getByRole("dialog", { name: "Discard Build changes?", exact: true })
    .getByRole("button", { name: "Discard Build changes", exact: true }).click();
  await page.getByRole("treeitem", { name: "Reproduction value", exact: true }).click();
  await nearLocal(orbit, retained);
});
