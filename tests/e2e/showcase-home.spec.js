import { test, expect } from "@playwright/test";
import { LANDING_CONTRACT, openDashboardFromLanding, openLanding } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";

test.describe.configure({ timeout: 60_000 });

async function expectLandingReady(page) {
  await expect(
    page.getByRole("heading", { name: LANDING_CONTRACT.headline }),
  ).toBeVisible({ timeout: 30_000 });
}

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("Old Homepage Content is absent when Home enters the first ordinary Page through View", async ({ page }) => {
  await openLanding(page);
  await expectLandingReady(page);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Home", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("navigation", { name: "Dashboard pages" })).toHaveCount(0);
  await expect(page.locator('[data-canonical-mode="home"]')).toHaveAttribute("tabindex", "-1");
  await expect(page.locator(".playback-surface, .present-workspace, .dashboard-canvas")).toHaveCount(0);

  await openDashboardFromLanding(page);
  await expect(
    page.getByRole("heading", { name: "Old Homepage Content" }),
  ).toHaveCount(0);
  await expect(page.locator('[data-canonical-page-id="biomedical"]')).toBeVisible();
  await expect(page.locator('[data-canonical-mode="view"]')).toBeFocused();
  await expect(page.getByRole("button", { name: "View", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("navigation", { name: "Dashboard pages" })).toBeVisible();
  await expect(page.locator("h1")).toHaveCount(1);

  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expectLandingReady(page);
  await expect(page.locator('[data-canonical-mode="home"]')).toBeFocused();
});

test("Home exposes the exact public beta orientation contract", async ({ page }) => {
  await openLanding(page);
  await expect(page.getByText("Cloudflare beta", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: LANDING_CONTRACT.primaryAction })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How SimEx works" })).toBeVisible();
  await expect(page.getByRole("heading", { name: LANDING_CONTRACT.faqHeading })).toBeVisible();
  await expect(page.locator(".showcase-faq details")).toHaveCount(7);
  await expect(page.getByRole("link", { name: LANDING_CONTRACT.repositoryLink })).toHaveAttribute("href", "https://github.com/hekmatov/simex-dashboard-v3");
});

test("hero action focus remains visible against the default hero surface", async ({ page }) => {
  await openLanding(page);
  const action = page.locator(".showcase-actions button").first();
  await action.focus();
  const focus = await action.evaluate((button) => {
    const hero = button.closest(".showcase-hero");
    const toRgb = (value) => value.match(/\d+(?:\.\d+)?/g).slice(0, 3).map(Number);
    const luminance = (color) => {
      const channels = toRgb(color).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
    };
    const actionStyle = getComputedStyle(button);
    const heroSurface = getComputedStyle(hero).backgroundColor;
    const focusPaint = actionStyle.outlineColor;
    const [lighter, darker] = [luminance(heroSurface), luminance(focusPaint)].sort((left, right) => right - left);
    return {
      heroSurface,
      focusPaint,
      outlineStyle: actionStyle.outlineStyle,
      contrastRatio: (lighter + 0.05) / (darker + 0.05),
    };
  });

  expect(focus.outlineStyle).toBe("solid");
  expect(focus.focusPaint).not.toBe(focus.heroSurface);
  expect(focus.contrastRatio).toBeGreaterThanOrEqual(3);
});

test("Home inherits Dashboard Look semantic tokens and exposes repository Issues feedback", async ({ page }) => {
  await openLanding(page);
  const before = await readLandingTheme(page);

  await page.getByRole("button", { name: "Dashboard look", exact: true }).click();
  const look = page.getByRole("dialog", { name: "Dashboard look" });
  await look.getByLabel("Signal + Instrument", { exact: true }).check();
  await look.locator('[data-profile-option="signal-instrument/calibrated-steel"] input').check();
  await look.getByLabel("Dark", { exact: true }).check();
  await page.keyboard.press("Escape");

  const after = await readLandingTheme(page);
  expect(after.metadata).toEqual({
    style: "signal-instrument",
    profile: "signal-instrument/calibrated-steel",
    appearance: "dark",
  });
  expect(after.root).toMatchObject({
    background: after.tokens.canvas,
    color: after.tokens.textStrong,
    borderColor: after.tokens.border,
    borderRadius: after.tokens.surfaceRadius,
    fontFamily: after.tokens.bodyFont,
  });
  expect(after.heading).toMatchObject({
    color: after.tokens.onAccent,
    fontFamily: after.tokens.headingFont,
  });
  expect(after.card).toEqual({
    background: after.tokens.panel,
    color: after.tokens.textStrong,
    borderColor: after.tokens.border,
    borderRadius: after.tokens.controlRadius,
  });
  expect(after.cta).toEqual({
    background: after.tokens.onAccent,
    color: after.tokens.accent,
    borderRadius: after.tokens.controlRadius,
  });
  expect(after.faq).toEqual({
    background: after.tokens.panelAlt,
    color: after.tokens.textStrong,
    borderColor: after.tokens.border,
    borderRadius: after.tokens.controlRadius,
    outlineColor: after.tokens.focus,
  });
  expect(after.tokens).not.toEqual(before.tokens);
  expect(after.root).not.toEqual(before.root);
  expect(after.cta).not.toEqual(before.cta);
  expect(after.faq).not.toEqual(before.faq);
  await expect(page.getByRole("link", { name: "Report a bug / request a feature" }))
    .toHaveAttribute("href", LANDING_CONTRACT.issuesLink);
  await expect(page.getByRole("link", { name: "Report a bug / request a feature" }))
    .toHaveAttribute("target", "_blank");
  await expect(page.getByRole("link", { name: "Report a bug / request a feature" }))
    .toHaveAttribute("rel", "noreferrer");
});

test("saved V6 configuration preserves canonical Home availability and authored dashboard changes", async ({ page, request }) => {
  const response = await request.get("http://127.0.0.1:4173/config/dashboard.json");
  const savedV6 = await response.json();
  const biomedical = savedV6.pages.find(({ id }) => id === "biomedical");
  biomedical.title = "Saved biomedical briefing";
  biomedical.sections[0].panels[0].title = "Saved cumulative case view";
  biomedical.sections[0].panels[0].layout.size = "wide";

  await page.addInitScript(({ key, config }) => {
    localStorage.setItem(key, JSON.stringify(config));
  }, { key: STORAGE_KEY, config: savedV6 });
  await openLanding(page);

  await expectLandingReady(page);
  const persisted = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
  expect(persisted.configVersion).toBe(6);
  expect(persisted.home).toEqual({ enabled: true });
  expect(persisted.pages.some(({ id }) => id === "home")).toBe(false);
  const persistedBiomedical = persisted.pages.find(({ id }) => id === "biomedical");
  expect(persistedBiomedical.title).toBe("Saved biomedical briefing");
  expect(persistedBiomedical.sections[0].panels[0].title).toBe("Saved cumulative case view");
  expect(persistedBiomedical.sections[0].panels[0].layout.size).toBe("wide");

  await openDashboardFromLanding(page);
  await page.locator('[data-dashboard-page-id="biomedical"]').click();
  await expect(page.getByRole("heading", { name: "Saved biomedical briefing" })).toBeVisible();
});

test("preview failure preserves the complete landing journey", async ({ page }) => {
  await page.route("**/assets/showcase-dashboard-preview.png", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".showcase-landing-preview")).toHaveCount(0);
  await expectLandingReady(page);
  await expect(page.getByRole("button", { name: LANDING_CONTRACT.primaryAction })).toBeVisible();
});

test("phone layout remains readable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openLanding(page);
  await expectLandingReady(page);
  await expect(page.getByRole("heading", { name: "How SimEx works" })).toBeVisible();
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
  await expect(page.locator(".showcase-capability-grid article")).toHaveCount(3);
  await expect(page.locator(".showcase-hero")).toHaveCSS("display", "grid");
});

