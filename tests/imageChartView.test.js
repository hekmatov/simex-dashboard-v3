import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import {
  discardSessionImageAsset,
  resolveSessionImageAsset,
  stageSessionImageAsset,
} from "../src/static-content/image/imageAssetValidation.js";
import { prepareOperationalData } from "../src/charting/data/prepareOperationalData.js";
import { buildOperationalRenderModel } from "../src/charting/rendering/operationalAdapter.js";
import { imageFixtureBytes } from "./fixtures/imageFixtureBytes.js";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const { default: ChartView } = await vite.ssrLoadModule("/src/components/charts/ChartView.jsx");
const {
  default: ImageChartView,
  clampImagePan,
  nextImageZoomScale,
} = await vite.ssrLoadModule("/src/components/charts/ImageChartView.jsx");
const { ImageSourceEditor } = await vite.ssrLoadModule("/src/components/static-content/ImageSourceEditor.jsx");
const { ImageTransformEditor } = await vite.ssrLoadModule("/src/components/static-content/ImageTransformEditor.jsx");
await vite.close();

const PNG = imageFixtureBytes("image/png");

test("operational Image preparation is an explicit legacy-inline adapter and rejects typed static sources", () => {
  const schema = { typeId: "image" };
  const chart = { typeId: "image", sourceId: "image-source" };
  const typed = prepareOperationalData({
    schema,
    chart,
    rows: [{ src: "https://example.test/should-not-render.png" }],
    renderContext: {
      sources: {
        "image-source": { kind: "staticImage" },
      },
    },
  });
  assert.equal(typed.marks.length, 0);
  assert.equal(typed.diagnostics[0].code, "typed-static-image-legacy-adapter");

  const legacy = prepareOperationalData({
    schema,
    chart,
    rows: [{ src: "/legacy-map.png", alt: "Legacy map", fit: "cover" }],
  });
  assert.equal(legacy.meta.adapter, "legacy-inline-image");
  assert.deepEqual(buildOperationalRenderModel({ chart, prepared: legacy }), {
    kind: "image",
    src: "/legacy-map.png",
    alt: "Legacy map",
    fit: "cover",
    legacyInline: true,
  });
  assert.deepEqual(buildOperationalRenderModel({
    chart,
    prepared: { marks: legacy.marks, meta: {} },
  }), {
    kind: "image",
    src: "/legacy-map.png",
    alt: "Legacy map",
    fit: "cover",
    legacyInline: true,
  });
  assert.deepEqual(buildOperationalRenderModel({
    chart,
    prepared: { marks: legacy.marks, meta: { adapter: "typed-static-image" } },
  }), {
    kind: "error",
    message: "Typed static Image must resolve before the legacy inline-row adapter.",
  });
});

test("typed static Image routes canonically without rows and applies saved metadata independently", async () => {
  const staged = await stageSessionImageAsset({
    bytes: PNG,
    declaredMediaType: "image/png",
    decoded: { mediaType: "image/png", width: 2, height: 3, frameCount: 1 },
  });
  const source = {
    kind: "staticImage",
    sourceVersion: 2,
    mediaId: "media-image-source",
    alt: "Clinic readiness map",
    decorative: false,
    fit: "cover",
    crop: { x: 100, y: 200, width: 700, height: 600 },
    rotation: 90,
  };
  const html = renderToStaticMarkup(React.createElement(ChartView, {
    chart: { id: "image-panel", typeId: "image", title: "Readiness", sourceId: "image-source" },
    renderContext: {
      sources: { "image-source": source },
      mediaItems: {
        "media-image-source": {
          mediaId: "media-image-source",
          revision: 3,
          current: { kind: "asset", assetId: staged.assetId },
          displayName: "Clinic readiness map",
          defaultDescription: "Clinic readiness map",
          origin: "uploaded",
          health: "ready",
          dimensions: { width: 2, height: 3 },
          byteLength: staged.manifestEntry.byteLength,
          mediaType: "image/png",
        },
      },
      assets: { [staged.assetId]: staged.manifestEntry },
      resolveStaticAsset: () => resolveSessionImageAsset(staged.assetId),
    },
    interactionMode: "active",
    surface: "view",
  }));
  assert.match(html, /data-static-image="true"/);
  assert.match(html, /alt="Clinic readiness map"/);
  assert.match(html, /data-image-transform-order="rotation-crop-fit"/);
  assert.match(html, /viewBox="0\.3 0\.4 2\.1 1\.2"/);
  assert.match(html, /preserveAspectRatio="xMidYMid slice"/);
  assert.match(html, /transform="matrix\(0 1 -1 0 3 0\)"/);
  assert.match(html, /<foreignObject x="0" y="0" width="2" height="3">/);
  assert.doesNotMatch(html, /object-fit:fill/);
  assert.match(html, /data-image-zoom-scale="1"/);
  assert.doesNotMatch(html, /chart-status-error|No chart data/);
  discardSessionImageAsset(staged.assetId);
});

