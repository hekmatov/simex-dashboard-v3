import { expect, test } from "@playwright/test";

import { compareCanonicalGeometry } from "../dashboardGeometryContract.test.js";

export { compareCanonicalGeometry };

const CONTROL_URL = "http://127.0.0.1:4174";

export const WORKSPACE_VIEWPORTS = Object.freeze([
  Object.freeze({ width: 768, height: 1024 }),
  Object.freeze({ width: 1024, height: 768 }),
  Object.freeze({ width: 1200, height: 900 }),
  Object.freeze({ width: 1440, height: 900 }),
]);

const CANONICAL_ATTRIBUTES = Object.freeze({
  page: "data-canonical-page-id",
  canvas: "data-canonical-canvas-id",
  grid: "data-canonical-grid-id",
  section: "data-canonical-section-id",
  panel: "data-canonical-panel-id",
  placement: "data-canonical-placement-id",
  plot: "data-canonical-plot-id",
});

export async function readCanonicalGeometry(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const panels = page.locator("[data-canonical-panel-id], .chart-panel");
  for (let index = 0; index < await panels.count(); index += 1) {
    await panels.nth(index).scrollIntoViewIfNeeded();
  }
  await page.evaluate(() => window.scrollTo(0, 0));

  return page.evaluate((attributes) => {
    const geometry = {};
    for (const [kind, attribute] of Object.entries(attributes)) {
      geometry[kind] = [...document.querySelectorAll(`[${attribute}]`)].map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          id: element.getAttribute(attribute),
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        };
      });
    }
    return {
      viewport: {
        clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight,
        devicePixelRatio: window.devicePixelRatio,
        scrollY: window.scrollY,
      },
      geometry,
    };
  }, CANONICAL_ATTRIBUTES);
}

test.describe.configure({ timeout: 150_000 });

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, {
    data: { mode: "absent" },
  });
});

test("exact View Build geometry", async ({ page }) => {
  for (const viewport of WORKSPACE_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.locator(".dashboard-command-page-scroller")
      .getByRole("button", { name: "Biomedical", exact: true })
      .click();
    await expect(page.locator(".chart-panel").first()).toBeVisible();
    const viewGeometry = await readCanonicalGeometry(page);
    const viewLegacy = await readLegacyDiagnostic(page);

    await page.getByLabel("Dashboard mode")
      .getByRole("button", { name: "Build", exact: true })
      .click();
    await expect(page.locator(".build-workspace")).toBeVisible();
    const buildGeometry = await readCanonicalGeometry(page);
    const buildLegacy = await readLegacyDiagnostic(page);

    const label = `${viewport.width}x${viewport.height}`;
    expect(buildGeometry.viewport, `${label} reference viewport`).toEqual(viewGeometry.viewport);

    let comparisons = [];
    let contractError = null;
    try {
      comparisons = compareCanonicalGeometry(viewGeometry, buildGeometry);
    } catch (error) {
      contractError = error;
    }
    expect(
      contractError,
      `${label} legacy canvas View ${formatRect(viewLegacy.canvas)} Build ${formatRect(buildLegacy.canvas)}; `
        + `first section View ${formatRect(viewLegacy.section)} Build ${formatRect(buildLegacy.section)}; `
        + `first panel View ${formatRect(viewLegacy.panel)} Build ${formatRect(buildLegacy.panel)}`,
    ).toBeNull();

    for (const comparison of comparisons) {
      expect(
        comparison.delta,
        `${label} ${comparison.kind} ${comparison.id}`,
      ).toEqual({ x: "0.00", y: "0.00", width: "0.00", height: "0.00" });
    }
    const canvas = comparisons.find(({ kind }) => kind === "canvas");
    console.log("CANONICAL_GEOMETRY", JSON.stringify({
      viewport: label,
      counts: Object.fromEntries(Object.entries(viewGeometry.geometry).map(([kind, entries]) => [kind, entries.length])),
      canvas: { view: canvas.view, build: canvas.build, delta: canvas.delta },
      comparisons: comparisons.length,
    }));
  }
});

async function readLegacyDiagnostic(page) {
  return page.evaluate(() => {
    const read = (selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
    };
    return {
      canvas: read(".dashboard-workspace"),
      section: read(".dashboard-section"),
      panel: read(".chart-panel"),
    };
  });
}

function formatRect(rect) {
  if (!rect) return "missing";
  return `x=${rect.x.toFixed(2)} y=${rect.y.toFixed(2)} width=${rect.width.toFixed(2)} height=${rect.height.toFixed(2)}`;
}
