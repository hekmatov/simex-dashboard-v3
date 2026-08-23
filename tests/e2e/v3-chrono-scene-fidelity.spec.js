import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";

test.beforeEach(async ({ request, page }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, { data: { mode: "absent" } });
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller").getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Build panel", exact: true }).click();
});

test("005-chrono-group-authoring: staged ledger and review remain usable at desktop and tablet", async ({ page }) => {
  test.setTimeout(120_000);
  await page.getByRole("button", { name: "Chrono Studio", exact: true }).click();
  const auxiliary = page.getByRole("dialog", { name: "Chrono Studio authoring" });
  await auxiliary.locator("[data-action='open-content']").first().click();
  await auxiliary.getByRole("button", { name: "Edit", exact: true }).click();

  const stages = auxiliary.getByRole("navigation", { name: "Chrono Group stages" });
  await expect(stages.getByRole("button")).toHaveText(["Name and period", "Choose charts", "Set defaults", "Review"]);
  await stages.getByRole("button", { name: "Choose charts" }).click();
  await expect(auxiliary.getByRole("heading", { name: "Selected for this Chrono Group" })).toBeVisible();
  await expect(auxiliary.getByRole("heading", { name: "Needs attention" })).toBeVisible();
  await expect(auxiliary.getByRole("heading", { name: "Available", exact: true })).toBeVisible();
  await expect(auxiliary.locator("details").first()).toContainText(/Other Chrono Groups/);
  await expect(auxiliary.locator(".availability-calendar").first()).toBeVisible();

  await stages.getByRole("button", { name: "Review" }).click();
  for (const label of ["Affected pages", "Derived frames", "Member evidence", "Availability gaps"]) await expect(auxiliary.getByText(label, { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(auxiliary).toBeVisible();
  const geometry = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, footerVisible: Boolean(document.querySelector(".chrono-group-studio > footer")?.getBoundingClientRect().height) }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
  expect(geometry.footerVisible).toBe(true);
});

test("006-scene-authoring: persistent draft, twin canvases, and Unit Orbit are live", async ({ page }) => {
  test.setTimeout(120_000);
  await page.getByRole("button", { name: "Scene Studio", exact: true }).click();
  const auxiliary = page.getByRole("dialog", { name: "Scene Studio authoring" });
  await auxiliary.getByRole("button", { name: "Create Scene", exact: true }).click();

  const panel = auxiliary.locator(".scene-draft-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("textbox", { name: "Scene name" })).toBeVisible();
  for (const label of ["Owning page", "Parent Chrono Group", "Default matching"]) await expect(panel.getByRole("combobox", { name: label })).toBeVisible();
  await expect(panel.getByRole("spinbutton", { name: "Seconds per frame" })).toBeVisible();
  await expect(panel.getByLabel("Start date")).toBeVisible();
  await expect(panel.getByLabel("End date")).toBeVisible();
  if (await panel.getByRole("radio", { name: "Calendar interval" }).isChecked()) {
    await expect(panel.getByRole("spinbutton", { name: "Calendar interval value" })).toBeVisible();
    await expect(panel.getByRole("combobox", { name: "Calendar interval unit" })).toBeVisible();
  }
  for (const label of ["Period", "Time mode", "Save readiness"]) await expect(panel.getByText(label, { exact: true })).toBeVisible();
  const orderedTops = await panel.evaluate((node) => ["Scene name", "Owning page", "Parent Chrono Group", "Period", "Time mode"].map((label) => [...node.querySelectorAll("label, legend")].find((entry) => entry.textContent.trim().startsWith(label))?.getBoundingClientRect().top));
  expect(orderedTops.every((top, index) => index === 0 || top > orderedTops[index - 1])).toBe(true);
  await expect(auxiliary.locator(".scene-variable-evidence").first()).toContainText("Full data");
  await expect(auxiliary.locator(".scene-availability-calendar").first()).toBeVisible();

  await auxiliary.getByRole("button", { name: /Arrange and configure/ }).click();
  const boards = auxiliary.locator(".scene-arrangement-board");
  await expect(boards).toHaveCount(2);
  const widths = await boards.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().width));
  expect(Math.abs(widths[0] - widths[1])).toBeLessThanOrEqual(2);
  await expect(auxiliary.getByRole("button", { name: /Drop here/ }).first()).toBeAttached();
  await expect(auxiliary.locator(".scene-present-corner-action").first()).toBeVisible();
  await auxiliary.locator(".scene-arrangement-board[data-board='scene'] .scene-chart-title").first().click();
  const orbit = auxiliary.locator(".scene-unit-orbit");
  await expect(orbit).toContainText("Unit Orbit");
  await expect(orbit.getByText("Include in Present", { exact: true })).toBeVisible();
  await expect(orbit.getByRole("button", { name: "Move first" })).toBeVisible();
  await expect(panel).toBeVisible();

  await page.setViewportSize({ width: 768, height: 1024 });
  const tabletGeometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    panelVisible: Boolean(document.querySelector(".scene-draft-panel")?.getBoundingClientRect().height),
    boardsVisible: document.querySelectorAll(".scene-arrangement-board").length === 2,
  }));
  expect(tabletGeometry.scrollWidth).toBeLessThanOrEqual(tabletGeometry.clientWidth);
  expect(tabletGeometry.panelVisible).toBe(true);
  expect(tabletGeometry.boardsVisible).toBe(true);
});

