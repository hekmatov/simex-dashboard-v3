import { expect, test } from "@playwright/test";

import {
  expectNoRetiredDashboardStyle,
  observePendingOwnerStyle,
} from "./support/dashboard-style-audit.js";
import { openDashboardPage } from "./support/landingWorkflow.js";
import {
  createSavedPresentationScene,
  enterPresentWithScene,
  openAudienceSession,
} from "./support/present-audience-workflow.js";

const STYLE_OPTIONS = [
  { label: "Ledger", profile: "evidence-ledger/brighter-vellum" },
  { label: "Humanist", profile: "humanist-standard/common-ground" },
  { label: "Instrument", profile: "signal-instrument/calibrated-steel" },
];

test.use({ serviceWorkers: "block" });

async function captureStyleAuditFailure(page) {
  try {
    await expectNoRetiredDashboardStyle(page);
  } catch (error) {
    return String(error?.message ?? error);
  }
  return "";
}

test("selected style owns hover, focus, disabled, generated, SVG, and portal paint", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator('[data-canonical-mode="home"]')).toBeVisible();

  for (const style of STYLE_OPTIONS) {
  await page.getByRole("button", { name: "Theme", exact: true }).click();
  const look = page.getByRole("dialog", { name: "Theme" });
    await look.getByLabel(style.label, { exact: true }).check();
    await look.locator(`[data-profile-option="${style.profile}"] input`).check();
    await page.keyboard.press("Escape");
    await expectNoRetiredDashboardStyle(page);

    if (style.label === "Ledger") {
      await page.evaluate(() => {
        const probe = document.createElement("div");
        probe.dataset.dashboardStyleAuditProbe = "retired-keywords";
        probe.textContent = "Retired colour probe";
        probe.style.cssText = "color: teal; border: 1px solid navy;";
        document.querySelector(".app-frame")?.append(probe);
      });
      const retiredKeywordFailure = await captureStyleAuditFailure(page);
      expect(retiredKeywordFailure).toContain("rgb(0, 128, 128)");
      expect(retiredKeywordFailure).toContain("rgb(0, 0, 128)");
      await page.locator('[data-dashboard-style-audit-probe="retired-keywords"]').evaluate((node) => node.remove());
      await expectNoRetiredDashboardStyle(page);
    }

    for (const pageId of ["biomedical", "socio_economic"]) {
      await page.locator(`[data-dashboard-page-id="${pageId}"]`).click();
      await expectNoRetiredDashboardStyle(page);
    }
    await page.locator('[data-dashboard-page-id="biomedical"]').click();

    const icon = page.locator(".simex-icon-control:visible").first();
    await icon.hover();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await expectNoRetiredDashboardStyle(page);

    await icon.focus();
    await expectNoRetiredDashboardStyle(page);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Home", exact: true }).click();
    await expect(page.locator('[data-canonical-mode="home"]')).toBeVisible();
  }
});

