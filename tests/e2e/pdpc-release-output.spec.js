import { expect, test } from "@playwright/test";

const RELEASES = Object.freeze([
  Object.freeze({
    variant: "biomedical",
    baseUrl: "http://127.0.0.1:4191",
    disciplineId: "biomedical",
    disciplineLabel: "Biomedical",
  }),
  Object.freeze({
    variant: "socioeconomic",
    baseUrl: "http://127.0.0.1:4192",
    disciplineId: "socio_economic",
    disciplineLabel: "Socio-economic",
  }),
]);

test("both generated outputs enforce their exact view-only page pair", async ({ page }) => {
  const scenarioSnapshots = [];
  for (const release of RELEASES) {
    const issues = observeRuntimeIssues(page, release.baseUrl);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${release.baseUrl}/?mode=build`, { waitUntil: "domcontentloaded" });

    await expect(page.getByLabel("Exercise disclaimer")).toContainText(
      "Fictional scenario · Exercise use only",
    );
    await expect(page.getByRole("img", {
      name: "Pandemic and Disaster Preparedness Center (PDPC)",
    })).toBeVisible();
    await expect(page.getByText("Simulation exercise", { exact: true })).toBeVisible();

    const pageNavigation = page.getByRole("navigation", { name: "Dashboard pages" });
    await expect(pageNavigation.locator("button")).toHaveCount(2);
    await expect(pageNavigation.locator("button").nth(0)).toHaveText("Scenario");
    await expect(pageNavigation.locator("button").nth(1)).toHaveText(release.disciplineLabel);
    await expect(pageNavigation.locator('[aria-current="page"]')).toHaveText("Scenario");
    await expect(page.locator('[data-canonical-page-id="scenario"]')).toBeVisible();

    await expect(page.locator(".dashboard-command-crown")).toHaveCount(0);
    await expect(page.locator("button[data-dashboard-mode]")).toHaveCount(0);
    await expect(page.locator(".build-workspace, .present-workspace, .audience-display")).toHaveCount(0);

    const packageImages = page.locator('img[src*="assets/package/"]');
    await expect(packageImages.first()).toBeVisible();
    expect(await packageImages.evaluateAll((images) => images.every((image) => (
      image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
    )))).toBe(true);

    scenarioSnapshots.push(normalizeText(
      await page.locator('[data-canonical-page-id="scenario"]').innerText(),
    ));
    await pageNavigation.locator(`[data-dashboard-page-id="${release.disciplineId}"]`).click();
    await expect(pageNavigation.locator('[aria-current="page"]')).toHaveText(release.disciplineLabel);
    await expect(page.locator(`[data-canonical-page-id="${release.disciplineId}"]`)).toBeVisible();

    await page.goto(`${release.baseUrl}/?surface=audience&channel=abcdefghijklmnop`);
    await expect(page.locator(`[data-pdpc-release-header="${release.variant}"]`)).toBeVisible();
    await expect(page.locator(".audience-display, .dashboard-command-crown")).toHaveCount(0);
    await expect(page.locator('[data-canonical-page-id="scenario"]')).toBeVisible();
    expect(issues).toEqual([]);
  }

  expect(scenarioSnapshots[0]).toBe(scenarioSnapshots[1]);
});

test("the generated PDPC shell keeps its approved sticky and narrow reflow behavior", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(RELEASES[0].baseUrl);
  const disclaimer = page.getByLabel("Exercise disclaimer");
  const header = page.locator(".pdpc-release-header");
  await expect(header).toBeVisible();

  const desktop = await page.evaluate(() => {
    const disclaimerNode = document.querySelector(".pdpc-release-disclaimer");
    const headerNode = document.querySelector(".pdpc-release-header");
    return {
      disclaimerPosition: getComputedStyle(disclaimerNode).position,
      headerPosition: getComputedStyle(headerNode).position,
      offset: parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue("--simex-view-only-sticky-offset")),
      measured: disclaimerNode.getBoundingClientRect().height + headerNode.getBoundingClientRect().height,
    };
  });
  expect(desktop.disclaimerPosition).toBe("sticky");
  expect(desktop.headerPosition).toBe("sticky");
  expect(Math.abs(desktop.offset - desktop.measured)).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 720, height: 900 });
  await expect(disclaimer).toBeVisible();
  const tablet = await page.evaluate(() => ({
    headerPosition: getComputedStyle(document.querySelector(".pdpc-release-header")).position,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(tablet.headerPosition).toBe("relative");
  expect(tablet.overflow).toBeLessThanOrEqual(0);

  await page.setViewportSize({ width: 320, height: 900 });
  await expect(page.getByRole("navigation", { name: "Dashboard pages" }).locator("button")).toHaveCount(2);
  await expect(page.getByText("Simulation exercise", { exact: true })).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

  await page.setViewportSize({ width: 640, height: 900 });
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  await expect(disclaimer).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Dashboard pages" }).locator("button")).toHaveCount(2);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

function observeRuntimeIssues(page, localBaseUrl) {
  const issues = [];
  page.on("pageerror", (error) => issues.push(`pageerror:${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") issues.push(`console:${message.text()}`);
  });
  page.on("request", (request) => {
    const url = request.url();
    if (!url.startsWith(localBaseUrl) && !/^(?:data|blob):/.test(url)) {
      issues.push(`remote:${url}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) issues.push(`response:${response.status()}:${response.url()}`);
  });
  return issues;
}

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

async function horizontalOverflow(page) {
  return page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ));
}
