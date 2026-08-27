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
  if (!hasLandingPresentation(page)) {
    return null;
  }
  return (
    <LandingPresentation
      landing={page.landing}
      pages={pages}
      onNavigate={onNavigate}
      baseUrl={baseUrl}
    />
  );
}

export function LandingPresentation({
  landing,
  pages,
  onNavigate,
  onModeRequest,
  baseUrl = import.meta.env.BASE_URL,
}) {
  const [previewVisible, setPreviewVisible] = React.useState(
    Boolean(landing?.previewAsset?.src),
  );
  if (!isRecord(landing) || !isRecord(landing.hero) || !nonEmptyString(landing.hero.headline)) {
    return null;
  }

  const hero = landing.hero;
  const primaryAction = resolveLandingPrimaryAction({
    landing,
    pages,
    onNavigate,
    onModeRequest,
  });
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
  const faq = recordWithStrings(landing.faq, ["heading", "description"]);
  const faqItems = recordsWithStrings(landing.faq?.items, ["question", "answer"]);
  const resources = recordWithStrings(landing.resources, ["heading", "description"]);
  const repository = recordWithStrings(resources?.repository, ["destination", "label"]);
  const repositoryUrl = validExternalUrl(repository?.destination);
  const previewAsset = recordWithStrings(landing.previewAsset, ["src"]);

  return (
    <article className="showcase-landing" aria-labelledby="showcase-landing-title">
      <section className="showcase-hero">
        <div className="showcase-hero-copy">
          {nonEmptyString(hero.deliveryLabel) && <p className="showcase-pill">{hero.deliveryLabel}</p>}
          <h1 id="showcase-landing-title">{hero.headline}</h1>
          {nonEmptyString(hero.summary) && <p className="showcase-hero-summary">{hero.summary}</p>}
          <div className="showcase-actions">
            {primaryAction && (
              <button type="button" onClick={primaryAction.activate}>
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
          <p className="showcase-eyebrow">The basics</p>
          <h2 id="showcase-capabilities-title">How SimEx works</h2>
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

      {faq && faqItems.length > 0 && (
        <section className="showcase-faq" aria-labelledby="showcase-faq-title">
          <div className="showcase-faq-intro">
            <p className="showcase-eyebrow">Builder FAQ</p>
            <h2 id="showcase-faq-title">{faq.heading}</h2>
            <p>{faq.description}</p>
          </div>
          <div className="showcase-faq-items">
            {faqItems.map((item, index) => (
              <details key={`${item.question}-${index}`}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {resources && repository && repositoryUrl && (
        <section className="showcase-resources" aria-labelledby="showcase-resources-title">
          <div>
            <p className="showcase-eyebrow">More about SimEx</p>
            <h2 id="showcase-resources-title">{resources.heading}</h2>
            <p>{resources.description}</p>
          </div>
          <a href={repositoryUrl} target="_blank" rel="noreferrer">{repository.label}</a>
        </section>
      )}
    </article>
  );
}

export function resolveLandingPrimaryAction({
  landing,
  pages,
  onNavigate,
  onModeRequest,
} = {}) {
  const configured = landing?.hero?.primaryAction;
  if (!isRecord(configured) || !nonEmptyString(configured.label)) return null;
  if (nonEmptyString(configured.mode) && typeof onModeRequest === "function") {
    return Object.freeze({
      label: configured.label,
      activate: () => onModeRequest(configured.mode),
    });
  }
  const pageId = validPageTarget(configured.pageId, pages);
  if (!pageId || typeof onNavigate !== "function") return null;
  return Object.freeze({
    label: configured.label,
    activate: () => onNavigate(pageId),
  });
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

function validExternalUrl(value) {
  if (!nonEmptyString(value)) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function routeTone(value) {
  return ["biomedical", "socio"].includes(value) ? value : "default";
}

function assetUrl(path, baseUrl) {
  if (/^(?:data:|https?:)/i.test(path)) {
    return path;
  }
  return `${baseUrl}${String(path).replace(/^\/+/, "")}`;
}
