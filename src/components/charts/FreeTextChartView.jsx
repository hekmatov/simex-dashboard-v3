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
  const mediaItems = useShallowStableCollection(contentRenderContext.mediaItems);
  const prepared = React.useMemo(() => compilePortableQmd(model?.qmd ?? "", {
    panelId,
    hostHeadingLevel,
    mediaItems,
  }), [hostHeadingLevel, mediaItems, model?.qmd, panelId]);

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
      mediaItem: valueForId(mediaItems, host.dataset.qmdMediaId),
      attributes: {
        alt: host.dataset.qmdMediaAlt ?? "",
        width: host.dataset.qmdMediaWidth,
        align: host.dataset.qmdMediaAlign,
        flow: host.dataset.qmdMediaFlow,
        frame: host.dataset.qmdMediaFrame,
        ...(host.dataset.qmdMediaFrameWeight === undefined ? {} : { frameWeight: Number(host.dataset.qmdMediaFrameWeight) }),
        ...(host.dataset.qmdMediaFrameColor === undefined ? {} : { frameColor: host.dataset.qmdMediaFrameColor }),
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

function useShallowStableCollection(collection) {
  const stable = React.useRef(collection);
  if (!shallowCollectionEqual(stable.current, collection)) stable.current = collection;
  return stable.current;
}

function shallowCollectionEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (left instanceof Map || right instanceof Map) {
    if (!(left instanceof Map) || !(right instanceof Map) || left.size !== right.size) return false;
    for (const [key, value] of left) {
      if (!right.has(key) || !Object.is(value, right.get(key))) return false;
    }
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => Object.is(value, right[index]));
  }
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => Object.hasOwn(right, key) && Object.is(left[key], right[key]));
}

export default FreeTextChartView;
