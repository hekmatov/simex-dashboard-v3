import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { collaboratorPackage } from "../helpers/dashboardPackageFixtures.js";
import { serializeDashboardBundle } from "../../src/charting/config/dashboardBundleV3.js";
import { enterBuildMode, chooseWholeDashboardPackage, chooseDashboardPackageDestinations, choosePanelAction } from "./support/buildWorkflow.js";
import { openDashboardPage } from "./support/landingWorkflow.js";

const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";

test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:4174/__test__/reset");
  await request.post("http://127.0.0.1:4174/__test__/catalogue-mode", { data: { mode: "absent" } });
});

test("same-baseline authors combine one chart without replacing local data and round-trip the result", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await openBuild(page);
  await loadWhole(page, collaboratorPackage({ value: 4 }));
  const before = await stored(page);
  const review = await inspect(page, collaboratorPackage({ value: 99 }));
  await expect(review.getByRole("radio", { name: "Partial Append", exact: true })).toBeChecked();
  await expect(review.getByRole("button", { name: "Import selected", exact: true })).toBeDisabled();
  await review.getByRole("checkbox", { name: "Import panel: Cases", exact: true }).check();
  await expect(review.getByRole("button", { name: "Import selected", exact: true })).toBeEnabled();
  await review.getByRole("button", { name: "Import selected", exact: true }).click();
  await chooseDashboardPackageDestinations(page, [{ pageId: "overview", sectionId: "signals" }]);
  await expect(review).toHaveCount(0);
  const combined = await stored(page);
  const panels = combined.pages[0].sections[0].panels;
  expect(panels).toHaveLength(3);
  expect(panels.slice(0, 2)).toEqual(before.pages[0].sections[0].panels);
  const copied = panels[2];
  expect(copied.id).not.toBe(copied.chart.id);
  expect(copied.chart.sourceId).not.toBe("cases");
  expect(copied.chart.title).toBe("Cases (imported)");
  await page.reload();
  await expect(page.getByRole("treeitem", { name: "Cases (imported)", exact: true })).toBeVisible();
  const exported = await downloadPackage(page);
  expect(exported.config.dataSources.cases.csvText).toContain("2026-08-21,4");
  expect(exported.config.dataSources[copied.chart.sourceId].csvText).toContain("2026-08-21,99");
  const context = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    const other = await context.newPage();
    await openBuild(other);
    await loadWhole(other, exported, true);
    expect((await stored(other)).pages[0].sections[0].panels).toHaveLength(3);
    await other.reload();
    await expect(other.getByRole("treeitem", { name: "Cases (imported)", exact: true })).toBeVisible();
  } finally { await context.close(); }
});

async function openBuild(page) {
  await page.setViewportSize({ width: 1365, height: 1000 });
  await page.goto("/");
  await enterBuildMode(page);
}

async function inspect(page, candidate, envelope = false) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Load dashboard package", exact: true }).click();
  const bundle = envelope ? candidate : serializeDashboardBundle(candidate.config, { assetPayloads: candidate.assetPayloads });
  await (await chooser).setFiles({ name: "collaborator.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(bundle)) });
  const review = page.getByRole("dialog", { name: "Review package contents", exact: true });
  await expect(review).toBeVisible();
  return review;
}

async function loadWhole(page, candidate, envelope = false) {
  const review = await inspect(page, candidate, envelope);
  await chooseWholeDashboardPackage(review);
  await review.getByRole("button", { name: "Load package", exact: true }).click();
  await expect(review).toHaveCount(0);
}

async function stored(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY); }

async function downloadPackage(page) {
  await page.locator(".dashboard-scenario-trigger").click();
  const passport = page.getByRole("complementary", { name: "Scenario Passport" });
  page.once("dialog", dialog => dialog.accept("combined-authors"));
  const [download] = await Promise.all([page.waitForEvent("download"), passport.getByRole("button", { name: "Download Dashboard Package", exact: true }).click()]);
  return JSON.parse(await readFile(await download.path(), "utf8"));
}


