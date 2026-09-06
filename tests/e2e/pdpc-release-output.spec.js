import { expect, test } from "@playwright/test";

const RELEASES = Object.freeze([
  Object.freeze({
    variant: "biomedical",
    baseUrl: "http://127.0.0.1:4191",
    disciplineId: "biomedical",
    disciplineLabel: "Biomedical",
    expectedPanelTitle: "International Confirmed cases (cumulative)",
  }),
  Object.freeze({
    variant: "socioeconomic",
    baseUrl: "http://127.0.0.1:4192",
    disciplineId: "socio_economic",
    disciplineLabel: "Socio-Economic Information",
    expectedPanelTitle: "Loneliness",
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
    await expect(page.locator(".pdpc-release-header")).toHaveCount(0);
    const dashboardHeader = page.locator(".pdpc-dashboard-header");
    await expect(dashboardHeader).toBeVisible();
    await expect(dashboardHeader.getByText(
      "Pandemic & Disaster Preparedness Center",
      { exact: true },
    )).toBeVisible();
    await expect(dashboardHeader.getByRole("heading", {
      name: "WCPH HeV-A26 Simulation",
      exact: true,
    })).toBeVisible();
    await expect(page.getByRole("img", {
      name: "Pandemic and Disaster Preparedness Center (PDPC)",
    })).toBeVisible();
    await expect(dashboardHeader.locator(".pdpc-header-mark, .dashboard-meta")).toHaveCount(0);

    const pageNavigation = dashboardHeader.getByRole("navigation", { name: "Dashboard pages" });
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
      await page.locator(
        '[data-canonical-page-id="scenario"] .canonical-dashboard-content',
      ).innerText(),
    ));
    await pageNavigation.locator(`[data-dashboard-page-id="${release.disciplineId}"]`).click();
    await expect(pageNavigation.locator('[aria-current="page"]')).toHaveText(release.disciplineLabel);
    await expect(page.locator(`[data-canonical-page-id="${release.disciplineId}"]`)).toBeVisible();
    await expect(page.getByText(release.expectedPanelTitle, { exact: true })).toBeVisible();
    await expect(page.locator(".application-recovery")).toHaveCount(0);

    const footer = page.locator("footer.pdpc-dashboard-footer");
    await expect(footer).toHaveAttribute("aria-label", "Dashboard information and feedback");
    await expect(footer.getByText("SimEx Dashboard V3", { exact: true })).toBeVisible();
    const builderLink = footer.getByRole("link", { name: "Build your own dashboard", exact: true });
    await expect(builderLink).toHaveAttribute("href", "https://simex-dashboard-v3.pages.dev/");
    await expect(builderLink).toHaveCSS("text-decoration-line", "underline");
    await expect(footer.getByText("Developed by Hekmat Alrouh", { exact: true })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Report a bug / request a feature" })).toHaveCount(0);
    await expect(footer.getByRole("link", { name: "Developed by Hekmat Alrouh" })).toHaveCount(0);

    await page.goto(`${release.baseUrl}/?surface=audience&channel=abcdefghijklmnop`);
    await expect(page.locator(`[data-pdpc-dashboard-header="${release.variant}"]`)).toBeVisible();
    await expect(page.locator(".audience-display, .dashboard-command-crown")).toHaveCount(0);
    await expect(page.locator('[data-canonical-page-id="scenario"]')).toBeVisible();
    expect(issues).toEqual([]);
  }

  expect(scenarioSnapshots[0]).toBe(scenarioSnapshots[1]);
});

