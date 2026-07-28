import React from "react";

export function hasLandingPresentation(page) {
  return Boolean(
    page?.pageType === "landing"
      && isRecord(page.landing)
      && isRecord(page.landing.hero)
      && nonEmptyString(page.landing.hero.headline),
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
  const hero = landing.hero;
  const primaryAction = recordWithStrings(hero.primaryAction, ["label", "pageId"]);
  const primaryTarget = validPageTarget(primaryAction?.pageId, pages);
  const proofPoints = recordsWithStrings(landing.proofPoints, ["title", "description"]);
  const capabilities = recordsWithStrings(
    landing.capabilities,
    ["number", "title", "description"],
  );
  const routes = recordsWithStrings(
    landing.domainRoutes,
    ["eyebrow", "title", "description", "actionLabel", "pageId"],
  ).filter((route) => validPageTarget(route.pageId, pages));
  const tourItems = stringItems(landing.tourItems);
  const tourAnchorId = validAnchorId(landing.tourAnchorId);
  const secondaryAction = recordWithStrings(
    hero.secondaryAction,
    ["label", "anchorId"],
  );
  const secondaryTarget = tourItems.length > 0
    && tourAnchorId
    && secondaryAction?.anchorId === tourAnchorId
    ? tourAnchorId
    : null;
  const statuses = recordsWithStrings(
    landing.deliveryStatus,
    ["label", "description"],
  );
  const previewAsset = recordWithStrings(landing.previewAsset, ["src"]);

  return (
    <article className="showcase-landing" aria-labelledby="showcase-landing-title">
      <section className="showcase-hero">
        <div className="showcase-hero-copy">
          {nonEmptyString(hero.deliveryLabel) && <p className="showcase-pill">{hero.deliveryLabel}</p>}
          <h1 id="showcase-landing-title">{hero.headline}</h1>
          {nonEmptyString(hero.summary) && <p className="showcase-hero-summary">{hero.summary}</p>}
          <div className="showcase-actions">
            {primaryTarget && (
              <button type="button" onClick={() => onNavigate(primaryTarget)}>
                {primaryAction.label}
              </button>
            )}
            {secondaryTarget && (
              <a className="showcase-secondary-action" href={`#${secondaryTarget}`}>
                {secondaryAction.label}
              </a>
            )}
          </div>
        </div>
        {previewVisible && previewAsset && (
          <figure className="showcase-landing-preview">
            <img
              src={assetUrl(previewAsset.src, baseUrl)}
              alt={nonEmptyString(previewAsset.alt) ? previewAsset.alt : ""}
              onError={() => setPreviewVisible(false)}
            />
          </figure>
        )}
      </section>

      {proofPoints.length > 0 && (
        <section className="showcase-proof-grid" aria-label="Dashboard value">
          {proofPoints.map((item, index) => (
            <div key={`${item.title}-${index}`}>
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
            {capabilities.map((item, index) => (
              <article key={`${item.title}-${index}`}>
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
            {routes.map((route, index) => (
              <article className={`showcase-route showcase-route-${routeTone(route.tone)}`} key={`${route.pageId}-${index}`}>
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
          id={tourAnchorId ?? undefined}
          aria-labelledby="showcase-tour-title"
        >
          <h2 id="showcase-tour-title">What to try during the demonstration</h2>
          <ul>{tourItems.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
        </section>
      )}

      {statuses.length > 0 && (
        <section className="showcase-status" aria-labelledby="showcase-status-title">
          <h2 id="showcase-status-title">First-deliverable status</h2>
          <div>
            {statuses.map((status, index) => (
              <article className={`showcase-status-${statusState(status.state)}`} key={`${status.label}-${index}`}>
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
  return nonEmptyString(pageId)
    && Array.isArray(pages)
    && pages.some((page) => isRecord(page) && page.id === pageId)
    ? pageId
    : null;
}

function recordsWithStrings(value, fields) {
  return Array.isArray(value)
    ? value.map((item) => recordWithStrings(item, fields)).filter(Boolean)
    : [];
}

function recordWithStrings(value, fields) {
  return isRecord(value) && fields.every((field) => nonEmptyString(value[field]))
    ? value
    : null;
}

function stringItems(value) {
  return Array.isArray(value) ? value.filter(nonEmptyString) : [];
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function validAnchorId(value) {
  return nonEmptyString(value) && /^[A-Za-z][\w:.-]*$/.test(value) ? value : null;
}

function routeTone(value) {
  return ["biomedical", "socio"].includes(value) ? value : "default";
}

function statusState(value) {
  return value === "complete" ? "complete" : "ready";
}

function assetUrl(path, baseUrl) {
  if (/^(?:data:|https?:)/i.test(path)) {
    return path;
  }
  return `${baseUrl}${String(path).replace(/^\/+/, "")}`;
}