test("retired Vanta background stays absent across reduced-motion preference changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openLanding(page);
  await expectLandingReady(page);
  await expect(page.locator("#vanta-background .vanta-canvas")).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("#vanta-background .vanta-canvas")).toHaveCount(0);
  await expectLandingReady(page);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("#vanta-background .vanta-canvas")).toHaveCount(0);
});

test("Vanta startup failure leaves the dashboard usable", async ({ page }) => {
  await page.route("**/vendor/vanta.net.min.js", (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: `window.VANTA = {
      NET() {
        throw new Error("forced WebGL initialization failure");
      },
    };`,
  }));

  await page.goto("/");

  await expect(page.locator("#root")).not.toBeEmpty({ timeout: 10_000 });
  await expect(
    page.getByRole("heading", { name: LANDING_CONTRACT.headline }),
  ).toBeVisible({ timeout: 10_000 });
});

test("builder FAQ uses the active semantic text paint", async ({ page }) => {
  await openLanding(page);
  await expectLandingReady(page);
  const firstFaq = page.locator(".showcase-faq details").first();
  await firstFaq.locator("summary").click();
  const paints = await firstFaq.evaluate((node) => {
    const root = document.querySelector(".showcase-landing");
    const probe = (variable) => {
      const element = document.createElement("span");
      element.style.color = `var(${variable})`;
      root.append(element);
      const value = getComputedStyle(element).color;
      element.remove();
      return value;
    };
    return {
      summary: getComputedStyle(node.querySelector("summary")).color,
      answer: getComputedStyle(node.querySelector("p")).color,
      textStrong: probe("--simex-text-strong"),
      textMuted: probe("--simex-text-muted"),
    };
  });
  expect(paints.summary).toBe(paints.textStrong);
  expect(paints.answer).toBe(paints.textMuted);
});