test("Build studios, wizard validation, and Chrono interaction states use selected style", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Theme", exact: true }).click();
  const look = page.getByRole("dialog", { name: "Theme" });
  await look.getByLabel("Instrument", { exact: true }).check();
  await look.locator('[data-profile-option="signal-instrument/calibrated-steel"] input').check();
  await page.keyboard.press("Escape");
  await openDashboardPage(page, "biomedical");
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();

  await page.getByRole("button", { name: "Chrono Studio", exact: true }).click();
  await expect(page.locator(".build-authoring-auxiliary")).toBeVisible();
  await expectNoRetiredDashboardStyle(page);
  await page.locator(".build-authoring-auxiliary").getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("button", { name: "More", exact: true }).click();
  const more = page.getByRole("dialog", { name: "More Build commands" });
  await expect(more).toBeVisible();
  await expectNoRetiredDashboardStyle(page);
  await more.getByRole("button", { name: "Scene Studio", exact: true }).click();
  await expect(page.locator(".build-authoring-auxiliary")).toBeVisible();
  await expectNoRetiredDashboardStyle(page);
  await page.locator(".build-authoring-auxiliary").getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pages & sections", exact: true })).toHaveCount(0);

  await page.locator(".dashboard-scenario-trigger").click();
  const passport = page.getByRole("complementary", { name: "Scenario Passport" });
  await expect(passport).toBeVisible();
  await expectNoRetiredDashboardStyle(page);
  await passport.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("button", { name: "Source content", exact: true }).click();
  const sourceContent = page.getByRole("complementary", { name: "Source content authoring" });
  await expect(sourceContent).toBeVisible();
  await expectNoRetiredDashboardStyle(page);
  await sourceContent.getByRole("button", { name: "Close", exact: true }).click();

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

test("one pending chart row keeps stable semantic paint through active, suspended, saving, and error", async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    const stringify = JSON.stringify;
    JSON.stringify = function patchedStringify(value, ...args) {
      if (
        globalThis.__SIMEX_FAIL_CHART_SERIALIZE_ONCE__ === true
        && value?.pages?.some(({ sections }) => sections?.some(({ panels }) => (
          panels?.some((placement) => (
            (placement.chart ?? placement)?.title === "Durable quick save"
          ))
        )))
      ) {
        globalThis.__SIMEX_FAIL_CHART_SERIALIZE_ONCE__ = false;
        throw new Error("Dashboard persistence is temporarily unavailable.");
      }
      return stringify.call(this, value, ...args);
    };
  });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByRole("button", { name: "Build", exact: true }).click();

  const ownerId = "chart-edit:bio_confirmed_cases";
  const panel = page.locator('[data-panel-id="bio_confirmed_cases"]');
  await panel.getByRole("button", { name: "Edit chart", exact: true }).click();
  let quick = page.locator(".chart-quick-editor");
  await quick.getByRole("textbox", { name: "Chart title", exact: true }).fill("Durable quick save");
  const owner = page.locator(`[data-pending-work-id="${ownerId}"]`);
  await expect(owner).toHaveCount(1);

  const active = await observePendingOwnerStyle(page, ownerId, "dirty");
  expect(active).toMatchObject({
    count: 1,
    state: "dirty",
    activity: "active",
    origin: "quick",
    semanticStatePaint: true,
  });
  expect(active.actionCopy.join(" ")).toContain("Focus Chart changes");
  await expectNoRetiredDashboardStyle(page);

  await page.locator(".dashboard-header").click({ position: { x: 8, y: 8 } });
  await expect(quick).toHaveCount(0);
  const suspended = await observePendingOwnerStyle(page, ownerId, "dirty");
  expect(suspended).toMatchObject({
    count: 1,
    nodeIdentity: active.nodeIdentity,
    state: "dirty",
    activity: "suspended",
    origin: "quick",
    semanticStatePaint: true,
  });
  expect(suspended.actionCopy.join(" ")).toContain("Resume Chart changes");
  expect(suspended.geometry).toEqual(active.geometry);
  await expectNoRetiredDashboardStyle(page);

  await owner.getByRole("button", { name: "Resume Chart changes", exact: true }).click();
  quick = page.locator(".chart-quick-editor");
  await expect(quick).toBeVisible();
  await quick.getByRole("button", { name: "Open full editor", exact: true }).click();
  const full = page.getByRole("dialog", { name: "Edit chart" });
  await full.getByRole("button", { name: /^Configure\./ }).click();
  await expect(full.getByRole("textbox", { name: "Chart title", exact: true })).toHaveValue("Durable quick save");
  await expect(owner).toHaveAttribute("data-pending-work-origin", "full");
  await expectNoRetiredDashboardStyle(page);

  await full.getByRole("button", { name: /^Review\./ }).click();
  await installPendingOwnerStyleEvidence(page, ownerId, "saving");
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_CHART_SERIALIZE_ONCE__ = true; });
  await full.getByRole("button", { name: "Save changes", exact: true }).click();
  const saving = await readPendingOwnerStyleEvidence(page);
  expect(saving).toMatchObject({
    count: 1,
    nodeIdentity: active.nodeIdentity,
    state: "saving",
    activity: "active",
    origin: "full",
    semanticStatePaint: true,
  });
  expect(saving.geometry).toEqual(active.geometry);

  await expect(owner).toHaveAttribute("data-pending-work-state", "error");
  await expect(full).toBeVisible();
  await expect(owner.getByRole("button", { name: "Retry Save", exact: true })).toBeVisible();
  const failedNotice = page.locator('[data-operation-status="failed"]')
    .filter({ hasText: "Dashboard persistence is temporarily unavailable." });
  await expect(failedNotice).toBeHidden();
  await expect(failedNotice.locator("p"))
    .toHaveText("Dashboard persistence is temporarily unavailable.");
  const error = await observePendingOwnerStyle(page, ownerId, "error");
  expect(error).toMatchObject({
    count: 1,
    nodeIdentity: active.nodeIdentity,
    state: "error",
    activity: "active",
    origin: "full",
    semanticStatePaint: true,
  });
  expect(error.actionCopy.join(" ")).toContain("Retry Save");
  expect(error.geometry).toEqual(active.geometry);
  await expectNoRetiredDashboardStyle(page);

  await page.keyboard.press("Escape");
  await expect(full).toHaveCount(0);
  await expect(failedNotice).toBeVisible();
});