test("package inspection keeps a dirty chart and selection stable while filtering", async ({ page }) => {
  test.setTimeout(45_000);
  await openBuild(page);
  await page.getByRole("treeitem", { name: "National Confirmed Cases (cumulative)", exact: true }).click();
  const quick = page.locator(".chart-quick-editor");
  await quick.getByRole("textbox", { name: "Chart title", exact: true }).fill("Keep this unrelated draft");
  const before = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
  const review = await inspect(page, collaboratorPackage({ value: 99 }));
  await expect(review.getByRole("radio", { name: "Partial Append", exact: true })).toBeChecked();
  await review.getByRole("checkbox", { name: "Import panel: Cases", exact: true }).check();
  await review.getByLabel("Search package", { exact: true }).fill("no matching object");
  await expect(review.getByRole("button", { name: "Import selected", exact: true })).toBeEnabled();
  await review.getByLabel("Search package", { exact: true }).fill("");
  await expect(review.getByRole("checkbox", { name: "Import panel: Cases", exact: true })).toBeChecked();
  await review.getByRole("checkbox", { name: "Import panel: Cases", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(review).toHaveCount(0);
  await page.getByRole("treeitem", { name: "National Confirmed Cases (cumulative)", exact: true }).click();
  await expect(quick.getByRole("textbox", { name: "Chart title", exact: true })).toHaveValue("Keep this unrelated draft");
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(before);
});


test("whole-package setup retains Build commands and can inspect a second package", async ({ page }) => {
  test.setTimeout(40_000);
  await openBuild(page);
  await loadWhole(page, collaboratorPackage());
  await expect(page.getByRole("button", { name: "Load dashboard package", exact: true })).toBeVisible();
  const review = await inspect(page, collaboratorPackage({ value: 99 }));
  await expect(review.getByRole("checkbox", { name: "Import panel: Cases", exact: true })).toBeVisible();
  await review.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await stored(page)).pages[0].sections[0].panels).toHaveLength(2);
});


test("content pages and sections import into their chosen destinations", async ({ page }) => {
  test.setTimeout(90_000);
  await openBuild(page);
  await loadWhole(page, collaboratorPackage());
  const before = await stored(page);
  const content = await inspect(page, collaboratorPackage({ value: 99, staticPanels: true }));
  await expect(content.getByRole("radio", { name: "Partial Append", exact: true })).toBeChecked();
  await content.getByRole("checkbox", { name: "cases.csv", exact: true }).check();
  await content.getByRole("checkbox", { name: "Map photo", exact: true }).check();
  await content.getByRole("button", { name: "Import selected", exact: true }).click();
  await expect(content).toHaveCount(0);
  expect((await stored(page)).pages).toEqual(before.pages);
  expect(Object.keys((await stored(page)).contentLibrary.mediaItems)).toHaveLength(1);
  const library = page.getByRole("complementary", { name: "Source content authoring" });
  await expect(library).toBeVisible();
  await library.locator(".build-auxiliary-close").click();
  const pages = await inspect(page, collaboratorPackage({ value: 99 }));

  await pages.getByRole("checkbox", { name: "Import page: Overview", exact: true }).check();
  await pages.getByRole("button", { name: "Import selected", exact: true }).click();
  await expect(pages).toHaveCount(0);
  const afterPages = await stored(page);
  expect(afterPages.pages.map(p => p.title)).toEqual(["Overview", "Details"]);
  expect(afterPages.pages[0].sections[0].panels).toHaveLength(4);
  const sections = await inspect(page, collaboratorPackage({ value: 99 }));

  await sections.getByRole("checkbox", { name: "Import section: Signals", exact: true }).check();

  await sections.getByRole("button", { name: "Import selected", exact: true }).click();
  await chooseDashboardPackageDestinations(page, [{ pageId: "details" }]);
  await expect(sections).toHaveCount(0);
  const details = (await stored(page)).pages.find(p => p.id === "details");
  expect(details.sections).toHaveLength(2);
  expect(details.sections[1].panels).toHaveLength(2);
  await page.reload();
  expect((await stored(page)).pages.find(p => p.id === "details").sections[1].panels).toHaveLength(2);
});