test("012-temporal-content: libraries filter, open read-first pages, and restore context", async ({ page }) => {
  test.setTimeout(120_000);
  await page.getByRole("button", { name: "Scene Studio", exact: true }).click();
  let auxiliary = page.getByRole("dialog", { name: "Scene Studio authoring" });
  await expect(auxiliary.getByLabel("Search")).toBeVisible();
  await expect(auxiliary.getByLabel("Status")).toBeVisible();
  await expect(auxiliary.getByLabel("Page")).toBeVisible();
  await expect(auxiliary.getByText(/Showing \d+ of \d+/)).toBeVisible();
  await expect(auxiliary.getByText("No Scenes have been created yet.")).toBeVisible();
  await auxiliary.getByRole("button", { name: "Create Scene", exact: true }).click();
  const sceneName = "Fidelity response scene";
  await auxiliary.getByRole("textbox", { name: "Scene name" }).fill(sceneName);
  await auxiliary.getByRole("button", { name: "Save Scene" }).click();
  await expect(auxiliary.getByRole("heading", { name: sceneName })).toBeVisible();
  await auxiliary.getByRole("button", { name: "Back to Scene Studio" }).click();
  let card = auxiliary.locator("[data-action='open-content']").first();
  await auxiliary.getByLabel("Search").fill(sceneName.slice(0, Math.min(8, sceneName.length)));
  card = auxiliary.locator("[data-action='open-content']").first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(auxiliary.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
  await expect(auxiliary.getByRole("button", { name: "Duplicate", exact: true })).toBeVisible();
  await expect(auxiliary.getByRole("button", { name: "Remove", exact: true })).toBeVisible();

  await auxiliary.getByRole("button", { name: "Back to Scene Studio" }).click();
  await expect(auxiliary.getByLabel("Search")).toHaveValue(sceneName.slice(0, Math.min(8, sceneName.length)));
  await page.setViewportSize({ width: 768, height: 1024 });
  const libraryGeometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    searchVisible: Boolean(document.querySelector(".temporal-studio__filters")?.getBoundingClientRect().height),
  }));
  expect(libraryGeometry.scrollWidth).toBeLessThanOrEqual(libraryGeometry.clientWidth);
  expect(libraryGeometry.searchVisible).toBe(true);

  await auxiliary.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Chrono Studio", exact: true }).click();
  auxiliary = page.getByRole("dialog", { name: "Chrono Studio authoring" });
  await auxiliary.locator("[data-action='open-content']").first().click();
  await expect(auxiliary.getByRole("button", { name: "Create Scene", exact: true })).toBeVisible();
  await expect(auxiliary.getByRole("button", { name: "Duplicate", exact: true })).toBeVisible();
  await expect(auxiliary.getByRole("button", { name: "Remove", exact: true })).toBeVisible();
});