async function readLandingTheme(page) {
  return page.evaluate(() => {
    const root = document.querySelector(".showcase-landing");
    const app = document.querySelector(".app-frame");
    const card = root.querySelector(".showcase-capability-grid article");
    const cta = root.querySelector(".showcase-actions button");
    const summary = root.querySelector(".showcase-faq summary");
    const details = root.querySelector(".showcase-faq details");
    summary.focus();
    const probe = (variable, property) => {
      const element = document.createElement("span");
      element.style[property] = `var(${variable})`;
      root.append(element);
      const value = getComputedStyle(element)[property];
      element.remove();
      return value;
    };
    const read = (element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        color: style.color,
        borderColor: style.borderTopColor,
        borderRadius: style.borderRadius,
      };
    };
    return {
      metadata: {
        style: app.dataset.dashboardStyle,
        profile: app.dataset.dashboardColorProfile,
        appearance: app.dataset.resolvedAppearance,
      },
      tokens: {
        canvas: probe("--simex-surface-canvas", "backgroundColor"),
        panel: probe("--simex-surface-panel", "backgroundColor"),
        panelAlt: probe("--simex-surface-panel-alt", "backgroundColor"),
        textStrong: probe("--simex-text-strong", "color"),
        border: probe("--simex-border-subtle", "borderTopColor"),
        accent: probe("--simex-accent", "backgroundColor"),
        onAccent: probe("--simex-on-accent", "color"),
        focus: probe("--simex-focus", "outlineColor"),
        surfaceRadius: getComputedStyle(root).getPropertyValue("--simex-style-surface-radius").trim(),
        controlRadius: getComputedStyle(root).getPropertyValue("--simex-style-control-radius").trim(),
        bodyFont: probe("--simex-style-body-font", "fontFamily"),
        headingFont: probe("--simex-style-heading-font", "fontFamily"),
      },
      root: { ...read(root), fontFamily: getComputedStyle(root).fontFamily },
      heading: { color: getComputedStyle(root.querySelector("h1")).color, fontFamily: getComputedStyle(root.querySelector("h1")).fontFamily },
      card: read(card),
      cta: (() => {
        const style = getComputedStyle(cta);
        return { background: style.backgroundColor, color: style.color, borderRadius: style.borderRadius };
      })(),
      faq: (() => {
        const style = getComputedStyle(details);
        const summaryStyle = getComputedStyle(summary);
        return {
          background: style.backgroundColor,
          color: summaryStyle.color,
          borderColor: style.borderTopColor,
          borderRadius: style.borderRadius,
          outlineColor: summaryStyle.outlineColor,
        };
      })(),
    };
  });
}
