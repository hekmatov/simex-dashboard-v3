import React from "react";
import { createRoot } from "react-dom/client";

import ChartView from "/src/components/charts/ChartView.jsx";
import {
  discardSessionImageAsset,
  stageSessionImageAsset,
} from "/src/static-content/image/imageAssetValidation.js";

const root = createRoot(document.getElementById("root"));
const pending = new Map();

function source(assetId, alt) {
  return {
    kind: "staticImage",
    sourceVersion: 1,
    revision: 1,
    origin: { kind: "asset", assetId },
    alt,
    decorative: false,
    fit: "contain",
    crop: { x: 0, y: 0, width: 1000, height: 1000 },
    rotation: 0,
  };
}

function manifestEntry(assetId) {
  return {
    mediaType: "image/png",
    byteLength: 68,
    width: 1,
    height: 1,
    sha256: assetId.slice("asset-".length),
    storageState: "durable",
  };
}

window.mountAsyncImage = (suffix, alt) => {
  const assetId = `asset-${suffix.repeat(64).slice(0, 64)}`;
  const staticSource = source(assetId, alt);
  const promise = new Promise((resolve, reject) => pending.set(assetId, { resolve, reject }));
  root.render(React.createElement(ChartView, {
    chart: {
      configVersion: 3,
      id: `image-${suffix}`,
      typeId: "image",
      title: alt,
      sourceId: `source-${suffix}`,
      roles: {},
      transformations: { filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap" },
      presentation: { background: { color: "#FFFFFF", transparent: false }, title: { align: "left" }, collection: null },
      interaction: { zoom: { enabled: false }, timeSync: null },
      layout: { size: "standard" },
    },
    renderContext: {
      sources: { [`source-${suffix}`]: staticSource },
      assets: { [assetId]: manifestEntry(assetId) },
      resolveStaticAsset: () => promise,
    },
    surface: "view",
  }));
  return assetId;
};

window.resolveAsyncImage = (assetId, url) => pending.get(assetId)?.resolve({ url });
window.rejectAsyncImage = (assetId) => pending.get(assetId)?.reject(new Error("fixture failure"));
window.validateImageFixture = async (mediaType, base64) => {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const result = await stageSessionImageAsset({
    bytes,
    declaredMediaType: mediaType,
    decode: async (encoded, decodedMediaType) => {
      const bitmap = await createImageBitmap(new Blob([encoded], { type: decodedMediaType }));
      const decoded = {
        mediaType: decodedMediaType,
        width: bitmap.width,
        height: bitmap.height,
        frameCount: 1,
      };
      bitmap.close();
      return decoded;
    },
  });
  if (result.ok) discardSessionImageAsset(result.assetId);
  return { ok: result.ok, code: result.errors?.[0]?.code ?? null, asset: result.asset ?? null };
};
window.asyncImageHarnessReady = true;
