import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { collaboratorPackage } from "../helpers/dashboardPackageFixtures.js";
import { serializeDashboardBundle } from "../../src/charting/config/dashboardBundleV3.js";
import { enterBuildMode, chooseWholeDashboardPackage } from "./support/buildWorkflow.js";

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
  await expect(review.getByLabel("Import choice", { exact: true })).toHaveValue("placements");
  await expect(review.getByRole("button", { name: "Import selected", exact: true })).toBeDisabled();
  await review.getByRole("checkbox", { name: "Cases", exact: true }).check();
  await expect(review.getByRole("button", { name: "Import selected", exact: true })).toBeEnabled();
  await review.getByRole("button", { name: "Import selected", exact: true }).click();
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
  await expect(review.getByLabel("Import choice", { exact: true })).toHaveValue("placements");
  await review.getByRole("checkbox", { name: "Cases", exact: true }).check();
  await review.getByLabel("Search package", { exact: true }).fill("no matching object");
  await expect(review.getByRole("button", { name: "Import selected", exact: true })).toBeEnabled();
  await review.getByLabel("Search package", { exact: true }).fill("");
  await expect(review.getByRole("checkbox", { name: "Cases", exact: true })).toBeChecked();
  await review.getByRole("button", { name: "Cancel", exact: true }).click();
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
  await expect(review.getByRole("checkbox", { name: "Cases", exact: true })).toBeVisible();
  await review.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await stored(page)).pages[0].sections[0].panels).toHaveLength(2);
});


test("content pages and sections import into their chosen destinations", async ({ page }) => {
  test.setTimeout(90_000);
  await openBuild(page);
  await loadWhole(page, collaboratorPackage());
  const before = await stored(page);
  const content = await inspect(page, collaboratorPackage({ value: 99, staticPanels: true }));
  await content.getByLabel("Import choice", { exact: true }).selectOption("content");
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
  await pages.getByLabel("Import choice", { exact: true }).selectOption("pages");
  await pages.getByRole("checkbox", { name: "Overview", exact: true }).check();
  await pages.getByRole("button", { name: "Import selected", exact: true }).click();
  await expect(pages).toHaveCount(0);
  const afterPages = await stored(page);
  expect(afterPages.pages.map(p => p.title)).toEqual(["Overview", "Overview (imported)", "Details"]);
  expect(afterPages.pages[1].sections[0].panels).toHaveLength(2);
  const sections = await inspect(page, collaboratorPackage({ value: 99 }));
  await sections.getByLabel("Import choice", { exact: true }).selectOption("sections");
  await sections.getByRole("checkbox", { name: "Signals", exact: true }).check();
  await sections.getByLabel("Destination page", { exact: true }).selectOption("details");
  await sections.getByRole("button", { name: "Import selected", exact: true }).click();
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
  await review.getByRole("checkbox", { name: "picture", exact: true }).check();
  await review.getByRole("checkbox", { name: "text", exact: true }).check();
  await review.getByLabel("Destination section", { exact: true }).selectOption("__new");
  await review.getByLabel("New section title", { exact: true }).fill("Collaborator notes");
  await expect(review.getByRole("button", { name: "Import selected", exact: true })).toBeDisabled();
  expect((await stored(page)).pages[0].title).toBe("Overview");
  await review.getByRole("button", { name: "Save pending changes and review", exact: true }).click();
  await expect.poll(async () => (await stored(page)).pages[0].title).toBe("Author A revised");
  await expect(review.getByRole("button", { name: "Import selected", exact: true })).toBeEnabled();
  await review.getByRole("button", { name: "Import selected", exact: true }).click();
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
