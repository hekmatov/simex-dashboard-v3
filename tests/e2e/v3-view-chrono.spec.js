import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("View Chrono seeks scopes traces moves and safety-pauses without losing session", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByRole("button", { name: "Chrono view", exact: true }).click();

  const chrono = page.getByRole("region", { name: "Chrono playback controls" });
  await expect(chrono).toBeVisible();
  await expect(chrono.getByLabel("Chrono source")).toContainText("National outbreak and health-system playback");
  await expect(page.getByRole("button", { name: "Build panel", exact: true })).toHaveCount(0);

  await chrono.getByLabel("Chrono chart scope").selectOption("group-only");
  await chrono.getByLabel("Chrono matching policy").selectOption("closest");
  await chrono.getByLabel("Chrono trace behavior").selectOption("full");
  await chrono.getByRole("button", { name: "Show availability information" }).click();
  await expect(chrono.getByRole("complementary", { name: "Frame availability and provenance" }))
    .toContainText("Snapped — source date differs from frame");
  await expect(page.getByText(/nearest matching requires/i)).toHaveCount(0);

  const frame = chrono.getByLabel("Playback frame");
  await frame.fill("2");
  await expect(frame).toHaveValue("2");
  await chrono.getByRole("button", { name: "Play Chrono" }).click();
  await expect(chrono.getByRole("button", { name: "Pause Chrono" })).toBeVisible();
  await chrono.getByLabel("Chrono chart scope").selectOption("all-page");
  await expect(chrono.getByRole("button", { name: "Play Chrono" })).toBeVisible();
  await expect(frame).toHaveValue("2");

  await chrono.getByRole("button", { name: "Move Chrono controls to mast" }).click();
  await expect(chrono).toHaveClass(/playback-controls--top/);
  await expect(frame).toHaveValue("2");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(chrono).toBeVisible();
  const minimumTouchTarget = await chrono.locator("button, select").evaluateAll((controls) => (
    Math.min(...controls.map((control) => control.getBoundingClientRect().height))
  ));
  expect(minimumTouchTarget).toBeGreaterThanOrEqual(40);
});
