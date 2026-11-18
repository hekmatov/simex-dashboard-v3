import { expect, test } from "@playwright/test";
import { timeCursor } from "./support/time-cursor-workflow.js";
import { migrateDashboardV6ToV7 } from "../../src/charting/config/migrateDashboardV6ToV7.js";
import { enterAuthoredDashboard } from "./support/landingWorkflow.js";

test.use({ viewport: { width: 1440, height: 1000 }, storageState: { cookies: [], origins: [] } });
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
  const quick=page.locator('.object-quick-editor');
  if (await quick.isVisible().catch(()=>false)) await quick.getByRole('button',{name:'Close',exact:true}).click();
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
  await commands(page).getByRole("button", { name: "Storyline Studio", exact: true }).click();
  await studio(page, "Storyline").getByRole("button", { name: "Create Storyline", exact: true }).click();
  await studio(page, "Storyline").getByLabel("Storyline name", { exact: true }).fill("Retained scene draft");
  await expect(studio(page, "Storyline").locator('[data-scene-workflow-id="parent-chrono-group"]')).toHaveCount(0);
  await studio(page, "Storyline").getByLabel("Start date", { exact: true }).fill("2027-02-20");
  await studio(page, "Storyline").getByLabel("End date", { exact: true }).fill("2027-08-15");
  await studio(page, "Storyline").getByRole("radio", { name: "All member observations", exact: true }).check();
  await studio(page, "Storyline").getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.locator('.object-quick-editor')).toHaveCount(0);
  await commands(page).getByRole("button", { name: "Source content", exact: true }).click();
  await page.getByRole("complementary", { name: "Source content authoring", exact: true }).getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.locator('.object-quick-editor')).toHaveCount(0);
  await commands(page).getByRole("button", { name: /Resume Storyline Studio/ }).click();
  await expect(studio(page, "Storyline").getByLabel("Storyline name", { exact: true })).toHaveValue("Retained scene draft");
  await expect(studio(page, "Storyline").getByLabel("Start date", { exact: true })).toHaveValue("2027-02-20");
  await expect(studio(page, "Storyline").getByLabel("End date", { exact: true })).toHaveValue("2027-08-15");
  await expect(studio(page, "Storyline").getByRole("radio", { name: "All member observations", exact: true })).toBeChecked();
  await studio(page, "Storyline").getByRole("button", { name: "Close", exact: true }).click();
  await expect(discard(page)).toBeEnabled();
  await expect(finish(page)).toBeDisabled();
  await confirmDiscard(page);
  await expect(commands(page).getByRole("navigation", { name: "Pending Build work" })).toHaveCount(0);
  await expect(discard(page)).toBeDisabled();
  await expect(finish(page)).toBeDisabled();
});

test('library return retains an explicitly opened object editor and its focus-return target', async ({page}) => {
  await openBuild(page);
  const invoker=commands(page).getByRole('button',{name:'Page settings',exact:true});
  await invoker.click();
  const quick=page.locator('.object-quick-editor');
  const baseline=await quick.getByLabel('Page title',{exact:true}).inputValue();
  await commands(page).getByRole('button',{name:'Source content',exact:true}).click();
  const sources=page.getByRole('complementary',{name:'Source content authoring',exact:true});
  await expect(sources).toBeVisible();
  await sources.getByRole('button',{name:'Close',exact:true}).click();
  await expect(quick.getByLabel('Page title',{exact:true})).toHaveValue(baseline);
  await quick.getByRole('button',{name:'Close',exact:true}).click();
  await expect(invoker).toBeFocused();
});

