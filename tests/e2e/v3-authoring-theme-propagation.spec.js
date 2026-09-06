import { expect, test } from "@playwright/test";
import { openDashboardPage } from "./support/landingWorkflow.js";

const RADIUS_VARIABLE_BY_SURFACE_ROLE = Object.freeze({
  surface: "--simex-style-surface-radius",
  panel: "--simex-style-panel-radius",
  editor: "--simex-style-panel-radius",
  dialog: "--simex-style-panel-radius",
});

test("catalogue exposes the exact renamed styles and profiles without retired choices", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Theme", exact: true }).click();
  const look = page.getByRole("dialog", { name: "Theme" });
  await expect(look.locator('input[name="dashboard-style"]')).toHaveCount(4);
  await expect(look.locator('input[name="dashboard-profile"]')).toHaveCount(14);
  await expect(look.getByRole("group", { name: "Visual style", exact: true }).getByLabel("PDPC", { exact: true })).toHaveCount(1);
  await expect(look.getByRole("group", { name: "Colour profile", exact: true }).getByLabel("PDPC", { exact: true })).toHaveCount(1);
  for (const label of [
    "Ledger", "Humanist", "Instrument",
    "Vellum", "Register", "Archive", "Common Ground", "Forum", "Steel",
    "Telemetry", "Amber", "Prismatic", "Ladder", "Sunrise", "Lakeside", "Monochrome",
  ]) {
    await expect(look.getByLabel(label, { exact: true })).toHaveCount(1);
  }
  for (const label of [
    "Evidence Ledger", "Humanist Standard", "Signal + Instrument",
    "Quiet Commons", "Chromatic Polarity",
  ]) {
    await expect(look.getByLabel(label, { exact: true })).toHaveCount(0);
  }
});

test("selected dashboard style reaches every Build authoring surface", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/");
  await page.getByRole("button", { name: "Theme", exact: true }).click();
  const look = page.getByRole("dialog", { name: "Theme" });
  await look.getByLabel("Instrument", { exact: true }).check();
  await look.locator('[data-profile-option="signal-instrument/calibrated-steel"] input').check();
  await look.getByRole("button", { name: "Close Theme", exact: true }).click();
  await openDashboardPage(page, "biomedical");
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();

  await page.getByRole("button", { name: "Chrono Studio", exact: true }).click();
  let surface = page.locator(".build-authoring-auxiliary");
  await expect(surface).toBeVisible();
  await expectSelectedThemeChrome(surface, "editor");
  await expectNoRetiredDashboardPaint(surface);
  await surface.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("button", { name: "More", exact: true }).click();
  const more = page.getByRole("dialog", { name: "More Build commands" });
  await expect(more).toBeVisible();
  await more.getByRole("button", { name: "Scene Studio", exact: true }).click();
  surface = page.locator(".build-authoring-auxiliary");
  await expect(surface).toBeVisible();
  await expectSelectedThemeChrome(surface, "editor");
  await expectNoRetiredDashboardPaint(surface);
  await surface.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pages & sections", exact: true })).toHaveCount(0);

  await page.locator(".dashboard-scenario-trigger").click();
  const passport = page.getByRole("complementary", { name: "Scenario Passport" });
  await expect(passport).toBeVisible();
  await expectSelectedThemeChrome(passport, "panel");
  await expectNoRetiredDashboardPaint(passport);
  await passport.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("button", { name: "Add chart", exact: true }).click();
  const wizard = page.locator(".chart-wizard");
  await expect(wizard).toBeVisible();
  await expectSelectedThemeChrome(wizard, "dialog");
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
    const read = (selector, borderProperty = "borderTopColor") => {
      const style = getComputedStyle(node.querySelector(selector));
      return { background: style.backgroundColor, color: style.color, borderColor: style[borderProperty] };
    };
    return {
      expectedPanel: tokenPaint("--simex-surface-panel"),
      expectedPanelAlt: tokenPaint("--simex-surface-panel-alt"),
      expectedCanvas: tokenPaint("--simex-surface-canvas"),
      expectedText: tokenPaint("--simex-text-strong"),
      expectedMuted: tokenPaint("--simex-text-muted"),
      expectedBorder: tokenPaint("--simex-border-subtle"),
      header: read(".chart-wizard-header", "borderBottomColor"),
      body: read(".chart-wizard-body"),
      footer: read(".chart-wizard-footer"),
      proofDeck: read(".chart-creation-proof-deck"),
      proofCard: read(".chart-creation-proof"),
      proofEyebrow: read(".chart-proof-eyebrow"),
    };
  });
  expect(wizardParts.header).toEqual({
    background: wizardParts.expectedPanelAlt,
    color: wizardParts.expectedText,
    borderColor: wizardParts.expectedBorder,
  });
  expect(wizardParts.body).toMatchObject({
    background: wizardParts.expectedCanvas,
    color: wizardParts.expectedText,
  });
  expect(wizardParts.footer).toEqual({
    background: wizardParts.expectedPanelAlt,
    color: wizardParts.expectedText,
    borderColor: wizardParts.expectedBorder,
  });
  expect(wizardParts.proofCard).toEqual({
    background: wizardParts.expectedPanelAlt,
    color: wizardParts.expectedText,
    borderColor: wizardParts.expectedBorder,
  });
  expect(wizardParts.proofDeck).toMatchObject({
    background: wizardParts.expectedPanel,
    color: wizardParts.expectedText,
  });
  expect(wizardParts.proofEyebrow.color).toBe(wizardParts.expectedMuted);
});

test("Unit Orbit retains the selected theme outside AppFrame", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Edit chart", exact: true }).first().click();
  const orbit = page.locator(".unit-orbit");
  await expect(orbit).toBeVisible();
  await expectSelectedThemeChrome(orbit, "panel");
});

test("View Chrono and Present controls contain no retired dashboard paint", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");

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
  await page.getByRole("button", { name: "Theme", exact: true }).click();
  const look = page.getByRole("dialog", { name: "Theme" });
  await look.getByLabel("Instrument", { exact: true }).check();
  await look.locator('[data-profile-option="signal-instrument/calibrated-steel"] input').check();
  await look.getByRole("button", { name: "Close Theme", exact: true }).click();
  await openDashboardPage(page, "biomedical");
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

async function expectSelectedThemeChrome(locator, surfaceRole) {
  const radiusVariable = RADIUS_VARIABLE_BY_SURFACE_ROLE[surfaceRole];
  if (!radiusVariable) throw new Error(`Unknown dashboard surface role: ${surfaceRole}`);
  const result = await locator.evaluate((node, expectedRadiusVariable) => {
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
      expectedBackground: tokenPaint(
        node.classList.contains("dashboard-dialog--workspace")
          ? "--simex-surface-canvas"
          : "--simex-surface-panel",
      ),
      expectedText: tokenPaint("--simex-text-strong"),
      expectedRadius: getComputedStyle(node).getPropertyValue(expectedRadiusVariable).trim(),
      expectedFont: getComputedStyle(app).fontFamily,
      background: style.backgroundColor,
      color: style.color,
      borderRadius: style.borderRadius,
      fontFamily: style.fontFamily,
    };
  }, radiusVariable);
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
    "rgb(200, 246, 231)",
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
