import React from "react";
import { createPortal } from "react-dom";

import { compilePortableQmd } from "../../static-content/qmd/compilePortableQmd.js";
import QmdMediaView from "./QmdMediaView.jsx";

export function FreeTextChartView({ model, chart, contentRenderContext = {}, hostHeadingLevel = 2, surface = "view", onMediaActivate } = {}) {
  const panelId = normalizePanelId(chart?.id ?? model?.sourceId);
  const titleId = `${panelId}-title`;
  const title = getFreeTextChartTitle(chart?.title);
  const contentRef = React.useRef(null);
  const [portalEntries, setPortalEntries] = React.useState([]);
  const prepared = React.useMemo(() => compilePortableQmd(model?.qmd ?? "", {
    panelId,
    hostHeadingLevel,
    mediaItems: contentRenderContext.mediaItems,
  }), [contentRenderContext.mediaItems, hostHeadingLevel, model?.qmd, panelId]);

  React.useLayoutEffect(() => {
    if (!prepared.ok || !contentRef.current) {
      setPortalEntries([]);
      return undefined;
    }
    const fragment = prepared.fragment.cloneNode(true);
    const sink = contentRef.current;
    sink.replaceChildren(fragment);
    const entries = [...sink.querySelectorAll("[data-qmd-media-host]")].map((host) => ({
      key: host.dataset.qmdMediaKey,
      mediaNodeIndex: Number(host.dataset.qmdMediaNodeIndex),
      sourceStart: Number(host.dataset.qmdMediaSourceStart),
      sourceEnd: Number(host.dataset.qmdMediaSourceEnd),
      prepared,
      host,
      mediaItem: valueForId(contentRenderContext.mediaItems, host.dataset.qmdMediaId),
      attributes: {
        alt: host.dataset.qmdMediaAlt ?? "",
        width: host.dataset.qmdMediaWidth,
        align: host.dataset.qmdMediaAlign,
        flow: host.dataset.qmdMediaFlow,
        frame: host.dataset.qmdMediaFrame,
        caption: host.dataset.qmdMediaCaption ?? "",
        decorative: host.dataset.qmdMediaDecorative === "true",
      },
    }));
    setPortalEntries(entries);
    return () => sink.replaceChildren();
  }, [prepared]);

  if (!prepared.ok) {
    return (
      <section className="static-content-state static-content-state--error" role="status" data-static-failure="invalid-free-text">
        <strong>Free text unavailable</strong>
        <p>{formatFirstError(prepared)}</p>
      </section>
    );
  }

  return <>
    <section
      className="free-text-chart-view"
      {...(title
        ? { "aria-labelledby": titleId }
        : { "aria-label": getFreeTextChartAccessibleName(title) })}
      data-static-content-kind="freeText"
      data-static-source-id={model?.sourceId}
      data-static-source-revision={model?.revision}
    >
      {(title || chart?.description) && <header className="free-text-chart-view__header">
        {title && <h2 id={titleId}>{title}</h2>}
        {chart?.description && <p>{chart.description}</p>}
      </header>}
      <div
        ref={contentRef}
        className="free-text-chart-view__content"
        data-portable-qmd-sink="safe-dom"
      />
    </section>
    {portalEntries.filter((entry) => entry.prepared === prepared).map((entry) => createPortal(<QmdMediaView
      mediaItem={entry.mediaItem}
      attributes={entry.attributes}
      assets={contentRenderContext.assets}
      resolveAsset={contentRenderContext.resolveAsset}
      onRepair={surface === "build" && typeof contentRenderContext.requestRepair === "function"
        ? () => contentRenderContext.requestRepair({ mediaId: entry.mediaItem?.mediaId, panelId: chart?.id, surface })
        : undefined}
      onActivate={typeof onMediaActivate === "function"
        ? () => onMediaActivate({
            key: entry.key,
            mediaNodeIndex: entry.mediaNodeIndex,
            sourceStart: entry.sourceStart,
            sourceEnd: entry.sourceEnd,
            mediaItem: entry.mediaItem,
            attributes: entry.attributes,
          })
        : undefined}
    />, entry.host, entry.key))}
  </>;
}

export function getFreeTextChartTitle(value) {
  return String(value ?? "").trim();
}

export function getFreeTextChartAccessibleName(title) {
  return title || "Free text content";
}

function formatFirstError(prepared) {
  const first = prepared.errors?.[0];
  return first
    ? `${first.message} (line ${first.location.line}).`
    : "This saved Free text could not be rendered safely.";
}

function normalizePanelId(value) {
  const normalized = String(value ?? "static-text")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "static-text";
}

function valueForId(collection, id) {
  if (collection instanceof Map) return collection.get(id);
  if (Array.isArray(collection)) return collection.find((entry) => entry?.mediaId === id);
  return collection?.[id];
}

export default FreeTextChartView;
