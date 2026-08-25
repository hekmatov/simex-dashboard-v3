import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("an image chart renders an image embedded by dashboard package export", async () => {
  const vite = await createServer({
    root: process.cwd(),
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  const { default: ImageChartView } = await vite.ssrLoadModule(
    "/src/components/charts/ImageChartView.jsx",
  );
  await vite.close();

  const html = renderToStaticMarkup(React.createElement(ImageChartView, {
    model: {
      src: "data:image/png;base64,aW1hZ2U=",
      alt: "Embedded briefing image",
      fit: "contain",
    },
    chart: { title: "Briefing image" },
  }));

  assert.match(html, /<img[^>]+src="data:image\/png;base64,aW1hZ2U="/);
  assert.doesNotMatch(html, /cannot be displayed/i);
});

test("a promoted package Image renders its contained bare relative path", async () => {
  const vite = await createServer({
    root: process.cwd(),
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  const { default: ImageChartView } = await vite.ssrLoadModule(
    "/src/components/charts/ImageChartView.jsx",
  );
  await vite.close();

  const html = renderToStaticMarkup(React.createElement(ImageChartView, {
    model: {
      src: `data/authored/${"a".repeat(64)}.png`,
      alt: "Promoted package image",
      fit: "contain",
    },
    chart: { title: "Promoted image" },
  }));

  assert.match(html, /<img[^>]+src="data\/authored\/[a-f0-9]{64}\.png"/);
  assert.doesNotMatch(html, /cannot be displayed/i);
});

test("the canonical Image renderer does not treat arbitrary bare relative strings as authority", async () => {
  const vite = await createServer({
    root: process.cwd(),
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  const { default: ImageChartView } = await vite.ssrLoadModule(
    "/src/components/charts/ImageChartView.jsx",
  );
  await vite.close();
  const rejected = renderToStaticMarkup(React.createElement(ImageChartView, {
    model: { src: "untrusted/path.png", alt: "No", fit: "contain" },
    chart: { title: "Untrusted" },
  }));
  assert.doesNotMatch(rejected, /<img/);

  const packageAuthorized = renderToStaticMarkup(React.createElement(ImageChartView, {
    model: {
      src: "assets/maps/briefing.png",
      containedPackagePath: true,
      alt: "Contained",
      fit: "contain",
    },
    chart: { title: "Contained" },
  }));
  assert.match(packageAuthorized, /<img[^>]+src="assets\/maps\/briefing\.png"/);
});