test("Text/Image Composer, sanitized notice, rendered preview, raw source, and Panel size use semantic contracts", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await page.getByRole("button", { name: "Add Text/Image", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Add Text/Image" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Free text").check();
  await wizard.getByRole("button", { name: "Continue" }).click();

  const composer = wizard.getByLabel("Portable QMD Composer editing area");
  await composer.fill("Operational response");
  await composer.press("Control+a");
  await wizard.getByRole("button", { name: "Bold" }).click();
  await expect(wizard.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true");
  await composer.evaluate((node) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/html", '<p style="color:red" onclick="window.__owned=true"><strong>Safe paste</strong><script>window.__owned=true</script></p>');
    node.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData }));
  });
  await expect(wizard.locator(".portable-qmd-composer__announcement"))
    .toContainText(/unsupported paste formatting was removed/i);
  const width = wizard.getByRole("combobox", { name: "Width", exact: true });
  const rowHeight = wizard.getByRole("combobox", { name: "Height step (12.5% of a row)", exact: true });
  await expect(width).toHaveValue("2");
  await expect(rowHeight).toHaveValue("1");
  await expect(wizard.getByRole("img", { name: "Panel size: 2 columns by 8 steps" })).toBeVisible();
  await width.selectOption("4");
  await rowHeight.selectOption({ value: "2" });
  await expect(wizard.getByRole("img", { name: "Panel size: 4 columns by 16 steps" })).toBeVisible();
  await expectNoRetiredDashboardStyle(page);

  const boldControl = wizard.getByRole("button", { name: "Bold", exact: true });
  await boldControl.evaluate((node) => { node.style.fontFamily = "Times New Roman"; });
  const toolbarFontFailure = await captureStyleAuditFailure(page);
  expect(toolbarFontFailure).toContain("fontFamily");
  await boldControl.evaluate((node) => { node.style.removeProperty("font-family"); });
  await expectNoRetiredDashboardStyle(page);

  const renderedPreview = wizard.getByRole("region", { name: "Rendered preview" });
  await expect(renderedPreview).toContainText(/Operational response|Safe paste/);
  await expectNoRetiredDashboardStyle(page);

  await wizard.getByRole("button", { name: "Raw text", exact: true }).click();
  const rawSource = wizard.getByLabel("Portable QMD raw source", { exact: true });
  await expect(rawSource).toBeVisible();
  await expect(rawSource).toHaveValue(/Operational response|Safe paste/);
  await expect(renderedPreview).toContainText(/Operational response|Safe paste/);
});

test("Present, Audience options, and standalone Audience use selected style", async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const scene = await createSavedPresentationScene(page, { url: "/" });
  await enterPresentWithScene(page, scene);
  await expectNoRetiredDashboardStyle(page);

  await page.getByRole("button", { name: "Audience display options", exact: true }).click();
  const options = page.getByRole("dialog", { name: "Audience display options" });
  await expect(options).toBeVisible();
  await expectNoRetiredDashboardStyle(page);
  await options.getByRole("button", { name: "Close Audience display options", exact: true }).click();

  const { popup } = await openAudienceSession(page);
  await popup.setViewportSize({ width: 1440, height: 900 });
  await expectNoRetiredDashboardStyle(popup);
  await popup.close();
});

