import { expect, test } from "@playwright/test";

import { openDashboardPage } from "./support/landingWorkflow.js";
import {
  createSavedPresentationScene,
  enterPresentWithScene,
  openAudienceSession,
} from "./support/present-audience-workflow.js";

const PANEL_ID = "bio_municipality_aggregate";
const EXPECTED_PRESENT_TIME = Object.freeze({
  activeEpochMs: Date.UTC(2020, 1, 27),
  frameIndex: 0,
  traceMode: "full",
});

test("canonical runtime ledger preserves tracked semantics across View, Build, Present, and Audience", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await openDashboardPage(page, "biomedical");

  const view = await readLedger(page, `[data-panel-id="${PANEL_ID}"]`);
  expect(view).toMatchObject({
    annotations: [],
    filters: [],
    panelId: PANEL_ID,
    render: { kind: "echarts", resolution: "available", status: "ready", typeId: "line" },
    series: [expect.objectContaining({
      id: "AantalCumulatief",
      name: "AantalCumulatief",
    })],
  });
  expect(view.series[0].values[0]).toEqual(["2020-02-27", 1.009833]);
  expect(view.series[0].values.at(-1)).toEqual(["2021-04-17", 1390326.2998229999]);

  await page.locator('[data-dashboard-mode="build"]').click();
  const build = await readLedger(page, `[data-panel-id="${PANEL_ID}"]`);
  expect(build).toEqual(view);

  const scene = await createSavedPresentationScene(page, { entry: "build-biomedical" });
  expect(scene.present.chartIds).toContain(PANEL_ID);
  await installCanonicalLedgerObserver(page);
  await enterPresentWithScene(page, scene);
  await page.locator('[data-presentation-control-id="trace-full"]').click();
  const present = await expect.poll(() => page.evaluate((panelId) => (
    window.__canonicalRuntimeLedgers?.[panelId] ?? null
  ), PANEL_ID)).toMatchObject({ time: { traceMode: "full" } }).then(() => (
    page.evaluate((panelId) => window.__canonicalRuntimeLedgers[panelId], PANEL_ID)
  ));
  const audienceSession = await openAudienceSession(page);
  const audience = await readLedger(
    audienceSession.popup,
    `[data-displayed-chart-id="${PANEL_ID}"]`,
  );

  expect(withoutTime(present)).toEqual(withoutTime(view));
  expect(present.time).toEqual(EXPECTED_PRESENT_TIME);
  expect(audience).toEqual(present);
  await audienceSession.popup.close();
});

async function readLedger(page, ownerSelector, { requireVisible = true } = {}) {
  if (requireVisible) await page.locator(ownerSelector).scrollIntoViewIfNeeded();
  const ledger = page.locator(`${ownerSelector} [data-canonical-runtime-ledger]`).first();
  if (requireVisible) await expect(ledger).toBeVisible();
  const serialized = await expect.poll(() => (
    ledger.getAttribute("data-canonical-runtime-ledger")
  )).not.toBeNull().then(() => ledger.getAttribute("data-canonical-runtime-ledger"));
  return JSON.parse(serialized);
}

function withoutTime(ledger) {
  return { ...ledger, time: undefined };
}

async function installCanonicalLedgerObserver(page) {
  await page.evaluate(() => {
    window.__canonicalRuntimeLedgers = {};
    const collect = (root) => {
      if (!(root instanceof Element)) return;
      const elements = [
        ...(root.matches("[data-canonical-runtime-ledger]") ? [root] : []),
        ...root.querySelectorAll("[data-canonical-runtime-ledger]"),
      ];
      for (const element of elements) {
        try {
          const ledger = JSON.parse(element.getAttribute("data-canonical-runtime-ledger"));
          window.__canonicalRuntimeLedgers[ledger.panelId] = ledger;
        } catch {
          // Ignore a node while React is replacing its serialized attribute.
        }
      }
    };
    window.__canonicalLedgerObserver = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes") collect(record.target);
        for (const node of record.addedNodes) collect(node);
      }
    });
    window.__canonicalLedgerObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-canonical-runtime-ledger"],
      childList: true,
      subtree: true,
    });
  });
}