test("saved geometry preserves intrinsic aspect while mapping rotated normalized crops to pixels", () => {
  const cases = [
    {
      name: "landscape zero contain",
      width: 1200,
      height: 600,
      rotation: 0,
      fit: "contain",
      viewBox: "120 120 840 300",
      matrix: "matrix(1 0 0 1 0 0)",
      preserve: "xMidYMid meet",
    },
    {
      name: "landscape quarter-turn cover",
      width: 1200,
      height: 600,
      rotation: 90,
      fit: "cover",
      viewBox: "60 240 420 600",
      matrix: "matrix(0 1 -1 0 600 0)",
      preserve: "xMidYMid slice",
    },
    {
      name: "portrait zero cover",
      width: 600,
      height: 1200,
      rotation: 0,
      fit: "cover",
      viewBox: "60 240 420 600",
      matrix: "matrix(1 0 0 1 0 0)",
      preserve: "xMidYMid slice",
    },
    {
      name: "portrait three-quarter-turn contain",
      width: 600,
      height: 1200,
      rotation: 270,
      fit: "contain",
      viewBox: "120 120 840 300",
      matrix: "matrix(0 -1 1 0 0 600)",
      preserve: "xMidYMid meet",
    },
  ];

  for (const geometry of cases) {
    const html = renderToStaticMarkup(React.createElement(ImageChartView, {
      chart: { title: geometry.name },
      model: {
        kind: "image",
        status: "ready",
        src: "/controlled-non-square.png",
        width: geometry.width,
        height: geometry.height,
        alt: geometry.name,
        decorative: false,
        fit: geometry.fit,
        crop: { x: 100, y: 200, width: 700, height: 500 },
        rotation: geometry.rotation,
        revision: 1,
      },
      interactionMode: "passive",
      surface: "audience",
    }));
    assert.match(html, new RegExp(`viewBox="${geometry.viewBox}"`), geometry.name);
    assert.match(html, new RegExp(`preserveAspectRatio="${geometry.preserve}"`), geometry.name);
    assert.match(html, new RegExp(`transform="${geometry.matrix.replace(/[()]/g, "\\$&")}"`), geometry.name);
    assert.match(
      html,
      new RegExp(`<foreignObject x="0" y="0" width="${geometry.width}" height="${geometry.height}">`),
      geometry.name,
    );
    assert.match(
      html,
      new RegExp(`<img[^>]*width="${geometry.width}"[^>]*height="${geometry.height}"`),
      geometry.name,
    );
    assert.doesNotMatch(html, /object-fit:fill/, geometry.name);
  }
});

test("decorative and passive Image rendering remove announced content and all controls", () => {
  const html = renderToStaticMarkup(React.createElement(ImageChartView, {
    chart: { title: "Decorative separator" },
    model: {
      kind: "image",
      status: "ready",
      src: "https://example.test/separator.png",
      alt: "",
      decorative: true,
      fit: "contain",
      crop: { x: 0, y: 0, width: 1000, height: 1000 },
      rotation: 0,
      revision: 1,
    },
    interactionMode: "passive",
    surface: "audience",
  }));
  assert.match(html, /alt=""/);
  assert.match(html, /role="presentation"/);
  assert.match(html, /aria-hidden="true"/);
  assert.doesNotMatch(html, /Zoom in|Zoom out|Reset view|Pan image|chart-image-actions/);
});