test("standalone source viewer and application recovery retain dashboard style", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByRole("button", { name: "Build", exact: true }).click();
  const panel = page.locator('[data-panel-id="bio_confirmed_cases"]');
  await panel.scrollIntoViewIfNeeded();

  const popupPromise = page.waitForEvent("popup");
  await panel.getByRole("button", { name: "View source CSV", exact: true }).click();
  const viewer = await popupPromise;
  await viewer.waitForLoadState("domcontentloaded");
  await expect(viewer).toHaveURL(/\/source-viewer\.html$/);
  await expect(viewer.locator(".source-viewer-theme-root")).toBeVisible();
  await expect(viewer.getByText("177 of 177 rows", { exact: true })).toBeVisible();
  await expectNoRetiredDashboardStyle(viewer);
  await viewer.close();

  await page.route("**/config/dashboard.json", (route) => route.fulfill({
    status: 503,
    body: "unavailable",
  }));
  await page.reload();
  await expect(page.locator(".application-recovery")).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Dashboard couldn’t load. No valid scenario is available.",
  })).toBeVisible();
  await expectNoRetiredDashboardStyle(page);
});

test("phone View remains selected-style clean", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".app-frame")).toBeVisible();
  await expectNoRetiredDashboardStyle(page);
});

function installPendingOwnerStyleEvidence(page, ownerId, expectedState) {
  return page.evaluate(({ id, state }) => {
    globalThis.__SIMEX_PENDING_OWNER_STYLE_OBSERVER__?.disconnect();
    globalThis.__SIMEX_PENDING_OWNER_STYLE_EVIDENCE__ = null;
    const ownerKeys = globalThis.__simexDashboardStyleAuditOwnerKeys
      ??= { next: 1, values: new WeakMap() };
    const resolveColor = (owner, variable) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${variable})`;
      owner.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    const inspect = () => {
      const owners = [...document.querySelectorAll("[data-pending-work-id]")]
        .filter((entry) => entry.dataset.pendingWorkId === id);
      const owner = owners[0];
      if (owners.length !== 1 || owner?.dataset.pendingWorkState !== state) return;
      if (!ownerKeys.values.has(owner)) {
        ownerKeys.values.set(owner, ownerKeys.next);
        ownerKeys.next += 1;
      }
      const style = getComputedStyle(owner);
      const semanticVariables = state === "saving"
        ? ["--simex-info", "--simex-info-soft"]
        : state === "error"
          ? ["--simex-error", "--simex-error-soft"]
          : ["--simex-warning", "--simex-warning-soft"];
      const semanticColors = semanticVariables.map((variable) => resolveColor(owner, variable));
      const paintedColors = [
        style.color,
        style.backgroundColor,
        style.borderTopColor,
        style.borderRightColor,
        style.borderBottomColor,
        style.borderLeftColor,
      ];
      const rect = owner.getBoundingClientRect();
      globalThis.__SIMEX_PENDING_OWNER_STYLE_EVIDENCE__ = {
        count: owners.length,
        nodeIdentity: ownerKeys.values.get(owner),
        id: owner.dataset.pendingWorkId,
        state: owner.dataset.pendingWorkState,
        activity: owner.dataset.pendingWorkActivity,
        origin: owner.dataset.pendingWorkOrigin,
        surface: owner.dataset.pendingWorkSurface,
        actionCopy: [...owner.querySelectorAll("button")]
          .filter((button) => getComputedStyle(button).display !== "none")
          .map((button) => button.textContent.trim())
          .filter(Boolean),
        geometry: {
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
        },
        paint: {
          color: style.color,
          backgroundColor: style.backgroundColor,
          borderLeftColor: style.borderLeftColor,
        },
        semanticStatePaint: semanticColors.some((color) => paintedColors.includes(color)),
      };
      globalThis.__SIMEX_PENDING_OWNER_STYLE_OBSERVER__?.disconnect();
    };
    const observer = new MutationObserver(inspect);
    globalThis.__SIMEX_PENDING_OWNER_STYLE_OBSERVER__ = observer;
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    inspect();
  }, { id: ownerId, state: expectedState });
}

function readPendingOwnerStyleEvidence(page) {
  return page.evaluate(() => {
    globalThis.__SIMEX_PENDING_OWNER_STYLE_OBSERVER__?.disconnect();
    const evidence = globalThis.__SIMEX_PENDING_OWNER_STYLE_EVIDENCE__;
    delete globalThis.__SIMEX_PENDING_OWNER_STYLE_OBSERVER__;
    delete globalThis.__SIMEX_PENDING_OWNER_STYLE_EVIDENCE__;
    return evidence;
  });
}
