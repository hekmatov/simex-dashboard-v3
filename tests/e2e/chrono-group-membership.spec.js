import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { enterAuthoredDashboard } from "./support/landingWorkflow.js";

const shipped = JSON.parse(await readFile(new URL("../../public/config/dashboard.json", import.meta.url), "utf8"));
const charts = shipped.pages.flatMap((page) => page.sections.flatMap((section) =>
  section.panels.map((placement) => placement.chart ?? placement)));
const group = shipped.chronoGroups.find(({ id }) => id === "national_outbreak");
const vaccination = charts.find(({ id }) => id === "bio_vaccination_rate");

test.use({ viewport: { width: 1440, height: 900 } });

test("Chrono membership omits Collection displays and warning navigation reaches the named chart", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await enterAuthoredDashboard(page);
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Chrono Studio", exact: true }).click();
  const studio = page.getByRole("dialog", { name: "Chrono Studio authoring" });
  await studio.getByRole("button", { name: new RegExp(group.name) }).click();
  await studio.getByRole("button", { name: "Edit", exact: true }).click();
  await studio.getByRole("navigation", { name: "Chrono Group stages" }).getByRole("button", { name: /Choose charts/ }).click();
  const row = (id) => studio.locator(`[data-chart-id="${id}"]`);
  // Use the real shipped group and profiles without replacing authored content.
  for (const chart of charts.filter(({ presentation }) => presentation?.collection != null)) {
    await expect(row(chart.id)).toHaveCount(0);
  }
  for (const { chartId } of group.members) {
    await expect(row(chartId).getByRole("heading", { name: charts.find(({ id }) => id === chartId).title, exact: true })).toBeVisible();
    await expect(row(chartId)).toHaveAttribute("data-status", "selected");
  }
  await row(vaccination.id).getByRole("button", { name: "Add to group", exact: true }).click();
  await studio.getByRole("button", { name: "Edit period", exact: true }).click();
  // Vaccination begins in June; the five existing members remain ready in this shorter period.
  // The affected row therefore sits below the ready members in the long selection list.
  await studio.getByLabel("End date", { exact: true }).fill("2027-03-01");
  await studio.getByRole("button", { name: "Continue", exact: true }).click();
  await studio.getByRole("button", { name: "Continue", exact: true }).click();
  const warning = studio.getByRole("alert").getByRole("button", { name: /Needs attention/ });
  await expect(warning).toContainText(vaccination.title);
  await expect(warning).not.toContainText(vaccination.id);
  await expect(warning).toHaveAttribute("aria-controls", `chrono-group-chart-${vaccination.id}`);
  const target = row(vaccination.id);
  await expect(target).toHaveAttribute("data-status", "needs-attention");
  const before = await target.boundingBox();
  const viewport = await studio.locator(".chrono-group-studio__body").boundingBox();
  expect(before.y).toBeGreaterThan(viewport.y + viewport.height);
  await warning.click();
  await expect(target).toBeFocused();
  const after = await target.boundingBox();
  expect(after.y).toBeGreaterThanOrEqual(viewport.y);
  expect(after.y + after.height).toBeLessThanOrEqual(viewport.y + viewport.height);
  await target.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(target).toHaveCount(0);
  expect(errors).toEqual([]);
});
