import { expect, test } from "@playwright/test";

import { enterAuthoredDashboard } from "./support/landingWorkflow.js";

test.beforeEach(async ({ page, request }) => {
  await request.post("/__test__/catalogue-mode", { data: { mode: "absent" } });
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("simex-dashboard-config-v3-three-mode-v1");
    localStorage.removeItem("simex-dashboard-ui-mode-v1");
  });
  await page.reload();
  await enterAuthoredDashboard(page);
});

test("the canonical chart canvas stays mounted while switching between View and Build", async ({ page }) => {
  const canvas = page.locator("[data-canonical-canvas-instance]");
  await expect(canvas).toBeVisible();
  const viewInstance = await canvas.getAttribute("data-canonical-canvas-instance");

  await page.getByRole("button", { name: "Build", exact: true }).click();
  await expect(page.locator('[data-canonical-mode="build"]')).toBeVisible();
  await expect(canvas).toHaveAttribute("data-canonical-canvas-instance", viewInstance);

  await page.getByRole("button", { name: "View", exact: true }).click();
  await expect(page.locator('[data-canonical-mode="view"]')).toBeVisible();
  await expect(canvas).toHaveAttribute("data-canonical-canvas-instance", viewInstance);
});

test("Quick Edit opens before reveal animation frames are allowed to run", async ({ page }) => {
  await enterBiomedicalBuild(page);
  const panel = page.locator('[data-panel-id="bio_confirmed_cases"]:visible');
  const edit = panel.getByRole("button", { name: "Edit chart", exact: true });
  await expect(edit).toBeEnabled();
  await page.evaluate(() => {
    window.__savedAnimationFrame = window.requestAnimationFrame;
    window.__savedCancelAnimationFrame = window.cancelAnimationFrame;
    window.__heldAnimationFrames = [];
    window.requestAnimationFrame = (callback) => {
      window.__heldAnimationFrames.push(callback);
      return window.__heldAnimationFrames.length;
    };
    window.cancelAnimationFrame = () => {};
  });

  await edit.evaluate((button) => button.click());

  await expect(page.locator(".chart-quick-editor")).toBeVisible({ timeout: 750 });
  await page.evaluate(() => {
    window.requestAnimationFrame = window.__savedAnimationFrame;
    window.cancelAnimationFrame = window.__savedCancelAnimationFrame;
  });
});

test("Full Edit paints a pending shell without creating unchanged work", async ({ page }) => {
  await enterBiomedicalBuild(page);
  const panel = page.locator('[data-panel-id="bio_confirmed_cases"]:visible');
  await panel.getByRole("button", { name: "Edit chart", exact: true }).click();
  const quick = page.locator(".chart-quick-editor");
  await expect(quick).toBeVisible();
  const owner = page.locator('[data-pending-work-id="chart-edit:bio_confirmed_cases"]');
  await expect(owner).toHaveCount(0);

  await page.evaluate(() => {
    window.__savedAnimationFrame = window.requestAnimationFrame;
    window.__savedCancelAnimationFrame = window.cancelAnimationFrame;
    window.__heldAnimationFrames = [];
    window.requestAnimationFrame = (callback) => {
      window.__heldAnimationFrames.push(callback);
      return window.__heldAnimationFrames.length;
    };
    window.cancelAnimationFrame = () => {};
  });
  await quick.getByRole("button", { name: "Open full editor", exact: true })
    .evaluate((button) => button.click());

  const full = page.getByRole("dialog", { name: "Edit chart" });
  await expect(full).toBeVisible();
  await expect(full).toHaveAttribute("data-preparation-status", "pending");
  await expect(owner).toHaveCount(0);
  await page.evaluate(() => {
    window.requestAnimationFrame = window.__savedAnimationFrame;
    window.cancelAnimationFrame = window.__savedCancelAnimationFrame;
  });
  await full.getByRole("button", { name: "Close", exact: true }).click();
  await expect(full).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: /discard/i })).toHaveCount(0);
});

