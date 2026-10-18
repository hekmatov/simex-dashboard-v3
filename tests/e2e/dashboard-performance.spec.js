import { expect, test } from "@playwright/test";

import { enterAuthoredDashboard } from "./support/landingWorkflow.js";
import { choosePanelAction } from "./support/buildWorkflow.js";

const EDIT_CHART_ID = "chart-line-mtgz6v76";

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
  const edit = await openChartEditMenu(page);
  await expect(edit).toBeEnabled();
  await holdAnimationFrames(page);
  try {
    await edit.evaluate((button) => button.click());
    await expect(page.locator(".chart-quick-editor")).toBeVisible({ timeout: 750 });
  } finally {
    await releaseAnimationFrames(page);
  }
});

test("Full Edit paints a pending shell without creating unchanged work", async ({ page }) => {
  await enterBiomedicalBuild(page);
  const quick = await openQuickEditor(page);
  const owner = page.locator(`[data-pending-work-id="chart-edit:${EDIT_CHART_ID}"]`);
  await expect(owner).toHaveCount(0);

  const full = page.getByRole("dialog", { name: "Edit chart" });
  await holdAnimationFrames(page);
  try {
    await quick.getByRole("button", { name: "Open full editor", exact: true })
      .evaluate((button) => button.click());
    await expect(full).toBeVisible();
    await expect(full).toHaveAttribute("data-preparation-status", "pending");
    await expect(owner).toHaveCount(0);
  } finally {
    await releaseAnimationFrames(page);
  }
  await full.getByRole("button", { name: "Close", exact: true }).click();
  await expect(full).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: /discard/i })).toHaveCount(0);
});

test("chart Save commits its working toast before dashboard busy state", async ({ page }) => {
  await enterBiomedicalBuild(page);
  const quick = await openQuickEditor(page);
  await quick.getByRole("textbox", { name: "Chart title", exact: true }).fill("Toast precedes chart save work");
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

  let ordering;
  try {
    await save.click();
    ordering = await page.evaluate(() => window.__chartSaveOrdering);
  } finally {
    await page.evaluate(() => {
      window.__chartSaveOrderingObserver.disconnect();
      delete window.__chartSaveOrderingObserver;
      delete window.__chartSaveOrdering;
    });
  }
  expect(ordering.toastDelivery).not.toBeNull();
  expect(ordering.busyDelivery).not.toBeNull();
  expect(ordering.toastWasTopmost).toBe(true);
  expect(ordering.toastDelivery).toBeLessThan(ordering.busyDelivery);
});

test("failed operation feedback stays visually above an overlapping Quick Edit surface", async ({ page }) => {
  await enterBiomedicalBuild(page);
  await page.setViewportSize({ width: 790, height: 600 });
  const quick = await openQuickEditor(page);
  await page.evaluate(() => {
    const stringify = JSON.stringify;
    globalThis.__SIMEX_SAVED_JSON_STRINGIFY__ = stringify;
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
  try {
    await quick.getByRole("textbox", { name: "Chart title", exact: true }).fill("Toast stacking probe");
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
  } finally {
    await page.evaluate(() => {
      JSON.stringify = globalThis.__SIMEX_SAVED_JSON_STRINGIFY__;
      delete globalThis.__SIMEX_SAVED_JSON_STRINGIFY__;
      delete globalThis.__SIMEX_FAIL_TOAST_PROBE_ONCE__;
    });
  }
});

async function enterBiomedicalBuild(page) {
  await page.getByRole("navigation", { name: "Dashboard pages" })
    .getByRole("button", { name: "Biomedical", exact: true })
    .click();
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await expect(page.locator('[data-canonical-mode="build"]')).toBeVisible();
}

async function currentEditablePanel(page) {
  const panel = page.locator(`[data-panel-id="${EDIT_CHART_ID}"]`);
  await expect(panel).toBeVisible();
  await panel.scrollIntoViewIfNeeded();
  await panel.hover();
  await expect(panel).toHaveAttribute("data-build-placement-id", EDIT_CHART_ID);
  return panel;
}

async function openChartEditMenu(page) {
  const panel = await currentEditablePanel(page);
  const placementId = await panel.getAttribute("data-build-placement-id");
  await page.locator(`[data-panel-menu="${placementId}"]`).click();
  const menu = page.locator(`#panel-menu-${placementId}[role="menu"]`);
  await expect(menu).toBeVisible();
  return menu.locator('[data-action-menu-item="edit"]');
}

async function openQuickEditor(page) {
  const panel = await currentEditablePanel(page);
  await choosePanelAction(page, await panel.getAttribute("data-build-placement-id"), "edit");
  const quick = page.locator(".chart-quick-editor");
  await expect(quick).toBeVisible();
  return quick;
}

function holdAnimationFrames(page) {
  return page.evaluate(() => {
    window.__savedAnimationFrame = window.requestAnimationFrame;
    window.__savedCancelAnimationFrame = window.cancelAnimationFrame;
    window.__heldAnimationFrames = [];
    window.requestAnimationFrame = (callback) => {
      window.__heldAnimationFrames.push(callback);
      return window.__heldAnimationFrames.length;
    };
    window.cancelAnimationFrame = () => {};
  });
}

function releaseAnimationFrames(page) {
  return page.evaluate(() => {
    window.requestAnimationFrame = window.__savedAnimationFrame;
    window.cancelAnimationFrame = window.__savedCancelAnimationFrame;
    delete window.__savedAnimationFrame;
    delete window.__savedCancelAnimationFrame;
    delete window.__heldAnimationFrames;
  });
}
