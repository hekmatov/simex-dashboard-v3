import React from "react";

export function hasLandingPresentation(page) {
  return Boolean(
    page?.pageType === "landing"
      && page.landing
      && typeof page.landing === "object"
      && !Array.isArray(page.landing)
      && page.landing.hero?.headline,
  );
}

export default function LandingPage({
  page,
  pages,
  onNavigate,
  baseUrl = import.meta.env.BASE_URL,
}) {
  const [previewVisible, setPreviewVisible] = React.useState(
    Boolean(page?.landing?.previewAsset?.src),
  );
  if (!hasLandingPresentation(page)) {
    return null;
  }

  const landing = page.landing;
  const primaryTarget = validPageTarget(landing.hero.primaryAction?.pageId, pages);
  const proofPoints = arrayOf(landing.proofPoints);
  const capabilities = arrayOf(landing.capabilities);
  const routes = arrayOf(landing.domainRoutes).filter((route) =>
    validPageTarget(route.pageId, pages),
  );
  const tourItems = arrayOf(landing.tourItems);
  const statuses = arrayOf(landing.deliveryStatus);

  return (
    <article className="showcase-landing" aria-labelledby="showcase-landing-title">
      <section className="showcase-hero">
        <div className="showcase-hero-copy">
          {landing.hero.deliveryLabel && <p className="showcase-pill">{landing.hero.deliveryLabel}</p>}
          <h1 id="showcase-landing-title">{landing.hero.headline}</h1>
          {landing.hero.summary && <p className="showcase-hero-summary">{landing.hero.summary}</p>}
          <div className="showcase-actions">
            {primaryTarget && (
              <button type="button" onClick={() => onNavigate(primaryTarget)}>
                {landing.hero.primaryAction.label}
              </button>
            )}
            {landing.hero.secondaryAction?.anchorId && (
              <a className="showcase-secondary-action" href={`#${landing.hero.secondaryAction.anchorId}`}>
                {landing.hero.secondaryAction.label}
              </a>
            )}
          </div>
        </div>
        {previewVisible && landing.previewAsset?.src && (
          <figure className="showcase-landing-preview">
            <img
              src={assetUrl(landing.previewAsset.src, baseUrl)}
              alt={landing.previewAsset.alt ?? ""}
              onError={() => setPreviewVisible(false)}
            />
          </figure>
        )}
      </section>

      {proofPoints.length > 0 && (
        <section className="showcase-proof-grid" aria-label="Dashboard value">
          {proofPoints.map((item) => (
            <div key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </div>
          ))}
        </section>
      )}

      {capabilities.length > 0 && (
        <section className="showcase-section" aria-labelledby="showcase-capabilities-title">
          <p className="showcase-eyebrow">What the dashboard enables</p>
          <h2 id="showcase-capabilities-title">Support the exercise information cycle</h2>
          <div className="showcase-capability-grid">
            {capabilities.map((item) => (
              <article key={item.title}>
                <span className="showcase-capability-number" aria-hidden="true">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {routes.length > 0 && (
        <section className="showcase-section" aria-labelledby="showcase-routes-title">
          <p className="showcase-eyebrow">Explore the live demonstration</p>
          <h2 id="showcase-routes-title">Choose an entry point</h2>
          <div className="showcase-route-grid">
            {routes.map((route) => (
              <article className={`showcase-route showcase-route-${route.tone ?? "default"}`} key={route.pageId}>
                <p>{route.eyebrow}</p>
                <h3>{route.title}</h3>
                <span>{route.description}</span>
                <button type="button" onClick={() => onNavigate(route.pageId)}>{route.actionLabel}</button>
              </article>
            ))}
          </div>
        </section>
      )}

      {tourItems.length > 0 && (
        <section
          className="showcase-tour"
          id={landing.tourAnchorId}
          aria-labelledby="showcase-tour-title"
        >
          <h2 id="showcase-tour-title">What to try during the demonstration</h2>
          <ul>{tourItems.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      )}

      {statuses.length > 0 && (
        <section className="showcase-status" aria-labelledby="showcase-status-title">
          <h2 id="showcase-status-title">First-deliverable status</h2>
          <div>
            {statuses.map((status) => (
              <article className={`showcase-status-${status.state ?? "ready"}`} key={status.label}>
                <strong><span aria-hidden="true">{status.state === "complete" ? "✓" : "→"}</span> {status.label}</strong>
                <p>{status.description}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function validPageTarget(pageId, pages) {
  return (pages ?? []).some((page) => page.id === pageId) ? pageId : null;
}

function arrayOf(value) {
  return Array.isArray(value) ? value : [];
}

function assetUrl(path, baseUrl) {
  if (/^(?:data:|https?:)/i.test(path)) {
    return path;
  }
  return `${baseUrl}${String(path).replace(/^\/+/, "")}`;
}
