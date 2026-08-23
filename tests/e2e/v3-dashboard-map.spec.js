import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("Build commands stay available while Dashboard map controls only structure context", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();

  const commands = page.getByRole("region", { name: "Build commands" });
  const mapToggle = page.getByRole("button", { name: "Dashboard map", exact: true });
  await expect(commands).toBeVisible();
  await expect(page.getByRole("button", { name: "Chrono Groups", exact: true })).toHaveCount(0);
  await expect(mapToggle).toHaveAttribute("aria-controls", "dashboard-map-panel");
  const commandGeometry = await commands.locator("[data-build-command-group]").evaluateAll((groups) => groups.map((group) => {
    const rect = group.getBoundingClientRect();
    return { name: group.dataset.buildCommandGroup, top: rect.top, bottom: rect.bottom };
  }));
  const commandBox = await commands.boundingBox();
  const contentGroup = commandGeometry.find(({ name }) => name === "content");
  const timeGroup = commandGeometry.find(({ name }) => name === "time");
  const sessionGroup = commandGeometry.find(({ name }) => name === "session");
  const layoutGroup = commandGeometry.find(({ name }) => name === "layout");
  expect(Math.max(contentGroup.top, timeGroup.top, sessionGroup.top) - Math.min(contentGroup.top, timeGroup.top, sessionGroup.top)).toBeLessThanOrEqual(1);
  expect(layoutGroup.top).toBeGreaterThanOrEqual(Math.max(contentGroup.bottom, timeGroup.bottom, sessionGroup.bottom));
  expect(commandBox.height).toBeLessThanOrEqual(170);

  await mapToggle.click();
  const map = page.getByRole("complementary", { name: "Dashboard map" });
  await expect(map).toBeVisible();
  await expect(commands).toBeVisible();
  await expect(map.getByRole("navigation", { name: "Dashboard structure" })).toBeVisible();

  await map.getByRole("button", { name: "Inspector", exact: true }).click();
  await expect(map.getByRole("region", { name: "Context inspector" })).toBeVisible();
  await expect(map.getByRole("navigation", { name: "Dashboard structure" })).toHaveCount(0);

  await mapToggle.click();
  await expect(map).toBeHidden();
  await expect(commands).toBeVisible();
});

test("Dashboard map keeps visible disclosure arrows and caret-aligned branch guides", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();

  const map = page.getByRole("complementary", { name: "Dashboard map" });
  const home = map.getByRole("treeitem", { name: "Home", exact: true });
  const collapse = home.getByRole("button", { name: "Collapse Home", exact: true });
  await expect(collapse).toBeVisible();

  const expandedEvidence = await home.evaluate((item) => {
    const row = item.querySelector(":scope > .build-tree-row");
    const caret = row.querySelector(".build-tree-caret");
    const glyph = caret.querySelector("span");
    const group = item.querySelector(":scope > .build-tree-group");
    const child = group.querySelector(":scope > .build-tree-item-wrap");
    const sheet = item.closest(".build-side-sheet");
    const parseRgb = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number);
    const luminance = (value) => parseRgb(value)
      .map((channel) => channel / 255)
      .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const contrast = (first, second) => {
      const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
      return (lighter + 0.05) / (darker + 0.05);
    };
    const rowRect = row.getBoundingClientRect();
    const childRect = child.getBoundingClientRect();
    const rowBefore = getComputedStyle(row, "::before");
    const childAfter = getComputedStyle(child, "::after");
    const sheetStyle = getComputedStyle(sheet);
    const glyphStyle = getComputedStyle(glyph);
    const itemStyle = getComputedStyle(item);
    return {
      disclosureContrast: contrast(glyphStyle.borderRightColor, sheetStyle.backgroundColor),
      textContrast: contrast(itemStyle.color, sheetStyle.backgroundColor),
      parentGuideBorder: rowBefore.borderLeftWidth,
      parentGuideX: rowRect.left + Number.parseFloat(rowBefore.left),
      parentCaretCenterX: rowRect.left + caret.getBoundingClientRect().width / 2,
      childGuideBorder: childAfter.borderLeftWidth,
      childGuideX: childRect.left + Number.parseFloat(childAfter.left),
    };
  });

  expect(expandedEvidence.disclosureContrast).toBeGreaterThanOrEqual(3);
  expect(expandedEvidence.textContrast).toBeGreaterThanOrEqual(4.5);
  expect(expandedEvidence.parentGuideBorder).not.toBe("0px");
  expect(expandedEvidence.childGuideBorder).not.toBe("0px");
  expect(Math.abs(expandedEvidence.parentGuideX - expandedEvidence.parentCaretCenterX)).toBeLessThanOrEqual(1);
  expect(Math.abs(expandedEvidence.childGuideX - expandedEvidence.parentCaretCenterX)).toBeLessThanOrEqual(1);

  const expandedTransform = await collapse.locator("span").evaluate((glyph) => getComputedStyle(glyph).transform);
  await collapse.click();
  const expand = home.getByRole("button", { name: "Expand Home", exact: true });
  await expect(expand).toBeVisible();
  const collapsedTransform = await expand.locator("span").evaluate((glyph) => getComputedStyle(glyph).transform);
  expect(collapsedTransform).not.toBe(expandedTransform);
});
