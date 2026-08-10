import { test, expect } from "@playwright/test";

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
      name: "From complex exercise data to shared situational awareness",
    }),
  ).toBeVisible();
  await expectCompanionConnected(page);

  await control(request, "display-set", {
    chart_ids: [FIRST_CHART],
    expected_display_revision: 0,
  });

  await expect(
    page.locator(`[data-displayed-chart-id="${FIRST_CHART}"]`),
  ).toBeVisible();
});

test("operator-authorized display and individual close share actual browser state", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expectCompanionConnected(page);

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
  test.setTimeout(60_000);
  await page.goto("/");
  await expectCompanionConnected(page);
  await page.getByRole("button", { name: "Biomedical", exact: true }).click();

  const firstPanel = page.locator(`[data-panel-id="${FIRST_CHART}"]`);
  await firstPanel.getByRole("button", {
    name: "Open chart fullscreen",
  }).click();
  await expect(page.locator(`[data-displayed-chart-id="${FIRST_CHART}"]`)).toBeVisible();
  await page.getByRole("button", { name: "Close all displayed charts" }).click();

  const fullscreenButton = firstPanel.getByRole("button", {
    name: "Open chart fullscreen",
  });
  await firstPanel.locator(".chart-view-frame").hover();
  await fullscreenButton.dispatchEvent("pointerdown");
  await expect(
    firstPanel.getByRole("button", {
      name: "Remove chart from multi-fullscreen",
    }),
  ).toBeVisible();
  await expect(firstPanel.getByRole("button", {
    name: "Remove chart from multi-fullscreen",
  })).toHaveAttribute("aria-pressed", "true");
  await page
    .locator(`[data-panel-id="${SECOND_CHART}"]`)
    .getByRole("button", { name: "Add chart to multi-fullscreen" })
    .click();
  await page
    .getByRole("button", { name: "Enter multi-fullscreen" })
    .click();
  await expect(page.locator(".multi-fullscreen-cell")).toHaveCount(2);
  const fullscreen = page.getByRole("dialog", { name: "Displayed charts" });
  await expect(fullscreen.getByRole("button", {
    name: "Use side by side layout",
  })).toBeVisible();
  await expect(fullscreen.getByRole("button", {
    name: "Use over-under layout",
  })).toBeVisible();
  await expect(fullscreen.getByText("Displayed charts", { exact: true }))
    .toHaveCount(0);

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

test("multi-fullscreen selection caps at four charts and Escape cancels selection", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Biomedical", exact: true }).click();

  const panels = page.locator(".chart-panel");
  await expect(panels.nth(4)).toBeAttached();
  const first = panels.nth(0);
  await first.locator(".chart-view-frame").hover();
  await first.getByRole("button", {
    name: "Open chart fullscreen",
  }).dispatchEvent("pointerdown");
  await expect(page.getByRole("button", {
    name: "Enter multi-fullscreen",
  })).toBeVisible();

  for (let index = 1; index < 4; index += 1) {
    const panel = panels.nth(index);
    await panel.hover();
    await panel.getByRole("button", {
      name: "Add chart to multi-fullscreen",
    }).click();
  }

  const fifth = panels.nth(4);
  await fifth.hover();
  await fifth.getByRole("button", {
    name: "Add chart to multi-fullscreen",
  }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Maximum 4 charts allowed",
  );

  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", {
    name: "Enter multi-fullscreen",
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
  await expectCompanionConnected(page);

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
  await expectCompanionConnected(page);
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

  await page.goto("/");

  await expect(page.getByText("Companion unavailable")).toBeVisible({
    timeout: 20_000,
  });
  await expect
    .poll(async () =>
      (await events(request)).some(
        (event) => event.type === "dashboard_hello",
      ),
    )
    .toBe(false);
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
    .getByRole("button", { name: "Open chart fullscreen" })
    .click();
  await expect(page.locator(".multi-fullscreen-cell")).toHaveCount(1);
});

async function control(request, action, data) {
  const response = await request.post(`${CONTROL_URL}/__test__/${action}`, {
    data,
  });
  expect(response.ok()).toBeTruthy();
}

async function expectCompanionConnected(page) {
  await expect(page.getByText("Companion connected")).toBeVisible({
    timeout: 30_000,
  });
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
