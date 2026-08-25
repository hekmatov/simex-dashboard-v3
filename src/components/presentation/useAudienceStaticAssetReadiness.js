import React from "react";

import { resolveStaticImageSource } from "../../static-content/staticSourceResolver.js";

export default function useAudienceStaticAssetReadiness({
  dashboard,
  items = [],
  resolveAsset,
} = {}) {
  const imageItems = items.filter(({ kind }) => kind === "image");
  const identityKey = imageItems.map(imageReadinessKey).join("|");
  const [records, setRecords] = React.useState(() => new Map());

  React.useEffect(() => {
    const loading = new Map(imageItems.map((item) => [
      item.panel_id,
      readinessRecord(item, loadingImageModel(item)),
    ]));
    setRecords(loading);
    return startAudienceStaticAssetReadiness({
      dashboard,
      items: imageItems,
      resolveAsset,
      onSettled: (item, model) => {
        setRecords((existing) => {
          const next = new Map(existing);
          next.set(item.panel_id, readinessRecord(item, model));
          return next;
        });
      },
    });
  }, [dashboard?.assets, dashboard?.contentLibrary, dashboard?.dataSources, identityKey, resolveAsset]);

  return new Map(imageItems.map((item) => {
    const record = records.get(item.panel_id);
    return [
      item.panel_id,
      record?.identity === imageReadinessKey(item)
        ? record.model
        : loadingImageModel(item),
    ];
  }));
}

export function startAudienceStaticAssetReadiness({
  dashboard,
  items = [],
  resolveAsset,
  onSettled = () => {},
} = {}) {
  let current = true;
  const ownedModels = new Set();
  const publish = (item, model) => {
    if (typeof model?.release === "function") ownedModels.add(model);
    if (!current) {
      model?.release?.();
      ownedModels.delete(model);
      return;
    }
    onSettled(item, model);
  };

  for (const item of items.filter(({ kind }) => kind === "image")) {
    const panel = findPanel(dashboard, item.panel_id);
    const source = dashboard?.dataSources?.[panel?.sourceId];
    const mediaItem = dashboard?.contentLibrary?.mediaItems?.[item.media_id];
    if (
      source?.kind !== "staticImage"
      || source.mediaId !== item.media_id
      || mediaItem?.revision !== item.revision
    ) {
      publish(item, failedImageModel(item, "The saved image identity is no longer available."));
      continue;
    }
    try {
      const attempt = resolveStaticImageSource(source, {
        sourceId: panel.sourceId,
        mediaItems: dashboard?.contentLibrary?.mediaItems ?? {},
        assets: dashboard?.assets ?? {},
        resolveAsset,
        expectedRevision: item.revision,
      });
      if (attempt && typeof attempt.then === "function") {
        Promise.resolve(attempt).then(
          (model) => publish(item, model),
          () => publish(item, failedImageModel(item, "The saved image asset could not be read.")),
        );
      } else {
        publish(item, attempt);
      }
    } catch {
      publish(item, failedImageModel(item, "The saved image asset could not be read."));
    }
  }

  return () => {
    current = false;
    for (const model of ownedModels) model.release?.();
    ownedModels.clear();
  };
}

export function imageReadinessKey(item) {
  return `${item.panel_id}:${item.media_id}:${item.revision}`;
}

function readinessRecord(item, model) {
  return { identity: imageReadinessKey(item), model };
}

function loadingImageModel(item) {
  return {
    status: "loading",
    kind: "staticImage",
    mediaId: item.media_id,
    revision: item.revision,
  };
}

function failedImageModel(item, message) {
  return {
    status: "error",
    kind: "staticImage",
    mediaId: item.media_id,
    revision: item.revision,
    failure: {
      code: "asset-read-failed",
      message,
      retryable: true,
    },
  };
}

function findPanel(dashboard, panelId) {
  for (const page of dashboard?.pages ?? []) {
    for (const section of page.sections ?? []) {
      for (const placement of section.panels ?? []) {
        const panel = placement?.chart ?? placement;
        if (panel?.id === panelId) return panel;
      }
    }
  }
  return null;
}
