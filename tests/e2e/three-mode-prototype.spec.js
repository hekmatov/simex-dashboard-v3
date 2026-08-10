import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";

test.describe.configure({ timeout: 150_000 });

test.beforeEach(async ({ page, request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
  await page.goto("/");
});

test("View, Build, and Present remain visible while preserving the active page", async ({ page }) => {
  const modes = page.getByLabel("Dashboard mode");
  await expect(modes.getByRole("button", { name: "View" })).toBeVisible();
  await expect(modes.getByRole("button", { name: "Build" })).toBeVisible();
  await expect(modes.getByRole("button", { name: "Present" })).toBeVisible();

  await page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Biomedical", exact: true })
    .click();

  await modes.getByRole("button", { name: "Build" }).click();
  await expect(page.locator(".build-workspace")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Biomedical", exact: true }))
    .toHaveAttribute("aria-current", "page");

  await modes.getByRole("button", { name: "Present" }).click();
  await expect(page.getByLabel("Current page")).toHaveValue("biomedical");

  await modes.getByRole("button", { name: "View" }).click();
  await expect(page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Biomedical", exact: true }))
    .toHaveAttribute("aria-current", "page");
});

test("Build metadata persists on save and stays editable after a failed save", async ({ page }) => {
  await enterScenarioInspector(page);
  const program = page.getByLabel("Program");
  await program.fill("Three-mode training exercise");
  await page.getByRole("button", { name: "View" }).click();
  await expect(page.getByRole("button", { name: "View" }))
    .toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate((key) => (
    JSON.parse(localStorage.getItem(key)).programLabel
  ), STORAGE_KEY)).toBe("Three-mode training exercise");

  await enterScenarioInspector(page);
  await program.fill("Retain this Build draft");
  await page.evaluate((storageKey) => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === storageKey) {
        throw new DOMException("Browser storage is full.", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    };
  }, STORAGE_KEY);

  await page.getByRole("button", { name: "View" }).click();
  await expect(page.getByRole("button", { name: "Build" }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(program).toHaveValue("Retain this Build draft");
  await expect(page.getByRole("alert")).toContainText("Browser storage is full");
});

test("View compares charts and closes fullscreen with Escape", async ({ page }) => {
  await openBiomedical(page);
  await page.getByRole("button", { name: "Compare charts" }).click();

  const panels = page.locator(".chart-panel");
  await panels.nth(0).getByRole("button", {
    name: "Add chart to multi-fullscreen",
  }).click();
  await panels.nth(1).getByRole("button", {
    name: "Add chart to multi-fullscreen",
  }).click();
  await page.getByRole("button", { name: "Enter multi-fullscreen" }).click();

  const fullscreen = page.getByRole("dialog", { name: "Displayed charts" });
  await expect(fullscreen).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(fullscreen).toHaveCount(0);
});

test("Present opens an audience window and sends a two-chart layout", async ({ page }) => {
  await enterPresent(page);
  const audience = await openAudience(page);
  await selectTwoAudienceCharts(page);
  await page.getByLabel("Scene layout").selectOption("overUnder");

  const grid = audience.locator(
    '.displayed-chart-grid[data-display-surface="audience"]',
  );
  await expect(grid).toHaveClass(/displayed-count-2/);
  await expect(grid).toHaveClass(/layout-overUnder/);
  await expect(grid.locator("[data-displayed-chart-id]")).toHaveCount(2);
});

test("Present retains synchronized time through blackout, reload, disconnect, and reopen", async ({ page }) => {
  await enterPresent(page);
  await installAudienceStateObserver(page.context());
  const audience = await openAudience(page);
  await selectTwoAudienceCharts(page);

  await page.getByLabel("Synchronized time").selectOption({ index: 1 });
  await expect.poll(async () => Number.isFinite(
    await observedAudienceEpoch(audience),
  )).toBe(true);
  const previousEpoch = await observedAudienceEpoch(audience);
  const presentationTime = page.getByLabel("Presentation time");
  await expect(presentationTime).toBeEnabled();
  const previousTime = await presentationTime.inputValue();
  await presentationTime.press("ArrowLeft");
  await expect(presentationTime).not.toHaveValue(previousTime);
  await expect.poll(() => observedAudienceEpoch(audience))
    .not.toBe(previousEpoch);
  const activeEpochMs = await observedAudienceEpoch(audience);
  expect(Number.isFinite(activeEpochMs)).toBe(true);

  await page.getByRole("button", { name: "Blackout" }).click();
  await expect(audience.locator(".audience-blackout")).toBeVisible();

  await audience.reload();
  await expect(audience.locator(".audience-blackout")).toBeVisible();
  await expect(audience.locator("[data-displayed-chart-id]")).toHaveCount(2);
  await expect.poll(() => observedAudienceEpoch(audience)).toBe(activeEpochMs);

  await page.getByRole("button", { name: "Restore" }).click();
  await expect(audience.locator(".audience-blackout")).toHaveCount(0);
  await audience.close();
  await expect(page.getByText("Audience display disconnected", { exact: true }))
    .toBeVisible({ timeout: 7_000 });

  const reopened = await reopenAudience(page);
  await expect(reopened.locator("[data-displayed-chart-id]")).toHaveCount(2);
  await expect.poll(() => observedAudienceEpoch(reopened)).toBe(activeEpochMs);
});

test("iPad View and Build plus a 1920 by 1080 audience have no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Build" }).click();
  await expect(page.locator(".build-workspace")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Present" }).click();
  const audience = await openAudience(page);
  await selectTwoAudienceCharts(page);
  await audience.setViewportSize({ width: 1920, height: 1080 });
  await expectNoHorizontalOverflow(audience);
});

async function openBiomedical(page) {
  await page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Biomedical", exact: true })
    .click();
}

async function enterScenarioInspector(page) {
  await page.getByRole("button", { name: "Build" }).click();
  await page.getByRole("navigation", { name: "Dashboard structure" })
    .getByRole("button", { name: "Scenario", exact: true })
    .click();
}

async function enterPresent(page) {
  await page.getByRole("button", { name: "Present" }).click();
  await expect(page.locator(".present-workspace")).toBeVisible();
}

async function selectTwoAudienceCharts(page) {
  const choices = page.locator(".present-chart-choice");
  await expect(choices.nth(1)).toBeVisible();
  for (const choice of [choices.nth(0), choices.nth(1)]) {
    const checkbox = choice.getByRole("checkbox");
    if (!(await checkbox.isChecked())) await checkbox.check();
  }
}

async function openAudience(page) {
  const audiencePromise = page.context().waitForEvent("page");
  await page.getByRole("button", { name: "Open audience display" }).click();
  const audience = await audiencePromise;
  await audience.waitForLoadState("domcontentloaded");
  await expect(audience.locator(".audience-display")).toBeVisible();
  return audience;
}

async function reopenAudience(page) {
  const audiencePromise = page.context().waitForEvent("page");
  await page.getByRole("button", { name: "Reopen audience display" }).click();
  const audience = await audiencePromise;
  await audience.waitForLoadState("domcontentloaded");
  await expect(audience.locator(".audience-display")).toBeVisible();
  return audience;
}

async function expectNoHorizontalOverflow(page) {
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  ))).toBe(true);
}

async function installAudienceStateObserver(context) {
  await context.addInitScript(() => {
    const parameters = new URLSearchParams(globalThis.location.search);
    const channelId = parameters.get("channel");
    if (parameters.get("surface") !== "audience" || !channelId) return;

    const observation = { latestState: null };
    const channel = new BroadcastChannel(`simex-presentation-${channelId}`);
    channel.addEventListener("message", ({ data }) => {
      if (
        data?.protocol_version === 1
        && data.session_id === channelId
        && data.type === "state"
      ) {
        observation.latestState = structuredClone(data.payload);
      }
    });
    globalThis.__SIMEX_E2E_AUDIENCE_STATE__ = observation;
  });
}

async function observedAudienceEpoch(audience) {
  return audience.evaluate(() => (
    globalThis.__SIMEX_E2E_AUDIENCE_STATE__?.latestState?.time?.active_epoch_ms
      ?? null
  ));
}
