import { expect, test } from "@playwright/test";
import { openDashboardPage } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, { data: { mode: "absent" } });
});

test("Composer semantic text style, keyboard formatting, underline, Panel size, and Preview", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  const wizard = await openTextImageComposer(page);
  const title = "Operational response note";
  await wizard.getByLabel("Panel title").fill(title);
  const composer = wizard.getByLabel("Portable QMD Composer editing area");

  await composer.fill("Operational response");
  await composer.press("Control+a");
  await composer.press("Control+b");
  await expect(wizard.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true");
  await wizard.getByRole("button", { name: "Underline" }).click();
  await expect(wizard.getByRole("button", { name: "Underline" })).toHaveAttribute("aria-pressed", "true");
  await wizard.getByLabel("Semantic text style").selectOption("lead");
  await expect(composer.locator('p[data-simex-text-style="lead"]')).toContainText("Operational response");

  await expect(wizard.getByRole("grid", { name: "Panel size: 2 columns by 1 row" })).toBeVisible();
  await wizard.getByRole("gridcell", { name: "Set panel size to 4 columns by 2 rows" }).click();
  await expect(wizard.getByRole("grid", { name: "Panel size: 4 columns by 2 rows" })).toBeVisible();

  await wizard.getByRole("tab", { name: "Preview" }).click();
  const preview = wizard.getByRole("tabpanel", { name: "Preview" });
  await expect(preview).toContainText("Operational response");
  await expect(preview.locator("u")).toContainText("Operational response");
  const advancedTab = wizard.getByRole("tab", { name: "Advanced QMD" });
  await expect(advancedTab).toBeVisible();
  await advancedTab.focus();
  await advancedTab.press("Enter");
  await expect(wizard.getByLabel("Portable QMD source")).toHaveValue(/::: \{\.simex-text-lead\}[\s\S]*\+\+\*\*Operational response\*\*\+\+/);
  await expect(wizard.getByRole("status")).toContainText("Preview is up to date");
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByRole("button", { name: "Add", exact: true }).click();
  await expect(wizard).toHaveCount(0);
  await expect(page.getByRole("button", { name: `Move panel ${title}`, exact: true })).toBeVisible();
});

test("sanitized paste keeps visible text and removes hostile formatting", async ({ page }) => {
  const unsafeRequests = [];
  const pageErrors = [];
  page.on("request", (request) => {
    if (/unsafe\.example\.test|javascript:|data:text/.test(request.url())) unsafeRequests.push(request.url());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const wizard = await openTextImageComposer(page);
  const composer = wizard.getByLabel("Portable QMD Composer editing area");
  await composer.evaluate((node) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/html", '<p class="owned" style="color:red" onclick="window.__owned=true"><strong>Safe emphasis</strong> <a href="javascript:window.__owned=true">unsafe link text</a><script>window.__owned=true</script><iframe src="https://unsafe.example.test/frame"></iframe><form><input value="owned"></form><img src="https://unsafe.example.test/image.png" onerror="window.__owned=true"></p>');
    node.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData }));
  });

  await expect(composer).toContainText("Safe emphasis");
  await expect(composer).toContainText("unsafe link text");
  await expect(composer.locator("strong")).toContainText("Safe emphasis");
  await expect(composer.locator('script,iframe,form,input,img,a,[style],[class~="owned"],[onclick],[onerror]')).toHaveCount(0);
  await expect(wizard.locator(".portable-qmd-composer__announcement")).toContainText(/unsupported paste formatting was removed/i);
  expect(await page.evaluate(() => window.__owned)).toBeUndefined();
  expect(unsafeRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("Advanced QMD preserves unsupported source untouched", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  const wizard = await openTextImageComposer(page);
  const unsupported = "::: {.callout-warning}\nExact unsupported source.\n:::";
  await wizard.getByRole("tab", { name: "Advanced QMD" }).click();
  const source = wizard.getByLabel("Portable QMD source");
  await source.fill(unsupported);
  await expect(source).toHaveValue(unsupported);
  await expect(wizard.getByText(/Advanced QMD preserves exact authored source/i)).toBeVisible();
  await expect(wizard.getByRole("tab", { name: "Advanced QMD" })).toHaveAttribute("aria-selected", "true");
});

test("resume Text/Image restores the current surface, focus, and scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 600 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Add Text/Image", exact: true }).click();
  let wizard = page.getByRole("dialog", { name: "Add Text/Image" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Free text").check();
  await wizard.getByRole("button", { name: "Close Text/Image editor" }).click();
  await expect(wizard).toHaveCount(0);
  await expect(page.locator('[data-pending-work-kind="text-image-create"]')).toHaveCount(0);

  wizard = await openTextImageComposerFromBuild(page);
  await wizard.getByLabel("Portable QMD Composer editing area").fill("Resume proof");
  const pending = page.locator('[data-pending-work-kind="text-image-create"]');
  await expect(pending).toHaveAttribute("data-pending-work-activity", "active");
  await expect(pending).toHaveAttribute("data-pending-work-surface", "composer");
  await wizard.getByRole("tab", { name: "Preview" }).click();
  await expect(pending).toHaveAttribute("data-pending-work-surface", "preview");
  await wizard.getByRole("tab", { name: "Advanced QMD" }).click();
  const source = wizard.getByLabel("Portable QMD source");
  await source.focus();
  const body = wizard.locator(".static-content-dialog__body");
  await body.evaluate((node) => { node.scrollTop = Math.min(220, node.scrollHeight - node.clientHeight); node.dispatchEvent(new Event("scroll", { bubbles: true })); });
  const capturedScroll = await body.evaluate((node) => node.scrollTop);
  expect(capturedScroll).toBeGreaterThan(0);
  await expect(pending).toHaveAttribute("data-pending-work-surface", "advanced");

  await wizard.getByRole("button", { name: "Close Text/Image editor" }).focus();
  await pending.getByRole("button", { name: /Focus New Text\/Image draft/ }).evaluate((node) => node.click());
  await expect(source).toBeFocused();
  expect(await body.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await source.press("Escape");
  await expect(wizard).toHaveCount(0);

  await expect(pending).toHaveAttribute("data-pending-work-activity", "suspended");
  await expect(pending).toHaveAttribute("data-pending-work-surface", "advanced");
  await pending.getByRole("button", { name: /Resume New Text\/Image draft/ }).click();

  wizard = page.getByRole("dialog", { name: "Add Text/Image" });
  await expect(wizard).toBeVisible();
  await expect(wizard.getByRole("tab", { name: "Advanced QMD" })).toHaveAttribute("aria-selected", "true");
  await expect(wizard.getByLabel("Portable QMD source")).toBeFocused();
  expect(await wizard.locator(".static-content-dialog__body").evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await expect(wizard.getByLabel("Portable QMD source")).toHaveValue("Resume proof");
});

async function openTextImageComposer(page) {
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  return openTextImageComposerFromBuild(page);
}

async function openTextImageComposerFromBuild(page) {
  await page.getByRole("button", { name: "Add Text/Image", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add Text/Image" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Free text").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await expect(wizard.getByLabel("Portable QMD Composer editing area")).toBeVisible();
  return wizard;
}
