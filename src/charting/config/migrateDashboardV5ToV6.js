export const LEGACY_HOME_PAGE_ID = "home";
export const LEGACY_HOME_CONTENT_TITLE = "Old Homepage Content";

export function isLegacyHomePage(page) {
  return isOrdinaryObject(page)
    && page.id === LEGACY_HOME_PAGE_ID
    && page.pageType === "landing"
    && isOrdinaryObject(page.landing);
}

export function normalizeDashboardHomePreference(home, { ordinaryPageCount }) {
  if (!isOrdinaryObject(home) || Object.keys(home).length !== 1 || !Object.hasOwn(home, "enabled")) {
    throw new TypeError("Dashboard home preference must be an object with only enabled.");
  }
  if (typeof home.enabled !== "boolean") {
    throw new TypeError("Dashboard home preference enabled must be boolean.");
  }
  return { enabled: home.enabled === false && ordinaryPageCount === 0 ? true : home.enabled };
}

export function migrateDashboardV5ToV6(input) {
  if (!isOrdinaryObject(input)) throw new TypeError("Dashboard V6 migration input must be an object.");
  const dashboard = structuredClone(input);
  if (dashboard.configVersion === 6) {
    dashboard.home = normalizeDashboardHomePreference(dashboard.home, {
      ordinaryPageCount: Array.isArray(dashboard.pages) ? dashboard.pages.length : 0,
    });
    return dashboard;
  }
  if (dashboard.configVersion !== 5) {
    throw new Error("Dashboard configuration version 5 or 6 is required.");
  }

  const pages = Array.isArray(dashboard.pages) ? dashboard.pages : [];
  const legacyIndex = pages.findIndex(isLegacyHomePage);
  const legacyHome = legacyIndex >= 0 ? pages[legacyIndex] : null;
  const ordinaryPages = pages.filter((_, index) => index !== legacyIndex);
  let replacementId = null;

  if ((legacyHome?.sections ?? []).length > 0) {
    const identity = uniqueOldHomepageContentIdentity(ordinaryPages);
    replacementId = identity.id;
    ordinaryPages.splice(legacyIndex, 0, {
      id: identity.id,
      label: identity.title,
      title: identity.title,
      description: legacyHome.description,
      sections: structuredClone(legacyHome.sections),
    });
  }

  dashboard.configVersion = 6;
  dashboard.home = { enabled: true };
  dashboard.pages = ordinaryPages;
  if (replacementId) remapLegacyHomePageReferences(dashboard, LEGACY_HOME_PAGE_ID, replacementId);
  return dashboard;
}

function uniqueOldHomepageContentIdentity(pages) {
  const ids = new Set(pages.map((page) => page?.id));
  const titles = new Set(pages.flatMap((page) => [page?.label, page?.title]));
  let suffix = 1;
  while (true) {
    const id = suffix === 1 ? "old-homepage-content" : `old-homepage-content-${suffix}`;
    const title = suffix === 1 ? LEGACY_HOME_CONTENT_TITLE : `${LEGACY_HOME_CONTENT_TITLE} ${suffix}`;
    if (!ids.has(id) && !titles.has(title)) return { id, title };
    suffix += 1;
  }
}

function remapLegacyHomePageReferences(dashboard, legacyPageId, replacementPageId) {
  for (const scene of dashboard.scenes ?? []) {
    if (scene?.pageId === legacyPageId) scene.pageId = replacementPageId;
  }
  for (const page of dashboard.pages ?? []) {
    const landing = page?.landing;
    if (landing?.hero?.primaryAction?.pageId === legacyPageId) {
      landing.hero.primaryAction.pageId = replacementPageId;
    }
    for (const route of landing?.domainRoutes ?? []) {
      if (route?.pageId === legacyPageId) route.pageId = replacementPageId;
    }
  }
}

function isOrdinaryObject(value) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}
