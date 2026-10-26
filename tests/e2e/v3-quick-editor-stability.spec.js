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

  await stage.getByRole("button", { name: "Actual", exact: true }).click();
  await expect(stage).toHaveAttribute("data-stage-scale", "1");
  await actualFits(stage);
  expect(await scroller.evaluate(el => el.clientWidth)).toBeGreaterThan(fitWidth);
  await sameGeometry(stage, destination);
  await stableSizing(stage);

  await stage.getByRole("button", { name: "Fit", exact: true }).click();
  await expect.poll(() => scroller.evaluate(el => el.clientWidth)).toBe(fitWidth);
  await sameGeometry(stage, destination);
  await stableSizing(stage);
  await quick.locator("#chart-footprint-width").selectOption({ value: "4" });
  await quick.locator("#chart-footprint-row-height").selectOption({ value: "0.5" });
  await expect(stage).toHaveAttribute("data-stage-height", "201");
  await sameGeometry(stage, destination);
  await stableSizing(stage);
  await stage.getByRole("button", { name: "Actual", exact: true }).click();
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
  await stage.getByRole("button", { name: "Fit", exact: true }).click();
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
    return Math.abs(viewport.clientWidth / Number(el.dataset.stageWidth) - Number(el.dataset.stageScale));
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
