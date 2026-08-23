import { expect, test } from "@playwright/test";

import { expectNoRetiredDashboardStyle } from "./support/dashboard-style-audit.js";

const STYLE_OPTIONS = [
  { label: "Evidence Ledger", profile: "evidence-ledger/brighter-vellum" },
  { label: "Humanist Standard", profile: "humanist-standard/common-ground" },
  { label: "Signal + Instrument", profile: "signal-instrument/calibrated-steel" },
];

test("selected style owns hover, focus, disabled, generated, SVG, and portal paint", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true }).click();

  for (const style of STYLE_OPTIONS) {
    await page.getByRole("button", { name: "Dashboard look", exact: true }).click();
    const look = page.getByRole("dialog", { name: "Dashboard look" });
    await look.getByLabel(style.label, { exact: true }).check();
    await look.locator(`[data-profile-option="${style.profile}"] input`).check();
    await page.keyboard.press("Escape");

    for (const pageName of ["Home", "Biomedical", "Socio-economic"]) {
      await page.locator(".dashboard-command-page-scroller")
        .getByRole("button", { name: pageName, exact: true }).click();
      await expectNoRetiredDashboardStyle(page);
    }
    await page.locator(".dashboard-command-page-scroller")
      .getByRole("button", { name: "Biomedical", exact: true }).click();

    const icon = page.locator(".simex-icon-control:visible").first();
    await icon.hover();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await expectNoRetiredDashboardStyle(page);

    await icon.focus();
    await expectNoRetiredDashboardStyle(page);
    await page.keyboard.press("Escape");
  }
});

test("Build studios, wizard validation, and Chrono interaction states use selected style", async ({ page }) => {
  test.setTimeout(120_000);
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
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();

  for (const name of ["Chrono Studio", "Scene Studio", "Pages & sections"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator(".build-authoring-auxiliary")).toBeVisible();
    await expectNoRetiredDashboardStyle(page);
    await page.locator(".build-authoring-auxiliary").getByRole("button", { name: "Close", exact: true }).click();
  }

  await page.locator(".dashboard-scenario-trigger").click();
  const passport = page.getByRole("complementary", { name: "Scenario Passport" });
  await expect(passport).toBeVisible();
  await expectNoRetiredDashboardStyle(page);
  await passport.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("button", { name: "Add chart", exact: true }).click();
  const wizard = page.locator(".chart-wizard");
  await expect(wizard).toBeVisible();
  await wizard.getByRole("button", { name: /Review/ }).click();
  await expect(wizard.locator(".chart-creation-issues")).toBeVisible();
  await expectNoRetiredDashboardStyle(page);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "View", exact: true }).click();
  await expect(page.locator(".app-frame")).toHaveAttribute("data-dashboard-mode", "view");
  await page.getByRole("button", { name: "Chrono view", exact: true }).click();
  const chrono = page.getByRole("region", { name: "Chrono playback controls" });
  await chrono.getByRole("button", { name: "Show availability information" }).click();
  await expectNoRetiredDashboardStyle(page);
});

test("phone View remains selected-style clean", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".app-frame")).toBeVisible();
  await expectNoRetiredDashboardStyle(page);
});