test("chart Save commits its working toast before dashboard busy state", async ({ page }) => {
  await enterBiomedicalBuild(page);
  const panel = page.locator('[data-panel-id="bio_confirmed_cases"]');
  await panel.getByRole("button", { name: "Edit chart", exact: true }).click();
  const quick = page.locator(".chart-quick-editor");
  await expect(quick).toBeVisible();
  await quick.getByLabel("Chart title").fill("Toast precedes chart save work");
  const save = quick.getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeEnabled();

  await page.evaluate(() => {
    let delivery = 0;
    window.__chartSaveOrdering = {
      toastDelivery: null,
      busyDelivery: null,
      toastWasTopmost: null,
    };
    window.__chartSaveOrderingObserver = new MutationObserver((records) => {
      delivery += 1;
      for (const record of records) {
        if (
          record.type === "attributes"
          && record.target.matches?.(".chart-quick-editor")
          && record.target.getAttribute("aria-busy") === "true"
          && window.__chartSaveOrdering.busyDelivery === null
        ) {
          window.__chartSaveOrdering.busyDelivery = delivery;
        }
        for (const node of record.addedNodes ?? []) {
          if (!(node instanceof Element)) continue;
          const notice = node.matches?.('[data-operation-status="working"]')
            ? node
            : node.querySelector?.('[data-operation-status="working"]');
          if (
            notice?.textContent?.includes("Saving Chart")
            && window.__chartSaveOrdering.toastDelivery === null
          ) {
            window.__chartSaveOrdering.toastDelivery = delivery;
            const bounds = notice.getBoundingClientRect();
            const topmost = document.elementFromPoint(
              bounds.left + (bounds.width / 2),
              bounds.top + (bounds.height / 2),
            );
            window.__chartSaveOrdering.toastWasTopmost = notice.contains(topmost);
          }
        }
        for (const node of record.removedNodes ?? []) {
          if (!(node instanceof Element)) continue;
          if (
            (node.matches?.(".chart-quick-editor") || node.querySelector?.(".chart-quick-editor"))
            && window.__chartSaveOrdering.busyDelivery === null
          ) {
            window.__chartSaveOrdering.busyDelivery = delivery;
          }
        }
      }
    });
    window.__chartSaveOrderingObserver.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-busy", "data-operation-status"],
    });
  });

  await save.click();

  const ordering = await page.evaluate(() => {
    window.__chartSaveOrderingObserver.disconnect();
    return window.__chartSaveOrdering;
  });
  expect(ordering.toastDelivery).not.toBeNull();
  expect(ordering.busyDelivery).not.toBeNull();
  expect(ordering.toastWasTopmost).toBe(true);
  expect(ordering.toastDelivery).toBeLessThan(ordering.busyDelivery);
});

test("failed operation feedback stays visually above an overlapping Quick Edit surface", async ({ page }) => {
  await enterBiomedicalBuild(page);
  await page.setViewportSize({ width: 790, height: 864 });
  const panel = page.locator('[data-panel-id="bio_confirmed_cases"]');
  await panel.hover();
  await panel.getByRole("button", { name: "Edit chart", exact: true }).click();
  const quick = page.locator(".chart-quick-editor");
  await expect(quick).toBeVisible();
  await page.evaluate(() => {
    const stringify = JSON.stringify;
    JSON.stringify = function failToastProbeOnce(value, ...args) {
      if (
        globalThis.__SIMEX_FAIL_TOAST_PROBE_ONCE__ === true
        && value?.pages?.some(({ sections }) => sections?.some(({ panels }) => (
          panels?.some((placement) => (
            (placement.chart ?? placement)?.title === "Toast stacking probe"
          ))
        )))
      ) {
        globalThis.__SIMEX_FAIL_TOAST_PROBE_ONCE__ = false;
        throw new Error("Dashboard persistence is temporarily unavailable.");
      }
      return stringify.call(this, value, ...args);
    };
    globalThis.__SIMEX_FAIL_TOAST_PROBE_ONCE__ = true;
  });
  await quick.getByLabel("Chart title").fill("Toast stacking probe");
  await quick.getByRole("button", { name: "Save", exact: true }).click();

  const notice = page.locator(".operation-status-notice")
    .filter({ hasText: "Dashboard persistence is temporarily unavailable." });
  await expect(notice).toBeVisible();
  const stacking = await notice.evaluate((node) => {
    const noticeBounds = node.getBoundingClientRect();
    const editorBounds = document.querySelector(".unit-orbit")?.getBoundingClientRect();
    const overlapLeft = editorBounds
      ? Math.max(noticeBounds.left, editorBounds.left)
      : noticeBounds.left;
    const overlapRight = editorBounds
      ? Math.min(noticeBounds.right, editorBounds.right)
      : noticeBounds.left;
    const overlapTop = editorBounds
      ? Math.max(noticeBounds.top, editorBounds.top)
      : noticeBounds.top;
    const overlapBottom = editorBounds
      ? Math.min(noticeBounds.bottom, editorBounds.bottom)
      : noticeBounds.top;
    const overlapWidth = Math.max(0, overlapRight - overlapLeft);
    const overlapHeight = Math.max(0, overlapBottom - overlapTop);
    const topmost = document.elementFromPoint(
      overlapLeft + (overlapWidth / 2),
      overlapTop + (overlapHeight / 2),
    );
    return {
      overlapArea: overlapWidth * overlapHeight,
      noticeIsTopmost: node.contains(topmost),
      noticeBounds: {
        left: noticeBounds.left,
        right: noticeBounds.right,
        top: noticeBounds.top,
        bottom: noticeBounds.bottom,
      },
      editorBounds: editorBounds ? {
        left: editorBounds.left,
        right: editorBounds.right,
        top: editorBounds.top,
        bottom: editorBounds.bottom,
      } : null,
    };
  });

  expect(stacking.overlapArea, JSON.stringify(stacking)).toBeGreaterThan(0);
  expect(stacking.noticeIsTopmost).toBe(true);
});

async function enterBiomedicalBuild(page) {
  await page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Biomedical", exact: true })
    .click();
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await expect(page.locator('[data-canonical-mode="build"]')).toBeVisible();
}