test("the integrated PDPC dashboard header uses theme tokens and reflows without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(RELEASES[0].baseUrl);
  const disclaimer = page.getByLabel("Exercise disclaimer");
  const header = page.locator(".pdpc-dashboard-header");
  await expect(header).toBeVisible();

  const desktop = await page.evaluate(() => {
    const disclaimerNode = document.querySelector(".pdpc-release-disclaimer");
    const headerNode = document.querySelector(".pdpc-dashboard-header");
    const logoNode = headerNode.querySelector(".pdpc-dashboard-logo");
    const identityLabel = headerNode.querySelector(".pdpc-dashboard-identity p");
    const identityTitle = headerNode.querySelector(".pdpc-dashboard-identity h1");
    const activeButton = headerNode.querySelector('[aria-current="page"]');
    const inactiveButton = headerNode.querySelector('button:not([aria-current="page"])');
    const disclaimerStyles = getComputedStyle(disclaimerNode);
    const headerStyles = getComputedStyle(headerNode);
    const headerBox = headerNode.getBoundingClientRect();
    const logoBox = logoNode.getBoundingClientRect();
    return {
      disclaimerPosition: disclaimerStyles.position,
      disclaimerBackground: disclaimerStyles.backgroundColor,
      disclaimerBackgroundToken: disclaimerStyles.getPropertyValue("--simex-surface-panel-alt").trim(),
      disclaimerColor: disclaimerStyles.color,
      disclaimerColorToken: disclaimerStyles.getPropertyValue("--simex-text-strong").trim(),
      disclaimerBorder: disclaimerStyles.borderBottomColor,
      disclaimerBorderToken: disclaimerStyles.getPropertyValue("--simex-border-subtle").trim(),
      headerHeight: headerBox.height,
      identityLabelSize: getComputedStyle(identityLabel).fontSize,
      identityTitleSize: getComputedStyle(identityTitle).fontSize,
      activeBackground: getComputedStyle(activeButton).backgroundColor,
      activeToken: headerStyles.getPropertyValue("--simex-accent").trim(),
      activeColor: getComputedStyle(activeButton).color,
      activeColorToken: headerStyles.getPropertyValue("--simex-on-accent").trim(),
      inactiveBackground: getComputedStyle(inactiveButton).backgroundColor,
      inactiveToken: headerStyles.getPropertyValue("--simex-surface-panel-alt").trim(),
      logoBackground: getComputedStyle(logoNode).backgroundColor,
      logoBorder: getComputedStyle(logoNode).borderTopWidth,
      logoShadow: getComputedStyle(logoNode).boxShadow,
      logoTopGap: logoBox.top - headerBox.top,
      logoBottomGap: headerBox.bottom - logoBox.bottom,
      offset: parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue("--simex-view-only-sticky-offset")),
      measured: disclaimerNode.getBoundingClientRect().height,
    };
  });
  expect(desktop.disclaimerPosition).toBe("sticky");
  expect(desktop.disclaimerBackground).toBe(cssColor(desktop.disclaimerBackgroundToken));
  expect(desktop.disclaimerColor).toBe(cssColor(desktop.disclaimerColorToken));
  expect(desktop.disclaimerBorder).toBe(cssColor(desktop.disclaimerBorderToken));
  expect(Math.abs(desktop.offset - desktop.measured)).toBeLessThanOrEqual(1);
  expect(desktop.headerHeight).toBeCloseTo(185, 0);
  expect(desktop.identityLabelSize).toBe(desktop.identityTitleSize);
  expect(desktop.activeBackground).toBe(cssColor(desktop.activeToken));
  expect(desktop.activeColor).toBe(cssColor(desktop.activeColorToken));
  expect(desktop.inactiveBackground).toBe(cssColor(desktop.inactiveToken));
  expect(desktop.logoBackground).toBe("rgba(0, 0, 0, 0)");
  expect(desktop.logoBorder).toBe("0px");
  expect(desktop.logoShadow).toBe("none");
  expect(desktop.logoTopGap).toBeGreaterThanOrEqual(4.5);
  expect(desktop.logoTopGap).toBeLessThanOrEqual(5.5);
  expect(desktop.logoBottomGap).toBeGreaterThanOrEqual(4.5);
  expect(desktop.logoBottomGap).toBeLessThanOrEqual(5.5);

  await page.setViewportSize({ width: 720, height: 900 });
  await expect(disclaimer).toBeVisible();
  const tablet = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(tablet.overflow).toBeLessThanOrEqual(0);

  await page.setViewportSize({ width: 320, height: 900 });
  await expect(page.getByRole("navigation", { name: "Dashboard pages" }).locator("button")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "WCPH HeV-A26 Simulation" })).toBeVisible();
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

function cssColor(value) {
  const normalized = value.trim().toLowerCase();
  if (!normalized.startsWith("#")) return normalized;
  const hexadecimal = normalized.slice(1);
  const channels = hexadecimal.length === 3
    ? [...hexadecimal].map((channel) => Number.parseInt(channel + channel, 16))
    : [0, 2, 4].map((offset) => Number.parseInt(hexadecimal.slice(offset, offset + 2), 16));
  return `rgb(${channels.join(", ")})`;
}
