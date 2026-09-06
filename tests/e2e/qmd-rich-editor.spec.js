import { expect, test } from "@playwright/test";
import { openDashboardPage } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, { data: { mode: "absent" } });
});

test("Composer keyboard formatting, semantic styles, footprint, and always-visible preview", async ({ page }) => {
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

  const panelSize = wizard.getByRole("region", { name: "Panel size" });
  const width = panelSize.getByLabel("Width");
  const rowHeight = panelSize.getByRole("combobox", {
    name: "Height step (12.5% of a row)",
    exact: true,
  });
  await expect(width).toHaveValue("2");
  await expect(rowHeight).toHaveValue("1");
  await expect(panelSize.getByRole("img", {
    name: "Panel size: 2 columns by 8 steps",
  })).toBeVisible();
  await width.selectOption("4");
  await rowHeight.selectOption({ value: "2" });
  await expect(width).toHaveValue("4");
  await expect(rowHeight).toHaveValue("2");
  await expect(panelSize.getByRole("img", {
    name: "Panel size: 4 columns by 16 steps",
  })).toBeVisible();

  const preview = wizard.getByRole("region", { name: "Rendered preview" });
  await expect(preview).toBeVisible();
  await expect(preview).toContainText("Operational response");
  await expect(preview.locator("u")).toContainText("Operational response");
  await wizard.getByRole("button", { name: "Raw text", exact: true }).click();
  await expect(wizard.getByLabel("Portable QMD raw source")).toHaveValue(/::: \{\.simex-text-lead\}[\s\S]*\+\+\*\*Operational response\*\*\+\+/);
  await expect(wizard.getByRole("region", { name: "Portable Markdown" }).locator("pre"))
    .toContainText(/::: \{\.simex-text-lead\}[\s\S]*\+\+\*\*Operational response\*\*\+\+/);
  await expect(preview).toContainText("Operational response");
  await wizard.getByRole("button", { name: "Formatted text", exact: true }).click();
  await expect(composer).toBeVisible();
  await expect(preview).toBeVisible();
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
  const preview = wizard.getByRole("region", { name: "Rendered preview" });
  await expect(preview).toBeVisible();
  await expect(preview).toContainText("Safe emphasis");
  await expect(preview).toContainText("unsafe link text");
  expect(await page.evaluate(() => window.__owned)).toBeUndefined();
  expect(unsafeRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("Raw text preserves unsupported source untouched", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  const wizard = await openTextImageComposer(page);
  const unsupported = "::: {.callout-warning}\nExact unsupported source.\n:::";
  await wizard.getByRole("button", { name: "Raw text", exact: true }).click();
  const source = wizard.getByLabel("Portable QMD raw source");
  await source.fill(unsupported);
  await expect(source).toHaveValue(unsupported);
  await expect(wizard.getByText(/Raw text avoids formatted-editor rewrites/i)).toBeVisible();
  await expect(wizard.getByRole("region", { name: "Portable Markdown" }).locator("pre"))
    .toHaveText(unsupported);
  const preview = wizard.getByRole("region", { name: "Rendered preview" });
  await expect(preview).toBeVisible();
  await expect(preview).toContainText("Exact unsupported source");
  await wizard.getByRole("button", { name: "Formatted text", exact: true }).click();
  await expect(wizard.getByLabel("Portable QMD Composer editing area"))
    .toContainText("Exact unsupported source");
  await expect(preview).toBeVisible();
  await wizard.getByRole("button", { name: "Raw text", exact: true }).click();
  await expect(source).toHaveValue(unsupported);
});

test("resume Text/Image restores the current editing surface and scroll", async ({ page }) => {
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
  await wizard.getByRole("button", { name: "Raw text", exact: true }).click();
  const source = wizard.getByLabel("Portable QMD raw source");
  const body = wizard.locator(".static-content-dialog__body");
  await body.evaluate((node) => { node.scrollTop = Math.min(220, node.scrollHeight - node.clientHeight); node.dispatchEvent(new Event("scroll", { bubbles: true })); });
  const capturedScroll = await body.evaluate((node) => node.scrollTop);
  expect(capturedScroll).toBeGreaterThan(0);

  await wizard.getByRole("button", { name: "Close Text/Image editor" }).click();
  await expect(wizard).toHaveCount(0);

  await expect(pending).toHaveAttribute("data-pending-work-activity", "suspended");
  await pending.getByRole("button", { name: /Resume New Text\/Image draft/ }).click();

  wizard = page.getByRole("dialog", { name: "Add Text/Image" });
  await expect(wizard).toBeVisible();
  await expect(wizard.getByLabel("Portable QMD raw source")).toBeVisible();
  expect(await wizard.locator(".static-content-dialog__body").evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await expect(wizard.getByLabel("Portable QMD raw source")).toHaveValue("Resume proof");
  const preview = wizard.getByRole("region", { name: "Rendered preview" });
  await expect(preview).toBeVisible();
  await expect(preview).toContainText("Resume proof");
  await wizard.getByRole("button", { name: "Formatted text", exact: true }).click();
  await expect(wizard.getByLabel("Portable QMD Composer editing area")).toContainText("Resume proof");
  await expect(preview).toBeVisible();
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
