import { test, expect } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";
const FIRST_CHART = "bio_confirmed_cases";
const SECOND_CHART = "bio_mortality_age";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
});

test("operator-authorized display and individual close share actual browser state", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByText("Companion connected")).toBeVisible();

  await control(request, "display-set", {
    chart_ids: [FIRST_CHART, SECOND_CHART],
    expected_display_revision: 0,
  });
  await expect(page.locator(".multi-fullscreen-cell")).toHaveCount(2);

  await page.getByRole("button", { name: `Close ${FIRST_CHART}` }).click();
  await expect(page.locator(".multi-fullscreen-cell")).toHaveCount(1);
  await expect
    .poll(async () => stateEvents(request).then((events) => events.at(-1)))
    .toMatchObject({
      type: "display_state_changed",
      payload: {
        change_reason: "manual_close",
        displayed_chart_ids: [SECOND_CHART],
      },
    });
});

test("manual single, multi-open, and reorder use the same display state", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByText("Companion connected")).toBeVisible();
  await page.getByRole("button", { name: "Biomedical", exact: true }).click();

  const firstPanel = page.locator(`[data-panel-id="${FIRST_CHART}"]`);
  await firstPanel.getByRole("button", { name: "Fullscreen chart" }).click();
  await expect(page.locator(`[data-displayed-chart-id="${FIRST_CHART}"]`)).toBeVisible();
  await page.getByRole("button", { name: "Close all displayed charts" }).click();

  const fullscreenButton = firstPanel.getByRole("button", {
    name: "Fullscreen chart",
  });
  await firstPanel.locator(".chart-canvas").hover();
  await fullscreenButton.hover();
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page
    .locator(`[data-panel-id="${SECOND_CHART}"]`)
    .getByRole("button", { name: "Select" })
    .click();
  await page
    .getByRole("button", { name: /^Multi-fullscreen$/ })
    .click();
  await expect(page.locator(".multi-fullscreen-cell")).toHaveCount(2);

  await page
    .getByRole("button", { name: `Move ${SECOND_CHART} previous` })
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

test("stale revisions and invalid chart IDs are rejected promptly", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByText("Companion connected")).toBeVisible();

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
  await expect(page.getByText("Companion connected")).toBeVisible();
  await control(request, "display-set", {
    chart_ids: [FIRST_CHART],
    expected_display_revision: 0,
  });
  await page.getByRole("button", { name: `Close ${FIRST_CHART}` }).click();
  await expect(page.locator(".multi-fullscreen-cell")).toHaveCount(0);

  await control(request, "disconnect");
  await expect(page.getByText("Companion connected")).toBeVisible({
    timeout: 5_000,
  });
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
  await page.goto("/");

  await expect(page.getByText("Companion unavailable")).toBeVisible();
  await control(request, "display-set", {
    chart_ids: [FIRST_CHART],
    expected_display_revision: 0,
  });
  await expect(page.locator(".multi-fullscreen-cell")).toHaveCount(0);
});

test("missing bootstrap preserves standalone dashboard behavior", async ({
  page,
  request,
}) => {
  await control(request, "catalogue-mode", { mode: "absent" });
  await page.goto("/");

  await expect(page.getByText("Standalone")).toBeVisible();
  await page.getByRole("button", { name: "Biomedical", exact: true }).click();
  await page
    .locator(`[data-panel-id="${FIRST_CHART}"]`)
    .getByRole("button", { name: "Fullscreen chart" })
    .click();
  await expect(page.locator(".multi-fullscreen-cell")).toHaveCount(1);
});

async function control(request, action, data) {
  const response = await request.post(`${CONTROL_URL}/__test__/${action}`, {
    data,
  });
  expect(response.ok()).toBeTruthy();
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
