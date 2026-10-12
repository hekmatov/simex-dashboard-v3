import { expect, test } from "@playwright/test";
import { enterAuthoredDashboard } from "./support/landingWorkflow.js";

test.use({ viewport: { width: 1440, height: 1000 } });
test.setTimeout(120_000);
const mode = (page, name) => page.getByLabel("Dashboard mode").getByRole("button", { name, exact: true });
const commands = (page) => page.getByRole("region", { name: "Build commands" });
const discard = (page) => commands(page).getByRole("button", { name: "Discard Build changes", exact: true });
const finish = (page) => commands(page).getByRole("button", { name: "Finish Build", exact: true });
const studio = (page, name) => page.getByRole("dialog", { name: `${name} Studio authoring` });

async function openBuild(page) {
  await page.goto("/");
  await enterAuthoredDashboard(page);
  await mode(page, "Build").click();
  await expect(commands(page)).toBeVisible();
}
async function confirmDiscard(page) {
  await discard(page).click();
  const confirmation = page.getByRole("dialog", { name: "Discard Build changes?" });
  await confirmation.getByRole("button", { name: "Discard Build changes", exact: true }).click();
  await expect(confirmation).toHaveCount(0);
  await expect(mode(page, "Build")).toHaveAttribute("aria-pressed", "true");
}

test("Build discards suspended temporal drafts in place and disables empty session actions", async ({ page }) => {
  await openBuild(page);
  await expect(discard(page)).toBeDisabled();
  await expect(finish(page)).toBeDisabled();
  await commands(page).getByRole("button", { name: "Scene Studio", exact: true }).click();
  await studio(page, "Scene").getByRole("button", { name: "Create Scene", exact: true }).click();
  await studio(page, "Scene").getByLabel("Scene name", { exact: true }).fill("Retained scene draft");
  const parents = studio(page, "Scene").locator('[data-scene-workflow-id="parent-chrono-group"]');
  await expect(parents.locator("option")).toContainText(["Choose Chrono Group", "Municipal outbreak playback", "National outbreak and health-system playback"]);
  await parents.selectOption("national_outbreak");
  await studio(page, "Scene").getByRole("button", { name: "Close", exact: true }).click();
  await commands(page).getByRole("button", { name: "Chrono Studio", exact: true }).click();
  await studio(page, "Chrono").getByRole("button", { name: "Close", exact: true }).click();
  await commands(page).getByRole("button", { name: /Resume Scene Studio/ }).click();
  await expect(studio(page, "Scene").getByLabel("Scene name", { exact: true })).toHaveValue("Retained scene draft");
  await expect(studio(page, "Scene").locator('[data-scene-workflow-id="parent-chrono-group"]')).toHaveValue("national_outbreak");
  await studio(page, "Scene").getByRole("button", { name: "Close", exact: true }).click();
  await expect(discard(page)).toBeEnabled();
  await expect(finish(page)).toBeDisabled();
  await confirmDiscard(page);
  await expect(commands(page).getByRole("navigation", { name: "Pending Build work" })).toHaveCount(0);
  await expect(discard(page)).toBeDisabled();
  await expect(finish(page)).toBeDisabled();
});

test("open Chrono draft blocks new Scenes and directly reopens through its status banner", async ({ page }) => {
  await openBuild(page);
  await commands(page).getByRole("button", { name: "Chrono Studio", exact: true }).click();
  await studio(page, "Chrono").getByRole("button", { name: "Create Chrono Group", exact: true }).click();
  await studio(page, "Chrono").getByLabel("Chrono Group name", { exact: true }).fill("Pending group");
  await studio(page, "Chrono").getByRole("button", { name: "Close", exact: true }).click();
  await commands(page).getByRole("button", { name: "Scene Studio", exact: true }).click();
  await expect(studio(page, "Scene").getByRole("button", { name: "Create Scene", exact: true })).toBeDisabled();
  await studio(page, "Scene").getByRole("button", { name: "Open pending Chrono Group draft", exact: true }).click();
  await expect(studio(page, "Chrono").getByLabel("Chrono Group name", { exact: true })).toHaveValue("Pending group");
  await studio(page, "Chrono").getByLabel("Start date", { exact: true }).fill("2027-02-20");
  await studio(page, "Chrono").getByLabel("End date", { exact: true }).fill("2027-08-15");
  await studio(page, "Chrono").getByRole("button", { name: "Continue", exact: true }).click();
  await studio(page, "Chrono").locator('[data-chart-id="bio_confirmed_cases"]').getByRole("button", { name: "Add to group", exact: true }).click();
  await studio(page, "Chrono").getByRole("button", { name: "Continue", exact: true }).click();
  const policies = studio(page, "Chrono").getByRole("radio");
  await expect(policies).toHaveCount(4);
  expect(await policies.evaluateAll((inputs) => inputs.map(({ value }) => value))).toEqual(["Snap to Latest", "Interpolate", "Snap to Closest", "Concurrent only"]);
  await expect(policies.first()).toBeChecked();
});

