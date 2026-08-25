import React from "react";
import { createRoot } from "react-dom/client";

import ChartView from "/src/components/charts/ChartView.jsx";
import ChartPanel from "/src/components/ChartPanel.jsx";
import {
  discardSessionImageAsset,
  stageSessionImageAsset,
} from "/src/static-content/image/imageAssetValidation.js";

const root = createRoot(document.getElementById("root"));
const pending = new Map();
const releaseCounts = new Map();
const attemptsByAsset = new Map();
let attemptSequence = 0;
let buildSelections = [];

const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const PNG_BYTES = Uint8Array.from(atob(PNG_BASE64), (character) => character.charCodeAt(0));

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

function manifestEntry(assetId, storageState = "durable") {
  return {
    mediaType: "image/png",
    byteLength: 68,
    width: 1,
    height: 1,
    sha256: assetId.slice("asset-".length),
    storageState,
  };
}

function createAsyncAttempt(assetId) {
  const attemptId = `${assetId}:attempt-${++attemptSequence}`;
  const promise = new Promise((resolve, reject) => pending.set(attemptId, {
    assetId,
    attemptId,
    resolve,
    reject,
    url: null,
  }));
  const attempts = attemptsByAsset.get(assetId) ?? [];
  attempts.push(attemptId);
  attemptsByAsset.set(assetId, attempts);
  return promise;
}

function renderImage({ suffix, alt, storageState, resolveStaticAsset }) {
  const assetId = `asset-${suffix.repeat(64).slice(0, 64)}`;
  const staticSource = source(assetId, alt);
  root.render(React.createElement(React.StrictMode, null, React.createElement(ChartView, {
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
      assets: { [assetId]: manifestEntry(assetId, storageState) },
      resolveStaticAsset,
    },
    surface: "view",
  })));
  return assetId;
}

window.mountAsyncImage = (suffix, alt) => {
  const assetId = `asset-${suffix.repeat(64).slice(0, 64)}`;
  return renderImage({
    suffix,
    alt,
    storageState: "durable",
    resolveStaticAsset: () => createAsyncAttempt(assetId),
  });
};

window.mountSynchronousImage = (suffix, alt) => renderImage({
  suffix,
  alt,
  storageState: "staged",
  resolveStaticAsset: () => ({ url: `data:image/png;base64,${PNG_BASE64}` }),
});
window.mountImmediateAsyncImage = (suffix, alt) => renderImage({
  suffix,
  alt,
  storageState: "durable",
  resolveStaticAsset: async () => ({ url: `data:image/png;base64,${PNG_BASE64}` }),
});
window.mountBuildImageFailure = () => {
  buildSelections = [];
  const chart = {
    configVersion: 3,
    id: "build-failed-image",
    typeId: "image",
    title: "Build failed image",
    sourceId: "build-failed-source",
    roles: {},
    transformations: { filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap" },
    presentation: { background: { color: "#FFFFFF", transparent: false }, title: { align: "left" }, collection: null },
    interaction: { zoom: { enabled: false }, timeSync: null },
    layout: { size: "standard", width: 2, height: 1 },
  };
  root.render(React.createElement(ChartPanel, {
    panel: chart,
    dataSources: {
      "build-failed-source": {
        kind: "staticImage",
        sourceVersion: 1,
        revision: 1,
        origin: { kind: "url", url: "https://example.test/missing-build-image.png" },
        alt: "Unavailable build image",
        decorative: false,
        fit: "contain",
        crop: { x: 0, y: 0, width: 1000, height: 1000 },
        rotation: 0,
      },
    },
    editMode: true,
    isSelected: true,
    placementId: "build-failed-placement",
    editPageId: "page-a",
    editSectionId: "section-a",
    onBuildSelect: (selection) => buildSelections.push(selection),
  }));
};
window.buildImageSelections = () => [...buildSelections];
window.asyncImageAttemptIds = (assetId) => [...(attemptsByAsset.get(assetId) ?? [])];
window.resolveAsyncImageAttempt = (attemptId) => {
  const attempt = pending.get(attemptId);
  if (!attempt) return null;
  const url = URL.createObjectURL(new Blob([PNG_BYTES], { type: "image/png" }));
  attempt.url = url;
  attempt.resolve({
    url,
    release() {
      releaseCounts.set(attemptId, (releaseCounts.get(attemptId) ?? 0) + 1);
      URL.revokeObjectURL(url);
      return true;
    },
  });
  return url;
};
window.rejectAsyncImageAttempt = (attemptId) => pending.get(attemptId)?.reject(new Error("fixture failure"));
window.unmountAsyncImage = () => root.render(null);
window.asyncImageReleaseCount = (attemptId) => releaseCounts.get(attemptId) ?? 0;
window.asyncImageAttemptUrl = (attemptId) => pending.get(attemptId)?.url ?? null;
window.asyncImageAttemptUrlIsReadable = async (attemptId) => {
  const url = pending.get(attemptId)?.url;
  if (!url) return false;
  try {
    const response = await fetch(url);
    return response.ok && (await response.blob()).size === PNG_BYTES.byteLength;
  } catch {
    return false;
  }
};
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