test("Text Image import explicitly saves pending metadata and round-trips into a new section", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const native = window.setTimeout.bind(window);
    window.setTimeout = (callback, delay, ...args) => native(callback, delay === 650 ? 60_000 : delay, ...args);
  });
  await openBuild(page);
  await loadWhole(page, collaboratorPackage());
  await page.getByRole("button", { name: "Page settings", exact: true }).click();
  await page.locator(".object-quick-editor").getByLabel("Page title", { exact: true }).fill("Author A revised");
  const review = await inspect(page, collaboratorPackage({ staticPanels: true }));
  await review.getByRole("checkbox", { name: "Import panel: picture", exact: true }).check();
  await review.getByRole("checkbox", { name: "Import panel: text", exact: true }).check();

  await expect(review.getByRole("button", { name: "Import selected", exact: true })).toBeDisabled();
  expect((await stored(page)).pages[0].title).toBe("Overview");
  await review.getByRole("button", { name: "Save pending changes and review", exact: true }).click();
  await expect.poll(async () => (await stored(page)).pages[0].title).toBe("Author A revised");
  await expect(review.getByRole("button", { name: "Import selected", exact: true })).toBeEnabled();
  await review.getByRole("button", { name: "Import selected", exact: true }).click();
  await chooseDashboardPackageDestinations(page, [{ pageId: "overview", newSectionTitle: "Collaborator notes" }]);
  await expect(review).toHaveCount(0);
  const combined = await stored(page);
  const notes = combined.pages[0].sections.find(s => s.title === "Collaborator notes");
  expect(notes.panels.map(p => p.chart.typeId)).toEqual(["image", "freeText"]);
  expect(Object.keys(combined.contentLibrary.mediaItems)).toHaveLength(1);
  const exported = await downloadPackage(page);
  expect(Object.keys(exported.assetPayloads)).toHaveLength(1);
  const context = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    const other = await context.newPage();
    await openBuild(other);
    await loadWhole(other, exported, true);
    await other.reload();
    await expect(other.locator("[data-canonical-section-id]").filter({ has: other.getByRole("button", { name: "Edit Section title: Collaborator notes", exact: true }) })).toBeVisible();
    expect((await stored(other)).pages[0].sections.find(s => s.title === "Collaborator notes").panels).toHaveLength(2);
  } finally { await context.close(); }
});


