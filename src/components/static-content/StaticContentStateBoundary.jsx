import React from "react";

export function StaticContentStateBoundary({
  state,
  surface = "view",
  onRetry,
  onReplace,
  onEdit,
  children,
} = {}) {
  if (!state || state.status === "loading") {
    return <section className="static-content-state static-content-state--loading" aria-label="Static content loading" aria-busy="true"><span>Loading content…</span></section>;
  }
  if (state.status === "error") {
    const build = surface === "build";
    const activeViewer = surface === "view" || surface === "fullscreen";
    return (
      <section className="static-content-state static-content-state--error" role="status" data-static-failure={state.failure?.code}>
        <strong>Image unavailable</strong>
        <p>{state.failure?.message ?? "This static content is unavailable."}</p>
        {(build || activeViewer) && (
          <div className="static-content-state__actions">
            <button type="button" onClick={onRetry}>Retry</button>
            {build && <button type="button" className="secondary" onClick={onReplace}>Replace</button>}
            {build && <button type="button" className="secondary" onClick={onEdit}>Edit</button>}
          </div>
        )}
        {activeViewer && <small>Editing is available in Build.</small>}
      </section>
    );
  }
  return <>{children ?? null}</>;
}

export default StaticContentStateBoundary;
