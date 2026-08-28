import { test, expect } from "@playwright/test";
import { openDashboardPage } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const FIRST_CHART = "bio_confirmed_cases";
const SECOND_CHART = "bio_mortality_age";
const browserErrors = new WeakMap();

test.beforeEach(async ({ page, request }) => {
  const errors = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await request.post(`${CONTROL_URL}/__test__/reset`);
});

test("Quorum chart display remains available when the dashboard starts on showcase Home", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "SimEx Dashboard",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Home", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expectCompanionConnected(page, request);

  await control(request, "display-set", {
    chart_ids: [FIRST_CHART],
    expected_display_revision: 0,
  });

  await expect(
    page.locator(`[data-displayed-chart-id="${FIRST_CHART}"]`),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "View", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
});

test("operator-authorized display and immersive Exit share actual browser state", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expectCompanionConnected(page, request);

  await control(request, "display-set", {
    chart_ids: [FIRST_CHART, SECOND_CHART],
    expected_display_revision: 0,
  });
  await expect(page.locator(".multi-fullscreen-cell")).toHaveCount(2);

  await page.getByRole("button", { name: "Exit comparison" }).click();
  await expect(page.locator(".multi-fullscreen-cell")).toHaveCount(0);
  await expect
    .poll(async () => stateEvents(request).then((events) => events.at(-1)))
    .toMatchObject({
      type: "display_state_changed",
      payload: {
        change_reason: "manual_close",
        displayed_chart_ids: [],
      },
    });
});

test("manual single, multi-open, and reorder use the same display state", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await expectCompanionConnected(page, request);
  await openDashboardPage(page, "biomedical");

  const firstPanel = page.locator(`[data-panel-id="${FIRST_CHART}"]`);
  await firstPanel.getByRole("button", {
    name: "Focus chart",
  }).click();
  await expect(page.locator(`[data-displayed-chart-id="${FIRST_CHART}"]`)).toBeVisible();
  await page.getByRole("button", { name: "Exit focus" }).click();

  const fullscreenButton = firstPanel.getByRole("button", {
    name: "Focus chart",
  });
  await firstPanel.locator(".chart-view-frame").hover();
  await fullscreenButton.dispatchEvent("pointerdown");
  await expect(
    firstPanel.getByRole("button", {
      name: "Remove chart from comparison",
    }),
  ).toBeVisible();
  await expect(firstPanel.getByRole("button", {
    name: "Remove chart from comparison",
  })).toHaveAttribute("aria-pressed", "true");
  await page
    .locator(`[data-panel-id="${SECOND_CHART}"]`)
    .getByRole("button", { name: "Add chart to comparison" })
    .click();
  await page
    .getByRole("button", { name: "Compare", exact: true })
    .click();
  await expect(page.locator(".multi-fullscreen-cell")).toHaveCount(2);
  const fullscreen = page.getByRole("dialog", { name: "Chart comparison" });
  await expect(fullscreen.getByRole("button", {
    name: "Use side by side layout",
  })).toBeVisible();
  await expect(fullscreen.getByRole("button", {
    name: "Use over-under layout",
  })).toBeVisible();
  await expect(fullscreen.getByText("Chart comparison", { exact: true }))
    .toHaveCount(0);

  await page
    .getByRole("button", { name: "Move Mortality by age group previous" })
    .click();
  await expect
    .poll(async () => stateEvents(request).then((events) => events.at(-1)))
    .toMatchObject({
      payload: {
        change_reason: "manual_reorder",
        displayed_chart_ids: [SECOND_CHART, FIRST_CHART],
      },
    });
});

test("comparison selection caps at four charts and Escape cancels selection", async ({
  page,
}) => {
  await page.goto("/");
  await openDashboardPage(page, "biomedical");

  const panels = page.locator(".chart-panel");
  await expect(panels.nth(4)).toBeAttached();
  const first = panels.nth(0);
  await first.locator(".chart-view-frame").hover();
  await first.getByRole("button", {
    name: "Focus chart",
  }).dispatchEvent("pointerdown");
  await expect(page.getByRole("button", {
    name: "Compare",
    exact: true,
  })).toBeVisible();

  for (let index = 1; index < 4; index += 1) {
    const panel = panels.nth(index);
    await panel.hover();
    await panel.getByRole("button", {
      name: "Add chart to comparison",
    }).click();
  }

  const fifth = panels.nth(4);
  await fifth.hover();
  await fifth.getByRole("button", {
    name: "Add chart to comparison",
  }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Maximum 4 charts allowed",
  );

  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", {
    name: "Compare",
    exact: true,
  })).toHaveCount(0);
  await expect(page.locator(
    '.chart-panel-icon-button[aria-pressed="true"]',
  )).toHaveCount(0);
});

