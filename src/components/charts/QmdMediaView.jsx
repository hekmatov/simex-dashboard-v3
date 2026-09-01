import React from "react";

import { isContainedPackageImagePath } from "../../static-content/image/imageAssetValidation.js";

export default function QmdMediaView({ mediaItem, attributes, assets, resolveAsset, onRepair, onActivate }) {
  const safeAttributes = normalizeAttributes(attributes);
  const local = mediaItem?.current?.kind === "asset" || mediaItem?.current?.kind === "package";
  const healthy = local && mediaItem?.health === "ready";
  const assetId = mediaItem?.current?.kind === "asset" ? mediaItem.current.assetId : null;
  const assetPresent = assetId ? Boolean(valueForId(assets, assetId)) : true;
  const packagedPath = mediaItem?.current?.kind === "package" && isContainedPackageImagePath(mediaItem.current.path)
    ? mediaItem.current.path
    : null;
  const [lease, setLease] = React.useState(null);
  const [resolutionFailed, setResolutionFailed] = React.useState(false);

  React.useEffect(() => {
    let current = true;
    let acquired = null;
    setLease(null);
    setResolutionFailed(false);
    if (!healthy || !assetId || !assetPresent || typeof resolveAsset !== "function") return undefined;
    Promise.resolve(resolveAsset(assetId)).then((next) => {
      acquired = next;
      if (!current) {
        acquired = null;
        next?.release?.();
      }
      else if (typeof next?.url === "string" && next.url.startsWith("blob:")) setLease(next);
      else {
        acquired = null;
        next?.release?.();
        setResolutionFailed(true);
      }
    }, () => {
      if (current) setResolutionFailed(true);
    });
    return () => {
      current = false;
      acquired?.release?.();
    };
  }, [assetId, assetPresent, healthy, mediaItem?.revision, resolveAsset]);

  const src = packagedPath ?? lease?.url ?? null;
  const available = healthy && assetPresent && !resolutionFailed && (packagedPath || assetId);
  const decorative = safeAttributes.decorative;
  const className = [
    "qmd-media-view",
    `qmd-media-view--align-${safeAttributes.align}`,
    `qmd-media-view--flow-${safeAttributes.flow}`,
    `qmd-media-view--frame-${safeAttributes.frame}`,
  ].join(" ");
  const common = {
    className,
    style: safeAttributes.frame === "none" ? undefined : {
      "--qmd-frame-weight": `${safeAttributes.frameWeight ?? 1}px`,
      "--qmd-frame-color": safeAttributes.frameColor || "var(--simex-border-subtle)",
    },
    "data-qmd-media-id": mediaItem?.mediaId,
    "data-qmd-media-revision": mediaItem?.revision,
    "data-qmd-media-health": available ? "ready" : mediaItem?.health ?? "missing",
    "data-qmd-media-flow": safeAttributes.flow,
    "data-qmd-media-width": safeAttributes.width,
  };
  const selectionLabel = `Edit placement for ${mediaItem?.displayName || "embedded image"}`;

  if (!available || (!src && resolutionFailed)) {
    return <span {...common} role="group">
      {typeof onActivate === "function" && typeof onRepair !== "function"
        ? <button type="button" className="qmd-media-view__select" data-qmd-media-select="" aria-label={selectionLabel} onClick={onActivate}>
            <Fallback mediaItem={mediaItem} />
          </button>
        : <>
            <Fallback mediaItem={mediaItem} />
            {typeof onActivate === "function" && <button type="button" className="secondary qmd-media-view__edit" data-qmd-media-select="" aria-label={selectionLabel} onClick={onActivate}>Edit placement</button>}
          </>}
      {typeof onRepair === "function" && <button type="button" className="secondary qmd-media-view__repair" onClick={onRepair}>Repair media</button>}
      {safeAttributes.caption && <span className="qmd-media-view__caption">{safeAttributes.caption}</span>}
    </span>;
  }

  return <span {...common} role="group">
    {typeof onActivate === "function"
      ? <button type="button" className="qmd-media-view__select" data-qmd-media-select="" aria-label={selectionLabel} onClick={onActivate}>
          {src
            ? <MediaImage src={src} mediaItem={mediaItem} safeAttributes={safeAttributes} decorative={decorative} />
            : <span className="qmd-media-view__loading" role="status">Loading embedded image…</span>}
        </button>
      : src
      ? <img
          src={src}
          alt={decorative ? "" : String(mediaItem?.defaultDescription ? safeAlt(mediaItem, safeAttributes) : safeAttributes.alt ?? "")}
          role={decorative ? "presentation" : undefined}
          aria-hidden={decorative ? "true" : undefined}
          width={mediaItem?.dimensions?.width}
          height={mediaItem?.dimensions?.height}
          draggable="false"
        />
      : <span className="qmd-media-view__loading" role="status">Loading embedded image…</span>}
    {safeAttributes.caption && <span className="qmd-media-view__caption">{safeAttributes.caption}</span>}
  </span>;
}

function normalizeAttributes(attributes = {}) {
  const width = /^(?:[1-9]\d|100)%$/.test(attributes.width) ? attributes.width : "100%";
  const frameWeight = Number.isInteger(attributes.frameWeight) && attributes.frameWeight >= 1 && attributes.frameWeight <= 8
    ? attributes.frameWeight
    : undefined;
  const frameColor = /^#[0-9a-f]{6}$/i.test(attributes.frameColor) ? attributes.frameColor : undefined;
  return {
    width,
    align: ["start", "center", "end"].includes(attributes.align) ? attributes.align : "center",
    flow: ["block", "wrap-start", "wrap-end"].includes(attributes.flow) ? attributes.flow : "block",
    frame: ["none", "outline", "card"].includes(attributes.frame) ? attributes.frame : "none",
    frameWeight,
    frameColor,
    caption: typeof attributes.caption === "string" ? attributes.caption : "",
    decorative: attributes.decorative === true,
    alt: typeof attributes.alt === "string" ? attributes.alt : "",
  };
}

function MediaImage({ src, mediaItem, safeAttributes, decorative }) {
  return <img
    src={src}
    alt={decorative ? "" : String(mediaItem?.defaultDescription ? safeAlt(mediaItem, safeAttributes) : safeAttributes.alt ?? "")}
    role={decorative ? "presentation" : undefined}
    aria-hidden={decorative ? "true" : undefined}
    width={mediaItem?.dimensions?.width}
    height={mediaItem?.dimensions?.height}
    draggable="false"
  />;
}

function Fallback({ mediaItem }) {
  const message = mediaItem?.health === "needs-relink"
    ? " needs relinking in Build."
    : mediaItem?.health === "needs-review"
    ? " needs review in Build."
    : mediaItem?.health === "corrupt"
    ? " is corrupt and needs repair in Build."
    : " is unavailable and needs repair in Build.";
  return <span className="qmd-media-view__fallback" role="status">
    <strong>{mediaItem?.displayName || "Embedded image"}</strong>
    <span>{message}</span>
  </span>;
}

function safeAlt(mediaItem, attributes) {
  return typeof attributes.alt === "string" ? attributes.alt : String(mediaItem?.defaultDescription ?? "");
}

function valueForId(collection, id) {
  if (collection instanceof Map) return collection.get(id);
  if (Array.isArray(collection)) return collection.find((entry) => entry?.assetId === id);
  return collection?.[id];
}