test("Chrono Group Only hides empty sections and View all charts switches the scope", async ({ page }) => {
  await page.goto("/");
  await enterAuthoredDashboard(page);
  await page.getByRole("button", { name: "Chrono view", exact: true }).click();
  const controls = page.getByRole("region", { name: "Chrono playback controls" });
  await controls.getByRole("combobox", { name: "Chrono source" }).selectOption("group:national_outbreak");
  const scope = controls.getByRole("combobox", { name: "Chrono chart scope" });
  await scope.selectOption("group-only");
  await expect(page.getByText("Other charts are hidden in Group Only view.", { exact: true })).toBeVisible();
  await expect(page.locator("[data-canonical-section-id]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add Panel to Section", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "View all charts", exact: true }).click();
  await expect(scope).toHaveValue("all-page");
  await expect(page.getByText("Other charts are hidden in Group Only view.", { exact: true })).toHaveCount(0);
  await expect(page.locator("[data-canonical-section-id]").first()).toBeVisible();
});

test("Build rails stop above the footer and saved session changes can be discarded repeatedly", async ({ page }) => {
  await openBuild(page);
  const title = page.getByRole("complementary", { name: "Properties", exact: true }).getByLabel("Page title", { exact: true });
  const baseline = await title.inputValue();
  await title.fill("Build session change");
  await expect(finish(page)).toBeEnabled();
  // Page metadata uses the serialized autosave queue; wait for the durable
  // change so this exercises restoration of committed content, not only a local draft.
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("simex-dashboard-config-v3-three-mode-v1"));
    return saved?.pages.find(({ id }) => id === "biomedical")?.title;
  })).toBe("Build session change");
  await confirmDiscard(page);
  await expect(title).toHaveValue(baseline);
  await title.fill("Second Build session change");
  await expect(finish(page)).toBeEnabled();
  await confirmDiscard(page);
  await expect(title).toHaveValue(baseline);
  const footer = page.locator(".dashboard-footer");
  await footer.scrollIntoViewIfNeeded();
  for (const rail of ["structure", "properties"]) {
    const railBox = await page.locator(`[data-build-rail="${rail}"]`).boundingBox();
    const footerBox = await footer.boundingBox();
    expect(railBox.y + railBox.height).toBeLessThanOrEqual(footerBox.y + 1);
  }
});

test("unsaved source names disable Finish and Build discard clears their pending owner", async ({ page }) => {
  await openBuild(page);
  await commands(page).getByRole("button", { name: "Source content", exact: true }).click();
  const sources = page.getByRole("complementary", { name: "Source content authoring", exact: true });
  await sources.getByRole("tab", { name: "Data sources", exact: true }).click();
  await sources.getByRole("button", { name: /^Cases — Biomedical/ }).click();
  await sources.getByLabel("Display name", { exact: true }).fill("Unsaved source name");
  await sources.getByRole("button", { name: "Close", exact: true }).click();
  await expect(finish(page)).toBeDisabled();
  await expect(discard(page)).toBeEnabled();
  await confirmDiscard(page);
  await expect(discard(page)).toBeDisabled();
  await commands(page).getByRole("button", { name: "Source content", exact: true }).click();
  await sources.getByRole("tab", { name: "Data sources", exact: true }).click();
  await expect(sources.getByRole("button", { name: /^Cases — Biomedical/ })).toBeVisible();
  await expect(sources.getByRole("button", { name: /^Unsaved source name/ })).toHaveCount(0);
});
