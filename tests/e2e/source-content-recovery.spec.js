import { expect, test } from "@playwright/test";

test("Journey H — missing corrupt and relink repair stay isolated", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:4175/tests/fixtures/portable-qmd-browser.html");

  const build = await mountHealthFixture(page, "build");
  expect(build).toMatchObject({
    mediaId: "journey-h-missing-media", health: "missing", images: 0,
    requests: 0, repairs: 1, repairControl: true,
  });
  expect(build.text).toContain("Journey H map is unavailable and needs repair in Build.");

  await page.setViewportSize({ width: 390, height: 844 });
  const view = await mountHealthFixture(page, "view");
  expect(view.repairControl).toBe(false);
  expect(view.images).toBe(0);
  expect(view.requests).toBe(0);
  expect(view.text).toContain("needs repair in Build");

  const fullscreen = await mountHealthFixture(page, "fullscreen");
  expect(fullscreen.repairControl).toBe(false);
  expect(fullscreen.images).toBe(0);
  expect(fullscreen.requests).toBe(0);
  expect(fullscreen.mediaId).toBe("journey-h-missing-media");
});

async function mountHealthFixture(page, surface) {
  return page.evaluate(async (surface) => {
    const { default: React } = await import("/node_modules/.vite/deps/react.js");
    const { default: ReactDOMClient } = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { default: FreeTextChartView } = await import("/src/components/charts/FreeTextChartView.jsx");
    const target = document.querySelector("#target");
    const root = ReactDOMClient.createRoot(target);
    let requests = 0;
    let repairs = 0;
    root.render(React.createElement(FreeTextChartView, {
      surface,
      chart: { id: "journey-h-panel", title: "Journey H" },
      model: { sourceId: "journey-h-source", revision: 1, qmd: "![Journey H map](simex-media:journey-h-missing-media)" },
      contentRenderContext: {
        mediaItems: {
          "journey-h-missing-media": {
            mediaId: "journey-h-missing-media", revision: 3,
            current: { kind: "asset", assetId: "journey-h-missing-asset" },
            displayName: "Journey H map", defaultDescription: "Journey H map",
            origin: "uploaded", health: "missing",
          },
        },
        assets: {},
        resolveAsset: async () => { requests += 1; throw new Error("unhealthy media must not resolve"); },
        requestRepair: () => { repairs += 1; },
      },
    }));
    for (let index = 0; index < 50 && !target.querySelector(".qmd-media-view"); index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const repair = target.querySelector(".qmd-media-view__repair");
    repair?.click();
    const result = {
      mediaId: target.querySelector(".qmd-media-view")?.dataset.qmdMediaId,
      health: target.querySelector(".qmd-media-view")?.dataset.qmdMediaHealth,
      images: target.querySelectorAll("img").length,
      requests,
      repairs,
      repairControl: Boolean(repair),
      text: target.querySelector(".qmd-media-view")?.textContent?.replace(/\s+/g, " ").trim(),
    };
    root.unmount();
    return result;
  }, surface);
}
