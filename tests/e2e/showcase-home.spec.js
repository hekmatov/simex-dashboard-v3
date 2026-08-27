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

test("standalone Home orients visitors and routes into both domains", async ({ page }) => {
  const bootstrapResponse = page.waitForResponse((response) => (
    response.url().endsWith("/companion/bootstrap")
  ));
  await openLanding(page);
  await expectLandingReady(page);
  expect((await bootstrapResponse).status()).toBe(404);
  await expect(page.locator("h1")).toHaveCount(1);

  await openDashboardFromLanding(page);
  await expect(
    page.getByRole("heading", { name: "HeV-A26 Dashboard: Epidemiological overview" }),
  ).toBeVisible();
  await expect(page.locator("h1")).toHaveCount(1);

  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expectLandingReady(page);
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

test("saved v3 configuration preserves Home and authored dashboard changes", async ({ page, request }) => {
  const response = await request.get("http://127.0.0.1:4173/config/dashboard.json");
  const savedV3 = await response.json();
  const biomedical = savedV3.pages.find(({ id }) => id === "biomedical");
  biomedical.title = "Saved biomedical briefing";
  biomedical.sections[0].panels[0].title = "Saved cumulative case view";
  biomedical.sections[0].panels[0].layout.size = "wide";

  await page.addInitScript(({ key, config }) => {
    localStorage.setItem(key, JSON.stringify(config));
  }, { key: STORAGE_KEY, config: savedV3 });
  await openLanding(page);

  await expectLandingReady(page);
  const persisted = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
  expect(persisted.configVersion).toBe(3);
  expect(persisted.pages[0].pageType).toBe("landing");
  expect(persisted.pages[0].landing.hero.primaryAction.pageId).toBe("biomedical");
  const persistedBiomedical = persisted.pages.find(({ id }) => id === "biomedical");
  expect(persistedBiomedical.title).toBe("Saved biomedical briefing");
  expect(persistedBiomedical.sections[0].panels[0].title).toBe("Saved cumulative case view");
  expect(persistedBiomedical.sections[0].panels[0].layout.size).toBe("wide");

  await page.getByRole("button", { name: "Biomedical", exact: true }).click();
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

test("builder FAQ keeps summary and answer text legible", async ({ page }) => {
  await openLanding(page);
  await expectLandingReady(page);
  const firstFaq = page.locator(".showcase-faq details").first();
  await expect(firstFaq.locator("summary")).toHaveCSS("color", "rgb(18, 59, 98)");
  await firstFaq.locator("summary").click();
  await expect(firstFaq.locator("p")).toHaveCSS("color", "rgb(78, 103, 125)");
});
