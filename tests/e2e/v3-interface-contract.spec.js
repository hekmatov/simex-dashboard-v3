import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("Build Page management uses one full-size trigger and full-size grouped actions", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  const navigation = page.locator('[data-build-page-navigation="anchored"]');
  await navigation.getByRole("button", { name: "Biomedical", exact: true }).click();

  const trigger = navigation.getByRole("button", { name: "Page actions for Biomedical", exact: true });
  await expect(trigger).toBeVisible();
  await expectMinimumTarget(trigger);
  await trigger.click();

  const actions = navigation.getByRole("group", { name: "Biomedical Page actions", exact: true });
  await expect(actions).toBeVisible();
  await expect(actions.getByRole("button")).toHaveCount(3);
  await expectMinimumTargets(actions.locator("button"));
  expect(await navigation.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
});

test("Step 7 Build controls and fields use the shared 44px interaction contract", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();

  const map = page.getByRole("complementary", { name: "Dashboard map" });
  await map.getByRole("treeitem", { name: "Biomedical", exact: true }).click();
  await map.getByRole("button", { name: "Inspector", exact: true }).click();
  await expectMinimumTargets(map.locator('button:visible, input:visible, select:visible, textarea:visible'));
  await expect(map.getByLabel("Page title")).toHaveCSS("color", await semanticColor(page, "--simex-text-strong"));

  await map.getByRole("button", { name: "Structure", exact: true }).click();
  const structure = map.getByRole("navigation", { name: "Dashboard structure" });
  const contrast = await structure.getByRole("treeitem", { name: "Biomedical", exact: true }).evaluate((item) => {
    const surface = item.closest(".build-side-sheet");
    const parse = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number);
    const luminance = (value) => parse(value)
      .map((channel) => channel / 255)
      .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const first = luminance(getComputedStyle(item).color);
    const second = luminance(getComputedStyle(surface).backgroundColor);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);

  await page.getByRole("button", { name: "Add chart", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add new chart" });
  await expectMinimumTargets(wizard.locator('button:visible, input:visible:not([type="checkbox"]):not([type="radio"]), select:visible, textarea:visible'));
  await wizard.getByRole("button", { name: /^Chart type\./ }).click();
  await expectMinimumTargets(wizard.locator('button:visible, input:visible:not([type="checkbox"]):not([type="radio"]), select:visible, textarea:visible'));
});

test("phone Build stays operational beneath its persistent recovery notice", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();

  const notice = page.locator('[data-phone-mode-notice="build"]');
  await expect(notice).toBeVisible();
  await expect(notice.getByRole("button", { name: "Switch to View", exact: true })).toBeVisible();
  await expectMinimumTarget(notice.getByRole("button"));
  const buildShell = page.locator(".build-mode-shell");
  const mapToggle = page.getByRole("button", { name: "Dashboard map", exact: true });
  await expect(buildShell).toBeVisible();
  await expect(mapToggle).toBeEnabled();
  await mapToggle.click();
  await expect(page.getByRole("complementary", { name: "Dashboard map" })).toBeVisible();
  await expect(notice).toBeVisible();
});

async function expectMinimumTargets(locator, minimum = 44) {
  const undersized = await locator.evaluateAll((controls, threshold) => controls
    .map((control) => {
      const box = control.getBoundingClientRect();
      return {
        label: control.getAttribute("aria-label") || control.textContent?.trim() || control.tagName,
        width: Math.round(box.width),
        height: Math.round(box.height),
      };
    })
    .filter(({ width, height }) => width < threshold || height < threshold), minimum);
  expect(undersized, JSON.stringify(undersized)).toEqual([]);
}

async function expectMinimumTarget(locator, minimum = 44) {
  await expectMinimumTargets(locator, minimum);
}

async function semanticColor(page, token) {
  return page.evaluate((name) => {
    const probe = document.createElement("span");
    probe.style.color = `var(${name})`;
    document.querySelector(".app-frame").append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, token);
}
