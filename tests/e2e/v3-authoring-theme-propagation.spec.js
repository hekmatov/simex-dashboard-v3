import { expect, test } from "@playwright/test";

test("selected dashboard style reaches every Build authoring surface", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/");
  await page.getByRole("button", { name: "Dashboard look", exact: true }).click();
  const look = page.getByRole("dialog", { name: "Dashboard look" });
  await look.getByLabel("Signal + Instrument", { exact: true }).check();
  await look.locator('[data-profile-option="signal-instrument/calibrated-steel"] input').check();
  await page.keyboard.press("Escape");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Build panel", exact: true }).click();

  for (const label of ["Chrono Studio", "Scene Studio", "Pages & sections"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    const surface = page.locator(".build-authoring-auxiliary");
    await expect(surface).toBeVisible();
    await expectSelectedThemeChrome(surface);
    await expectNoRetiredDashboardPaint(surface);
    await surface.getByRole("button", { name: "Close", exact: true }).click();
  }

  await page.locator(".dashboard-scenario-trigger").click();
  const passport = page.getByRole("complementary", { name: "Scenario Passport" });
  await expect(passport).toBeVisible();
  await expectSelectedThemeChrome(passport);
  await expectNoRetiredDashboardPaint(passport);
  await passport.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("button", { name: "Add chart", exact: true }).click();
  const wizard = page.locator(".chart-wizard");
  await expect(wizard).toBeVisible();
  await expectSelectedThemeChrome(wizard);
  await expectNoRetiredDashboardPaint(wizard);
  const wizardParts = await wizard.evaluate((node) => {
    const tokenPaint = (variable) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${variable})`;
      node.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    };
    const read = (selector) => {
      const style = getComputedStyle(node.querySelector(selector));
      return { background: style.backgroundColor, color: style.color, borderColor: style.borderTopColor };
    };
    return {
      expectedPanel: tokenPaint("--simex-surface-panel"),
      expectedPanelAlt: tokenPaint("--simex-surface-panel-alt"),
      expectedText: tokenPaint("--simex-text-strong"),
      expectedBorder: tokenPaint("--simex-border-subtle"),
      header: read(".chart-wizard-header"),
      body: read(".chart-wizard-body"),
      footer: read(".chart-wizard-footer"),
      proofCard: read(".chart-creation-proof"),
    };
  });
  expect(wizardParts.header).toEqual({
    background: wizardParts.expectedPanel,
    color: wizardParts.expectedText,
    borderColor: wizardParts.expectedBorder,
  });
  expect(wizardParts.body).toMatchObject({
    background: wizardParts.expectedPanelAlt,
    color: wizardParts.expectedText,
  });
  expect(wizardParts.footer).toEqual({
    background: wizardParts.expectedPanel,
    color: wizardParts.expectedText,
    borderColor: wizardParts.expectedBorder,
  });
  expect(wizardParts.proofCard).toEqual({
    background: wizardParts.expectedPanelAlt,
    color: wizardParts.expectedText,
    borderColor: wizardParts.expectedBorder,
  });
});

test("Unit Orbit retains the selected theme outside AppFrame", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Edit chart", exact: true }).first().click();
  const orbit = page.locator(".unit-orbit");
  await expect(orbit).toBeVisible();
  await expectSelectedThemeChrome(orbit);
});

test("View Chrono and Present controls contain no retired dashboard paint", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true }).click();

  await page.getByRole("button", { name: "Chrono view", exact: true }).click();
  const chrono = page.getByRole("region", { name: "Chrono playback controls" });
  await expect(chrono).toBeVisible();
  await expectNoRetiredDashboardPaint(chrono);

  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Present", exact: true }).click();
  const present = page.locator(".present-workspace");
  await expect(present).toBeVisible();
  await expectNoRetiredDashboardPaint(present);
});

test("standalone source viewer receives the selected dashboard style", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Dashboard look", exact: true }).click();
  const look = page.getByRole("dialog", { name: "Dashboard look" });
  await look.getByLabel("Signal + Instrument", { exact: true }).check();
  await look.locator('[data-profile-option="signal-instrument/calibrated-steel"] input').check();
  await page.keyboard.press("Escape");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Edit chart", exact: true }).first().click();

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "View source CSV", exact: true }).first().click();
  const viewer = await popupPromise;
  const root = viewer.locator(".source-viewer-theme-root");
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute("data-dashboard-style", "signal-instrument");
  await expect(root).toHaveAttribute("data-dashboard-color-profile", "signal-instrument/calibrated-steel");
  await expectNoRetiredDashboardPaint(root);
  await viewer.close();
});

async function expectSelectedThemeChrome(locator) {
  const result = await locator.evaluate((node) => {
    const app = document.querySelector(".app-frame");
    const tokenPaint = (variable) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${variable})`;
      node.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    };
    const style = getComputedStyle(node);
    return {
      appStyle: app.dataset.dashboardStyle,
      surfaceStyle: node.dataset.dashboardStyle ?? app.dataset.dashboardStyle,
      appProfile: app.dataset.dashboardColorProfile,
      surfaceProfile: node.dataset.dashboardColorProfile ?? app.dataset.dashboardColorProfile,
      expectedBackground: tokenPaint("--simex-surface-panel"),
      expectedText: tokenPaint("--simex-text-strong"),
      expectedRadius: getComputedStyle(node).getPropertyValue("--simex-style-surface-radius").trim(),
      expectedFont: getComputedStyle(app).fontFamily,
      background: style.backgroundColor,
      color: style.color,
      borderRadius: style.borderRadius,
      fontFamily: style.fontFamily,
    };
  });
  expect(result.surfaceStyle).toBe(result.appStyle);
  expect(result.surfaceProfile).toBe(result.appProfile);
  expect(result.background).toBe(result.expectedBackground);
  expect(result.color).toBe(result.expectedText);
  expect(result.borderRadius).toBe(result.expectedRadius);
  expect(result.fontFamily).toBe(result.expectedFont);
}

async function expectNoRetiredDashboardPaint(locator) {
  const retired = [
    "rgb(8, 34, 74)", "rgb(4, 59, 203)", "rgb(245, 248, 251)",
    "rgb(248, 251, 255)", "rgb(216, 226, 236)", "rgb(234, 241, 246)",
    "rgb(238, 244, 248)", "rgb(225, 233, 240)", "rgb(80, 106, 130)",
    "rgb(106, 127, 146)", "rgb(54, 81, 106)",
  ];
  const hits = await locator.evaluate((root, values) => {
    const retiredPaint = new Set(values);
    return [root, ...root.querySelectorAll("*")].flatMap((element) => {
      const style = getComputedStyle(element);
      const properties = ["color", "backgroundColor", "borderTopColor"]
        .filter((property) => retiredPaint.has(style[property]));
      return properties.length
        ? [{
            tag: element.tagName,
            className: String(element.className ?? ""),
            text: String(element.innerText ?? "").trim().slice(0, 80),
            paint: Object.fromEntries(properties.map((property) => [property, style[property]])),
          }]
        : [];
    });
  }, retired);
  expect(hits).toEqual([]);
}
