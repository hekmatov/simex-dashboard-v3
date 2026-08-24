import React from "react";

import { parsePortableQmd } from "../../static-content/qmd/parsePortableQmd.js";
import { renderPortableQmd } from "../../static-content/qmd/renderPortableQmd.js";
import { sanitizePortableHtml } from "../../static-content/qmd/sanitizePortableHtml.js";

export function FreeTextChartView({ model, chart, hostHeadingLevel = 2 } = {}) {
  const panelId = normalizePanelId(chart?.id ?? model?.sourceId);
  const titleId = `${panelId}-title`;
  const contentRef = React.useRef(null);
  const prepared = React.useMemo(() => prepareFreeText(model?.qmd ?? "", {
    panelId,
    hostHeadingLevel,
  }), [hostHeadingLevel, model?.qmd, panelId]);

  React.useLayoutEffect(() => {
    if (!prepared.ok || !contentRef.current) return;
    const fragment = sanitizePortableHtml(prepared.html, { panelId });
    contentRef.current.replaceChildren(fragment);
  }, [panelId, prepared]);

  if (!prepared.ok) {
    return (
      <section className="static-content-state static-content-state--error" role="status" data-static-failure="invalid-free-text">
        <strong>Free text unavailable</strong>
        <p>{prepared.message}</p>
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

function prepareFreeText(qmd, options) {
  try {
    const parsed = parsePortableQmd(qmd);
    if (!parsed.ok) {
      const first = parsed.errors[0];
      return {
        ok: false,
        message: `${first.message} (line ${first.location.line}).`,
      };
    }
    return { ok: true, html: renderPortableQmd(parsed.ast, options) };
  } catch {
    return { ok: false, message: "This saved Free text could not be rendered safely." };
  }
}

function normalizePanelId(value) {
  const normalized = String(value ?? "static-text")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "static-text";
}

export default FreeTextChartView;
