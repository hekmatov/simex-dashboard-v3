import { test, expect } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3";
const LANDING_HEADLINE = "From complex exercise data to shared situational awareness";

test.describe.configure({ timeout: 60_000 });

async function expectLandingReady(page) {
  await expect(
    page.getByRole("heading", { name: LANDING_HEADLINE }),
  ).toBeVisible({ timeout: 30_000 });
}

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("standalone Home orients visitors and routes into both domains", async ({ page }) => {
  await page.goto("/");
  await expectLandingReady(page);
  await expect(page.getByText("Standalone", { exact: true })).toBeVisible();
  await expect(page.locator("h1")).toHaveCount(1);

  await page.getByRole("button", { name: "Explore the live dashboard" }).click();
  await expect(
    page.getByRole("heading", { name: "HeV-A26 Dashboard: Epidemiological overview" }),
  ).toBeVisible();
  await expect(page.locator("h1")).toHaveCount(1);

  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Explore Socio-economic" }).click();
  await expect(
    page.getByRole("heading", { name: "HeV-A26 Dashboard: Socio-economic Overview" }),
  ).toBeVisible();
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
  await page.goto("/");

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
  await expect(page.getByRole("button", { name: "Explore the live dashboard" })).toBeVisible();
});

test("phone layout remains readable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expectLandingReady(page);
  await expect(page.getByRole("heading", { name: "Support the exercise information cycle" })).toBeVisible();
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
  await expect(page.locator(".showcase-route")).toHaveCount(2);
  await expect(page.locator(".showcase-hero")).toHaveCSS("display", "grid");
});

test("Vanta follows reduced-motion preference changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expectLandingReady(page);
  await expect(page.locator("#vanta-background .vanta-canvas")).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("#vanta-background .vanta-canvas")).toHaveCount(1);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("#vanta-background .vanta-canvas")).toHaveCount(0);
});

test("route-card supporting text uses high-contrast foregrounds", async ({ page }) => {
  await page.goto("/");
  await expectLandingReady(page);
  const routeText = page.locator(".showcase-route span").first();
  await expect(routeText).toHaveCSS("color", "rgb(248, 251, 253)");
  await expect(page.locator(".showcase-route").first()).toHaveCSS(
    "background-image",
    /linear-gradient\(135deg, rgb\(13, 58, 92\), rgb\(18, 82, 119\)\)/,
  );
});