test("edits imported Free Text and keeps both identities after reload", async ({ page }) => {
  await openBuild(page);
  await loadWhole(page, collaboratorPackage({ staticPanels: true }));
  const before = await stored(page);
  const imported = before.pages[0].sections[0].panels.find(({ chart }) => chart.typeId === "freeText");
  expect(imported.id).not.toBe(imported.chart.id);

  await choosePanelAction(page, imported.id, "edit");
  await page.locator(".chart-quick-editor").getByRole("button", { name: "Open full editor", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Text/Image editor" });
  const source = editor.getByLabel("Portable QMD raw source");
  if (!(await source.isVisible())) {
    await editor.getByRole("button", { name: "Raw text", exact: true }).click();
  }
  const updatedText = "Updated situation briefing.";
  await source.fill(updatedText);
  await editor.getByRole("button", { name: "Continue", exact: true }).click();
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toHaveCount(0);

  await page.reload();
  await openDashboardPage(page, before.pages[0].id);
  const panel = page.locator(`[data-canonical-placement-id="${imported.id}"]`);
  await expect(panel.getByText(updatedText, { exact: true })).toBeVisible();
  const saved = await stored(page);
  const savedPlacement = saved.pages[0].sections[0].panels.find(({ id }) => id === imported.id);
  expect(savedPlacement.chart.id).toBe(imported.chart.id);
  expect(saved.dataSources[savedPlacement.chart.sourceId].qmd).toBe(updatedText);
});

test("opening and cancelling inspection retains an unfinished Structure rename", async ({ page }) => {
  test.setTimeout(40_000);
  await openBuild(page);
  await loadWhole(page, collaboratorPackage());
  const tree = page.getByRole("tree");
  await tree.getByRole("treeitem", { name: "Overview", exact: true }).locator(":scope > .build-tree-row .build-tree-label").dblclick();
  const rename = tree.getByRole("textbox", { name: "Rename page Overview", exact: true });
  await rename.fill("Unfinished author name");
  const review = await inspect(page, collaboratorPackage({ value: 99 }));
  await review.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(rename).toBeVisible();
  await expect(rename).toHaveValue("Unfinished author name");
});

test("three-mode package selection keeps manual content while automatic dependencies and whole modes change", async ({ page }) => {
  test.setTimeout(90_000);
  await openBuild(page);
  await loadWhole(page, collaboratorPackage());
  const before = await stored(page);
  const review = await inspect(page, collaboratorPackage({ value: 99, staticPanels: true }));
  const content = review.getByRole("region", { name: "Content selection", exact: true });
  const map = review.getByRole("region", { name: "Charts and panels selection", exact: true });
  const [left, right] = await Promise.all([map.boundingBox(), content.boundingBox()]);
  expect(left.x + left.width).toBeLessThanOrEqual(right.x);
  for (const row of await map.locator(".build-tree-row").all()) {
    const [rowBox, labelBox, checkBox] = await Promise.all([
      row.boundingBox(), row.locator(".build-tree-label").boundingBox(), row.getByRole("checkbox").boundingBox(),
    ]);
    expect(labelBox.width).toBeGreaterThan(rowBox.width / 2);
    expect(labelBox.x).toBeGreaterThanOrEqual(checkBox.x + checkBox.width);
    expect(Math.abs(labelBox.y + labelBox.height / 2 - checkBox.y - checkBox.height / 2)).toBeLessThan(3);
  }
  const photo = content.getByRole("checkbox", { name: "Map photo", exact: true });
  const text = map.getByRole("checkbox", { name: "Import panel: text", exact: true });
  await photo.check();
  await text.check();
  await expect(photo).toBeChecked();
  await expect(photo).toBeDisabled();
  await photo.locator("..").hover();
  await expect(content.getByRole("tooltip", { name: "Automatically imported", exact: true })).toBeVisible();
  await text.uncheck();
  await expect(photo).toBeEnabled();
  await expect(photo).toBeChecked();
  await photo.uncheck();
  await text.check();
  await text.uncheck();
  await expect(photo).not.toBeChecked();
  await photo.check();
  const overview = map.getByRole("checkbox", { name: "Import page: Overview", exact: true });
  await overview.check();
  await expect(text).toBeChecked();
  await expect(text).toBeDisabled();
  await overview.uncheck();
  await review.getByRole("radio", { name: "Full Append", exact: true }).check();
  const selectionPanel = review.getByRole("group", { name: "Package selection", exact: true });
  await expect.poll(() => selectionPanel.locator("input").evaluateAll(inputs => inputs.every(input => input.matches(":disabled")))).toBe(true);
  expect(await selectionPanel.evaluate(node => Number(getComputedStyle(node).opacity))).toBeLessThan(1);
  await expect(photo).toBeChecked();
  await review.getByRole("radio", { name: "Replace", exact: true }).check();
  await expect.poll(() => selectionPanel.locator("input").evaluateAll(inputs => inputs.every(input => input.matches(":disabled")))).toBe(true);
  await expect(review.getByRole("button", { name: "Load package", exact: true })).toBeDisabled();
  await review.getByRole("radio", { name: "Partial Append", exact: true }).check();
  await expect(photo).toBeChecked();
  await expect(photo).toBeEnabled();
  await expect(text).not.toBeChecked();
  const cases = map.getByRole("checkbox", { name: "Import panel: Cases", exact: true });
  await cases.check();
  await review.getByRole("button", { name: "Import selected", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Choose import destinations", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(review).toBeVisible();
  await expect(cases).toBeChecked();
  await expect(photo).toBeChecked();
  await cases.uncheck();
  await review.getByRole("radio", { name: "Full Append", exact: true }).check();
  await review.getByRole("button", { name: "Import selected", exact: true }).click();
  await expect(review).toHaveCount(0);
  const after = await stored(page);
  expect(after.pages).toHaveLength(2);
  expect(after.pages[0].sections).toHaveLength(1);
  expect(after.pages[0].sections[0].panels).toHaveLength(6);
  expect(after.pages[0].sections[0].panels.slice(0, 2)).toEqual(before.pages[0].sections[0].panels);
  expect(after.dataSources.cases).toEqual(before.dataSources.cases);
  await page.reload();
  expect((await stored(page)).pages[0].sections[0].panels).toHaveLength(6);
});