test("active viewer exposes bounded semantic controls with Reset view distinct from Reset image", () => {
  const html = renderToStaticMarkup(React.createElement(ImageChartView, {
    chart: { title: "Response map" },
    model: {
      kind: "image",
      status: "ready",
      src: "https://example.test/map.png",
      alt: "Response map",
      decorative: false,
      fit: "contain",
      crop: { x: 0, y: 0, width: 1000, height: 1000 },
      rotation: 0,
      revision: 1,
    },
    interactionMode: "active",
    surface: "fullscreen",
  }));
  assert.match(html, /aria-label="Image viewer actions"/);
  assert.match(html, /aria-label="Zoom in"/);
  assert.match(html, /aria-label="Zoom out"/);
  assert.match(html, /Reset view/);
  assert.doesNotMatch(html, /Reset image/);
  assert.equal(nextImageZoomScale(1, { ctrlKey: true, deltaY: -1 }), 1.25);
  assert.equal(nextImageZoomScale(3, { ctrlKey: true, deltaY: -1 }), 3);
  assert.equal(nextImageZoomScale(1, { ctrlKey: true, deltaY: 1 }), 1);
  assert.deepEqual(clampImagePan({ x: 900, y: -900 }, 2), { x: 50, y: -50 });
  assert.deepEqual(clampImagePan({ x: 30, y: -20 }, 1), { x: 0, y: 0 });
});

test("an intentionally untitled Image has no generated visible caption but keeps an accessible viewer name", () => {
  const html = renderToStaticMarkup(React.createElement(ImageChartView, {
    chart: { title: "" },
    model: {
      kind: "image",
      status: "ready",
      src: "https://example.test/map.png",
      alt: "Response map",
      decorative: false,
      fit: "contain",
      crop: { x: 0, y: 0, width: 1000, height: 1000 },
      rotation: 0,
      revision: 1,
    },
    interactionMode: "active",
    surface: "view",
  }));

  assert.doesNotMatch(html, /<figcaption>|Chart image<\/figcaption>/);
  assert.match(html, /aria-label="Response map image viewer\./);
  assert.match(html, /alt="Response map"/);
});

test("typed failures stay panel-scoped and expose the exact active-surface recovery inventory", () => {
  const source = {
    kind: "staticImage",
    sourceVersion: 2,
    mediaId: "media-missing-source",
    alt: "Missing response map",
    decorative: false,
    fit: "contain",
    crop: { x: 0, y: 0, width: 1000, height: 1000 },
    rotation: 0,
  };
  const html = renderToStaticMarkup(React.createElement(ChartView, {
    chart: { id: "missing-image", typeId: "image", title: "Missing image", sourceId: "missing-source" },
    renderContext: {
      sources: { "missing-source": source },
      mediaItems: {
        "media-missing-source": {
          mediaId: "media-missing-source",
          revision: 1,
          current: { kind: "asset", assetId: "missing" },
          displayName: "Missing response map",
          defaultDescription: "Missing response map",
          origin: "uploaded",
          health: "missing",
        },
      },
      assets: {},
    },
    interactionMode: "active",
    surface: "build",
  }));
  assert.match(html, /data-static-failure="missing-asset"/);
  assert.match(html, /Retry[\s\S]*Replace[\s\S]*Edit/);
  assert.doesNotMatch(html, /missing-source|assetId|storage/);
});

test("Image editors expose guided source/accessibility/transforms with real keyboard alternatives", () => {
  const source = {
    kind: "staticImage",
    sourceVersion: 1,
    revision: 1,
    origin: { kind: "url", url: "https://example.test/map.png" },
    alt: "Response map",
    decorative: false,
    fit: "contain",
    crop: { x: 0, y: 0, width: 1000, height: 1000 },
    rotation: 0,
  };
  const sourceControls = React.createElement(ImageSourceEditor, {
    source,
    assets: {},
    imageEditing: { altReviewRequired: false },
    onOriginChange() {},
    onReplace() {},
    onAltChange() {},
    onDecorativeChange() {},
  });
  const html = renderToStaticMarkup(React.createElement(ImageTransformEditor, {
    source,
    sourceUrl: source.origin.url,
    sourceControls,
    onTransformChange() {},
    onReset() {},
  }));
  assert.ok(html.indexOf("data-image-crop-preview") < html.indexOf("data-image-guided-sections"));
  assert.match(html, /type="file"/);
  assert.match(html, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(html, /Alternative text/);
  assert.match(html, /aria-label="Move crop left"/);
  assert.match(html, /aria-label="Move crop right"/);
  assert.match(html, /Crop x/);
  assert.match(html, /Rotate left/);
  assert.match(html, /Rotate right/);
  assert.match(html, /Reset image/);
});