test("pending Storyline resumes unchanged with every matching policy and an explicit nearest bound", async ({ page }) => {
  await openBuild(page);
  await commands(page).getByRole("button", { name: "Storyline Studio", exact: true }).click();
  const editor = studio(page, "Storyline");
  await editor.getByRole("button", { name: "Create Storyline", exact: true }).click();
  await editor.getByLabel("Storyline name", { exact: true }).fill("Pending Storyline");
  await editor.getByLabel("Start date", { exact: true }).fill("2027-02-20");
  await editor.getByLabel("End date", { exact: true }).fill("2027-08-15");
  const matching = editor.getByRole("combobox", { name: "Default matching", exact: true });
  const maxDistance = editor.getByRole("spinbutton", { name: /^Default matching maximum distance \(hours\)/ });
  await expect(matching).toHaveValue("authored");
  await expect.poll(() => matching.evaluate(select => Array.from(select.options)
    .filter(option => option.value !== "authored")
    .map(option => ({ value: option.value, label: option.textContent })))).toEqual([
    { value: "exact", label: "Concurrent only" },
    { value: "lastKnown", label: "Snap to Latest" },
    { value: "nearest", label: "Snap to Closest" },
    { value: "interpolate", label: "Interpolate" },
  ]);
  await matching.selectOption("nearest");
  await maxDistance.fill("2");
  const pending = page.locator('[data-pending-work-kind="scene"]');
  await expect(pending).toBeVisible();
  const identity = await pending.getAttribute("data-pending-work-id");
  expect(identity).toBeTruthy();
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await commands(page).getByRole("button", { name: /Resume Storyline Studio/ }).click();
  await expect(pending).toHaveAttribute("data-pending-work-id", identity);
  await expect(editor.getByLabel("Storyline name", { exact: true })).toHaveValue("Pending Storyline");
  await expect(editor.getByLabel("Start date", { exact: true })).toHaveValue("2027-02-20");
  await expect(editor.getByLabel("End date", { exact: true })).toHaveValue("2027-08-15");
  await expect(editor.getByRole("button", { name: /Storyline details/, exact: false })).toHaveAttribute("aria-current", "step");
  await expect(matching).toHaveValue("nearest");
  await expect(maxDistance).toHaveValue("2");
});

test("Storyline scope keeps canonical page content mounted and closes back to Page scope", async ({ page }) => {
  await page.goto("/");
  await enterAuthoredDashboard(page);
  const source = migrateDashboardV6ToV7(await (await page.request.get("/config/dashboard.json")).json());
  const saved = source.scenes.find(scene => scene.name === "National outbreak and health-system playback");
  expect(saved).toBeTruthy();
  const cursor = timeCursor(page);
  await cursor.selectScope({ name: saved.name });
  const band = page.getByRole("region", { name: "Storyline", exact: true });
  await expect(band).toBeVisible();
  await expect(band.locator("[data-scene-chart-id]")).toHaveCount(saved.members.length);
  await expect(page.locator("[data-canonical-section-id]").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Panel to Section", exact: true })).toHaveCount(0);
  await band.getByRole("button", { name: "Close Storyline", exact: true }).click();
  await expect(cursor.scope).toHaveValue("page");
  await expect(band).toHaveCount(0);
  await expect(page.locator("[data-canonical-section-id]").first()).toBeVisible();
});

test("Build rails stop above the footer and saved session changes can be discarded repeatedly", async ({ page }) => {
  test.setTimeout(180_000);
  await openBuild(page);
  await page.getByRole("button", { name: "Page settings", exact: true }).click();
  const title = page.locator(".object-quick-editor").getByLabel("Page title", { exact: true });
  const baseline = await title.inputValue();
  const pageId = await page.locator('[data-canonical-mode="build"][data-canonical-page-id]')
    .getAttribute("data-canonical-page-id");
  expect(pageId).toBeTruthy();
  await title.fill("Build session change");
  await expect(finish(page)).toBeEnabled();
  // Page metadata uses the serialized autosave queue; wait for the durable
  // change so this exercises restoration of committed content, not only a local draft.
  await expect.poll(() => page.evaluate((activePageId) => {
    const saved = JSON.parse(localStorage.getItem("simex-dashboard-config-v3-three-mode-v1"));
    return saved?.pages.find(({ id }) => id === activePageId)?.title;
  }, pageId)).toBe("Build session change");
  await confirmDiscard(page);
  await page.getByRole("button", { name: "Page settings", exact: true }).click();
  await expect(title).toHaveValue(baseline);
  await title.fill("Second Build session change");
  await expect(finish(page)).toBeEnabled();
  await confirmDiscard(page);
  await page.getByRole("button", { name: "Page settings", exact: true }).click();
  await expect(title).toHaveValue(baseline);
  const footer = page.locator(".dashboard-footer");
  await footer.scrollIntoViewIfNeeded();
  await expect(page.locator('[data-build-rail="properties"]')).toHaveCount(0);
  for (const rail of ["structure"]) {
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
  await sources.getByRole("button", { name: /^Cases \u2014 Biomedical/ }).click();
  await sources.getByLabel("Display name", { exact: true }).fill("Unsaved source name");
  await sources.getByRole("button", { name: "Close", exact: true }).click();
  await expect(finish(page)).toBeDisabled();
  await expect(discard(page)).toBeEnabled();
  await confirmDiscard(page);
  await expect(discard(page)).toBeDisabled();
  await commands(page).getByRole("button", { name: "Source content", exact: true }).click();
  await sources.getByRole("tab", { name: "Data sources", exact: true }).click();
  await expect(sources.getByRole("button", { name: /^Cases \u2014 Biomedical/ })).toBeVisible();
  await expect(sources.getByRole("button", { name: /^Unsaved source name/ })).toHaveCount(0);
});
