import { expect, test } from "@playwright/test";

import { enterAuthoredDashboard } from "./support/landingWorkflow.js";

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
    return {
      name: group.dataset.buildCommandGroup,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
    };
  }));
  const contentGroup = commandGeometry.find(({ name }) => name === "content");
  const structureGroup = commandGeometry.find(({ name }) => name === "structure");
  const timeCommands = commandGeometry.find(({ name }) => name === "time");
  const packageGroup = commandGeometry.find(({ name }) => name === "package");
  const sessionGroup = commandGeometry.find(({ name }) => name === "session");
  const layoutGroup = commandGeometry.find(({ name }) => name === "layout");
  const primaryGroups = [contentGroup, structureGroup, timeCommands, packageGroup, sessionGroup];
  expect(primaryGroups.every(Boolean)).toBe(true);
  const overlaps = primaryGroups.flatMap((group, index) => primaryGroups.slice(index + 1)
    .filter((candidate) => (
      group.left < candidate.right
      && group.right > candidate.left
      && group.top < candidate.bottom
      && group.bottom > candidate.top
    ))
    .map((candidate) => `${group.name}:${candidate.name}`));
  expect(overlaps).toEqual([]);
  expect(layoutGroup.top).toBeGreaterThanOrEqual(Math.max(...primaryGroups.map(({ bottom }) => bottom)));

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

test("create page and inline rename acquire only the dashboard layout draft", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await enterAuthoredDashboard(page);
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();

  const map = page.getByRole("complementary", { name: "Dashboard map" });
  const tree = map.getByRole("tree");
  const addPage = page.locator('[data-build-page-navigation="anchored"]')
    .getByRole("button", { name: "Add page", exact: true });
  await addPage.click();
  let createDialog = page.getByRole("dialog", { name: "Create Page" });
  await createDialog.getByLabel("Page name").fill("   ");
  await createDialog.getByRole("button", { name: "Create page", exact: true }).click();
  await expect(createDialog.getByRole("alert")).toContainText("Enter a Page name");
  await expect(page.locator('[data-pending-work-kind="layout"]')).toHaveCount(0);
  await createDialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(addPage).toBeFocused();
  await expect(page.locator('[data-pending-work-kind="layout"]')).toHaveCount(0);

  await addPage.click();
  createDialog = page.getByRole("dialog", { name: "Create Page" });
  await createDialog.getByLabel("Page name").fill("Operations");
  await createDialog.getByRole("button", { name: "Create page", exact: true }).click();
  await expect(page.locator('[data-build-page-navigation="anchored"]')
    .getByRole("button", { name: "Operations", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add section", exact: true }).click();
  createDialog = page.getByRole("dialog", { name: "Create Section" });
  await createDialog.getByLabel("Section name").fill("Signals");
  await createDialog.getByRole("button", { name: "Create section", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit Section title: Signals", exact: true })).toBeVisible();
  await expect(page.locator('[data-pending-work-kind="layout"]')).toHaveCount(1);

  const pageItem = tree.locator('[data-build-node-kind="page"][aria-label="Socio-economic"]');
  await pageItem.focus();
  await pageItem.press("F2");
  const rename = tree.getByRole("textbox", { name: "Rename page Socio-economic" });
  await rename.fill("   ");
  await rename.press("Escape");
  await expect(page.locator('[data-pending-work-kind="inlineRename"]')).toHaveCount(0);

  await pageItem.focus();
  await pageItem.press("F2");
  await tree.getByRole("textbox", { name: "Rename page Socio-economic" }).fill("Community response");
  await tree.getByRole("textbox", { name: "Rename page Socio-economic" }).press("Enter");
  await expect(tree.locator('[data-build-node-kind="page"][aria-label="Community response"]')).toBeVisible();
  await expect(page.locator('[data-pending-work-kind="layout"]')).toHaveCount(1);
  await expect(page.locator('[data-pending-work-kind="inlineRename"]')).toHaveCount(0);

  await map.getByRole("button", { name: "Structure", exact: true }).click();
  const operationsNode = map.getByRole("tree").locator('[data-build-node-kind="page"][aria-label="Operations"]');
  await expect(operationsNode).toBeVisible();
  await operationsNode.getByRole("button", { name: "Expand Operations", exact: true }).click();
  await expect(map.getByRole("tree").locator('[data-build-node-kind="section"][aria-label="Signals"]')).toBeVisible();
  await expect(page.locator('[data-pending-work-kind="layout"]')).toHaveCount(1);
});

test("native drag, keyboard move and Move panel dialog share the layout owner and restore focus", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await enterAuthoredDashboard(page);
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();

  const map = page.getByRole("complementary", { name: "Dashboard map" });
  const tree = map.getByRole("tree");
  await tree.getByRole("button", { name: "Collapse Biomedical", exact: true }).click();
  await tree.getByRole("button", { name: "Collapse Socio-economic", exact: true }).click();
  const biomedical = tree.locator('[data-build-node-kind="page"][aria-label="Biomedical"]');
  const mapDragHandle = tree.getByRole("button", { name: "Move page Biomedical", exact: true });
  const socioEconomic = tree.locator('[data-build-node-kind="page"][aria-label="Socio-economic"]');
  const before = await tree.locator('[data-build-node-kind="page"]').evaluateAll((items) => items.map((item) => item.getAttribute("aria-label")));
  const targetBox = await socioEconomic.boundingBox();
  expect(targetBox).toBeTruthy();
  await mapDragHandle.dragTo(socioEconomic, { targetPosition: { x: 40, y: targetBox.height - 2 } });
  const afterDrag = await tree.locator('[data-build-node-kind="page"]').evaluateAll((items) => items.map((item) => item.getAttribute("aria-label")));
  expect(afterDrag).not.toEqual(before);
  await biomedical.focus();
  await biomedical.press("Alt+ArrowUp");
  const after = await tree.locator('[data-build-node-kind="page"]').evaluateAll((items) => items.map((item) => item.getAttribute("aria-label")));
  expect(after).not.toEqual(afterDrag);
  await expect(page.locator('[data-pending-work-kind="layout"]')).toHaveCount(1);

  await tree.getByRole("button", { name: "Expand Biomedical", exact: true }).click();
  const moveHandle = tree.getByRole("button", { name: /^Move panel / }).first();
  await moveHandle.click();
  const dialog = page.getByRole("dialog", { name: /^Move / });
  await expect(dialog.getByLabel("Destination")).toBeFocused();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(moveHandle).toBeFocused();
});
