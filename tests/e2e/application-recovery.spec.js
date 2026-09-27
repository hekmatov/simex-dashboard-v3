import { expect, test } from "@playwright/test";

const storageKey = "simex-dashboard-config-v3-three-mode-v1";

test("root render failure offers retry without clearing saved work", async ({ page }) => {
  await page.goto("http://127.0.0.1:4175/tests/e2e/application-recovery-harness.html");
  await page.evaluate((key) => localStorage.setItem(key, "saved-draft"), storageKey);
  await page.getByRole("button", { name: "Break render" }).click();
  await expect(page.getByRole("heading", { name: "The dashboard hit a display error." })).toBeVisible();
  await page.evaluate(() => { window.__applicationHarnessFail = false; });
  await page.getByRole("button", { name: "Try Again" }).click();
  await expect(page.getByText("Dashboard ready")).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe("saved-draft");
});

test("failed application chunk has a reload path", async ({ page }) => {
  await page.goto("http://127.0.0.1:4175/tests/e2e/application-recovery-harness.html");
  await page.getByRole("button", { name: "Break chunk" }).click();
  await expect(page.getByRole("heading", { name: "Part of the dashboard couldn’t be loaded." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reload Page" })).toBeVisible();
});

test("Audience root failure remains a passive waiting display", async ({ page }) => {
  await page.goto("http://127.0.0.1:4175/tests/e2e/application-recovery-harness.html?surface=audience");
  await page.getByRole("button", { name: "Break render" }).click();
  const audience = page.locator(".audience-display");
  await expect(audience.getByRole("heading", { name: "Audience display is waiting for a valid dashboard." })).toBeVisible();
  await expect(audience).toHaveAttribute("data-connection-status", "waiting");
  await expect(audience.locator("button, a, nav")).toHaveCount(0);
});

test("Audience chunk failure stays passive without technical controls", async ({ page }) => {
  await page.goto("http://127.0.0.1:4175/tests/e2e/application-recovery-harness.html");
  await page.getByRole("button", { name: "Break audience chunk" }).click();
  const audience = page.locator(".audience-display");
  await expect(audience.getByRole("heading", { name: "Audience display is waiting for a valid dashboard." })).toBeVisible();
  await expect(audience).toHaveAttribute("data-connection-status", "waiting");
  await expect(audience.locator("button, a, nav")).toHaveCount(0);
});

test("bad saved dashboard can load source without overwriting the saved bytes", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "{invalid saved configuration"), storageKey);
  await page.goto("http://127.0.0.1:4185/?mode=view");
  await expect(page.getByRole("heading", { name: /Dashboard couldn’t load/ })).toBeVisible();
  await expect(page.getByText(/saved dashboard could not be opened/i)).toBeVisible();
  await page.getByLabel("Choose Dashboard Package").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{invalid package"),
  });
  await expect(page.getByRole("alert")).toContainText("Dashboard package couldn’t be imported");
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe("{invalid saved configuration");
  await page.getByRole("button", { name: "Load Dashboard Source" }).click();
  await expect(page.locator('[data-canonical-page-id="scenario"]')).toBeVisible();
  await expect(page.locator(".app-persistence-notice")).toContainText("saved configuration is unchanged");
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe("{invalid saved configuration");
});

test("bad dashboard source offers recovery instead of a blank page", async ({ page }) => {
  await page.route("**/config/dashboard.json", (route) => route.fulfill({ status: 503, body: "Source unavailable" }));
  await page.goto("http://127.0.0.1:4185/?mode=view");
  await expect(page.getByRole("heading", { name: /Dashboard couldn’t load/ })).toBeVisible();
  await expect(page.getByText(/dashboard source could not be opened/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Import Dashboard Package" })).toBeVisible();
});

test("storage denial leaves the dashboard visible with a session-only recovery notice", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() { throw new DOMException("Storage denied", "SecurityError"); },
  }));
  await page.goto("http://127.0.0.1:4185/?mode=view");
  await expect(page.locator('[data-canonical-page-id="scenario"]')).toBeVisible();
  await expect(page.locator(".app-persistence-notice")).toContainText("Browser storage is unavailable");
});
