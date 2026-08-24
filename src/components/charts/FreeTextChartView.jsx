import React from "react";

import { compilePortableQmd } from "../../static-content/qmd/compilePortableQmd.js";

export function FreeTextChartView({ model, chart, hostHeadingLevel = 2 } = {}) {
  const panelId = normalizePanelId(chart?.id ?? model?.sourceId);
  const titleId = `${panelId}-title`;
  const contentRef = React.useRef(null);
  const prepared = React.useMemo(() => compilePortableQmd(model?.qmd ?? "", {
    panelId,
    hostHeadingLevel,
  }), [hostHeadingLevel, model?.qmd, panelId]);

  React.useLayoutEffect(() => {
    if (!prepared.ok || !contentRef.current) return;
    contentRef.current.replaceChildren(prepared.fragment.cloneNode(true));
  }, [prepared]);

  if (!prepared.ok) {
    return (
      <section className="static-content-state static-content-state--error" role="status" data-static-failure="invalid-free-text">
        <strong>Free text unavailable</strong>
        <p>{formatFirstError(prepared)}</p>
      </section>
    );
  }

  return (
    <section
      className="free-text-chart-view"
      aria-labelledby={titleId}
      data-static-content-kind="freeText"
      data-static-source-revision={model?.revision}
    >
      <header className="free-text-chart-view__header">
        <h2 id={titleId}>{chart?.title || "Free text"}</h2>
        {chart?.description && <p>{chart.description}</p>}
      </header>
      <div
        ref={contentRef}
        className="free-text-chart-view__content"
        data-portable-qmd-sink="sanitized-fragment"
      />
    </section>
  );
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

export default FreeTextChartView;