test("stale revisions and invalid chart IDs are rejected promptly", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expectCompanionConnected(page, request);

  await control(request, "display-set", {
    chart_ids: [FIRST_CHART],
    expected_display_revision: 99,
  });
  await control(request, "display-set", {
    chart_ids: ["unknown-chart"],
    expected_display_revision: 0,
  });

  await expect
    .poll(
      async () =>
        (await events(request))
          .filter((event) => event.type === "display_rejected")
          .map((event) => event.payload.reason_code),
      { timeout: 2_000 },
    )
    .toEqual(["stale_revision", "invalid_chart"]);
});

test("reconnect snapshot wins without silently reopening a closed chart", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expectCompanionConnected(page, request);
  await control(request, "display-set", {
    chart_ids: [FIRST_CHART],
    expected_display_revision: 0,
  });
  await page.getByRole("button", { name: "Exit focus" }).click();
  await expect(page.locator(".multi-fullscreen-cell")).toHaveCount(0);

  await control(request, "disconnect");
  await expect.poll(
    async () => (await events(request)).filter(({ type }) => type === "dashboard_hello").length,
    { timeout: 5_000 },
  ).toBeGreaterThanOrEqual(2);
  await expect
    .poll(async () => (await events(request)).findLast((event) => event.type === "dashboard_snapshot"))
    .toMatchObject({
      payload: {
        display_revision: 2,
        displayed_chart_ids: [],
      },
    });
  await expect(page.locator(".multi-fullscreen-cell")).toHaveCount(0);
});

test("stale catalogue disables companion commands", async ({ page, request }) => {
  await control(request, "catalogue-mode", { mode: "stale" });
  const bootstrapResponse = page.waitForResponse((response) => (
    response.url().endsWith("/companion/bootstrap")
  ));
  await page.goto("/");

  expect((await bootstrapResponse).ok()).toBe(true);
  const result = await control(request, "display-set", {
    chart_ids: [FIRST_CHART],
    expected_display_revision: 0,
  });
  expect(result).toEqual({ recipients: 0 });
  await expect(page.locator(".multi-fullscreen-cell")).toHaveCount(0);
});

test("runtime chart-definition drift disables companion commands", async ({
  page,
  request,
}) => {
  const configResponse = await request.get(
    "http://127.0.0.1:4173/config/dashboard.json",
  );
  const config = await configResponse.json();
  const chart = config.pages
    .flatMap(({ sections }) => sections)
    .flatMap(({ panels }) => panels)
    .find(({ id }) => id === SECOND_CHART);
  chart.title = "Locally changed chart meaning";
  await page.addInitScript((savedConfig) => {
    localStorage.setItem(
    "simex-dashboard-config-v3-three-mode-v1",
      JSON.stringify(savedConfig),
    );
  }, config);

  let bootstrapRequests = 0;
  page.on("request", (outgoing) => {
    if (outgoing.url().endsWith("/companion/bootstrap")) bootstrapRequests += 1;
  });
  const catalogueResponse = page.waitForResponse((response) => (
    response.url().endsWith("/integration/quorum-chart-catalogue.json")
  ));
  await page.goto("/");

  expect((await catalogueResponse).ok()).toBe(true);
  await expect(page.getByRole("heading", {
    name: "SimEx Dashboard",
    exact: true,
  })).toBeVisible();
  const result = await control(request, "display-set", {
    chart_ids: [FIRST_CHART],
    expected_display_revision: 0,
  });
  expect(result).toEqual({ recipients: 0 });
  expect(bootstrapRequests).toBe(0);
  expect((await events(request)).some(({ type }) => type === "dashboard_hello")).toBe(false);
  await expect(page.locator(".multi-fullscreen-cell")).toHaveCount(0);
});

test("missing bootstrap preserves standalone dashboard behavior", async ({
  page,
  request,
}) => {
  await control(request, "catalogue-mode", { mode: "absent" });
  const bootstrapResponse = page.waitForResponse((response) => (
    response.url().endsWith("/companion/bootstrap")
  ));
  await page.goto("/");

  expect((await bootstrapResponse).status()).toBe(404);
  await openDashboardPage(page, "biomedical");
  await page
    .locator(`[data-panel-id="${FIRST_CHART}"]`)
    .getByRole("button", { name: "Focus chart" })
    .click();
  await expect(page.locator(".multi-fullscreen-cell")).toHaveCount(1);
});

async function control(request, action, data) {
  const response = await request.post(`${CONTROL_URL}/__test__/${action}`, {
    data,
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function expectCompanionConnected(page, request) {
  await expect.poll(
    async () => (await events(request)).some(({ type }) => type === "dashboard_hello"),
    { timeout: 30_000 },
  ).toBe(true);
  expect(browserErrors.get(page)).toEqual([]);
}

async function events(request) {
  const response = await request.get(`${CONTROL_URL}/__test__/events`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function stateEvents(request) {
  return (await events(request)).filter(
    (event) => event.type === "display_state_changed",
  );
}
