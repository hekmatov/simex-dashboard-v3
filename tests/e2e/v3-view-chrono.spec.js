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
  const controllerLayer = page.locator('[data-chrono-controller-layer="true"]');
  const dateOverlay = page.getByRole("status", { name: "Chrono date overlay" });
  await expect(chrono).toBeVisible();
  await expect(dateOverlay).toBeVisible();
  await expect(chrono.getByLabel("Chrono source")).toContainText("National outbreak and health-system playback");
  await expect(page.getByRole("button", { name: "Dashboard map", exact: true })).toHaveCount(0);

  await chrono.getByLabel("Chrono chart scope").selectOption("group-only");
  await chrono.getByLabel("Chrono matching policy").selectOption("closest");
  await chrono.getByLabel("Chrono trace behavior").selectOption("full");
  await chrono.getByRole("button", { name: "Show availability information" }).click();
  const availability = chrono.getByRole("complementary", { name: "Frame availability and provenance" });
  await expect(availability.locator("li[data-chart-id]").first()).toBeVisible();
  await expect(availability.locator("li[data-chart-id]").first()).toContainText(/C1|C2/);
  await expect(availability.locator('li[data-availability]:not([data-availability="static"])').first()).toBeVisible();
  await expect(page.locator('.chart-panel[data-chrono-availability]').first()).toBeVisible();
  await expect(availability).not.toContainText("Snapped — source date differs from frame");
  await expect(page.getByText(/nearest matching requires/i)).toHaveCount(0);

  const frame = chrono.getByLabel("Playback frame");
  const frameValues = await chrono.locator("datalist option").evaluateAll((options) => options.map((option) => option.value));
  expect(frameValues.length).toBeGreaterThan(2);
  await frame.fill(frameValues[2]);
  await expect(frame).toHaveValue(frameValues[2]);
  const cadence = chrono.getByLabel("Seconds per frame");
  await expect(cadence).toHaveAttribute("type", "number");
  await cadence.fill("0.75");
  await expect(cadence).toHaveValue("0.75");
  await chrono.getByRole("button", { name: "Play Chrono" }).click();
  await expect(chrono.getByRole("button", { name: "Pause Chrono" })).toBeVisible();
  await chrono.getByLabel("Chrono chart scope").selectOption("all-page");
  await expect(chrono.getByRole("button", { name: "Play Chrono" })).toBeVisible();
  await expect(frame).toHaveValue(frameValues[2]);

  await chrono.getByRole("button", { name: "Move Chrono controls to mast" }).click();
  await expect(chrono).toHaveClass(/playback-controls--top/);
  await expect(frame).toHaveValue(frameValues[2]);

  const overlayBefore = await dateOverlay.boundingBox();
  await page.mouse.move(overlayBefore.x + 40, overlayBefore.y + 30);
  await page.mouse.down();
  await page.mouse.move(overlayBefore.x + 90, overlayBefore.y + 65, { steps: 5 });
  await page.mouse.up();
  const overlayMoved = await dateOverlay.boundingBox();
  expect(overlayMoved.x).toBeGreaterThan(overlayBefore.x + 30);
  expect(overlayMoved.y).toBeGreaterThan(overlayBefore.y + 20);
  await page.getByLabel("Move Chrono date overlay").focus();
  await page.keyboard.press("ArrowRight");
  const overlayKeyboardMoved = await dateOverlay.boundingBox();
  expect(overlayKeyboardMoved.x).toBeCloseTo(overlayMoved.x + 10, 0);
  const resizeHandle = page.getByRole("button", { name: "Resize Chrono date overlay" });
  const resizeHandleBox = await resizeHandle.boundingBox();
  await page.mouse.move(resizeHandleBox.x + resizeHandleBox.width / 2, resizeHandleBox.y + resizeHandleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(resizeHandleBox.x + resizeHandleBox.width / 2 + 20, resizeHandleBox.y + resizeHandleBox.height / 2 + 15, { steps: 4 });
  await page.mouse.up();
  const overlayPointerResized = await dateOverlay.boundingBox();
  expect(overlayPointerResized.width).toBeCloseTo(overlayKeyboardMoved.width + 20, 0);
  expect(overlayPointerResized.height).toBeCloseTo(overlayKeyboardMoved.height + 15, 0);
  await resizeHandle.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  const overlayResized = await dateOverlay.boundingBox();
  expect(overlayResized.width).toBeCloseTo(overlayPointerResized.width + 10, 0);
  expect(overlayResized.height).toBeCloseTo(overlayPointerResized.height + 10, 0);

  const focusPanel = page.locator('[data-panel-id="bio_confirmed_cases"]');
  await focusPanel.getByRole("button", { name: "Focus chart" }).click({ force: true });
  await expect(page.getByRole("dialog", { name: "Focused chart" })).toBeVisible();
  await expect(controllerLayer).toBeHidden();
  await expect(dateOverlay).toBeHidden();
  await page.getByRole("button", { name: "Exit focus" }).click();
  await expect(chrono).toBeVisible();
  await expect(dateOverlay).toBeVisible();
  const overlayRestored = await dateOverlay.boundingBox();
  expect(overlayRestored.x).toBeCloseTo(overlayResized.x, 0);
  expect(overlayRestored.y).toBeCloseTo(overlayResized.y, 0);
  expect(overlayRestored.width).toBeCloseTo(overlayResized.width, 0);
  expect(overlayRestored.height).toBeCloseTo(overlayResized.height, 0);
  await expect(frame).toHaveValue(frameValues[2]);
  await expect(cadence).toHaveValue("0.75");

  await page.getByRole("button", { name: "Compare charts", exact: true }).click();
  const compareCandidates = page.getByRole("button", { name: "Add chart to comparison" });
  await compareCandidates.first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Remove chart from comparison" })).toHaveCount(1);
  await compareCandidates.first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Remove chart from comparison" })).toHaveCount(2);
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Chart comparison" })).toBeVisible();
  await expect(controllerLayer).toBeHidden();
  await expect(dateOverlay).toBeHidden();
  await page.getByRole("button", { name: "Exit comparison" }).click();
  await expect(chrono).toBeVisible();
  await expect(dateOverlay).toBeVisible();

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(chrono).toBeVisible();
  await expect(dateOverlay).toBeVisible();
  const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(tabletOverflow).toBeLessThanOrEqual(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(chrono).toBeVisible();
  const phoneOverlay = await dateOverlay.boundingBox();
  expect(phoneOverlay.x).toBeGreaterThanOrEqual(8);
  expect(phoneOverlay.x + phoneOverlay.width).toBeLessThanOrEqual(382);
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll("body *")]
      .map((element) => ({
        className: typeof element.className === "string" ? element.className : "",
        label: element.getAttribute("aria-label"),
        parentClass: typeof element.parentElement?.className === "string" ? element.parentElement.className : "",
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
      }))
      .filter(({ right }) => right > document.documentElement.clientWidth + 1)
      .sort((left, right) => left.right - right.right)
      .slice(0, 12),
  }));
  expect(overflow.scrollWidth, JSON.stringify(overflow.offenders)).toBeLessThanOrEqual(overflow.clientWidth);
  const minimumTouchTarget = await chrono.locator("button, select").evaluateAll((controls) => (
    Math.min(...controls.map((control) => control.getBoundingClientRect().height))
  ));
  expect(minimumTouchTarget).toBeGreaterThanOrEqual(40);
});
