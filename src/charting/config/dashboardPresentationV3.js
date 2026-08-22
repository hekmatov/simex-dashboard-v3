function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function withoutLegacyVantaBackground(section) {
  if (!isRecord(section) || !Object.hasOwn(section, "vantaBackground")) {
    return section;
  }
  const normalized = { ...section };
  delete normalized.vantaBackground;
  return normalized;
}

/** Removes the retired visual-background settings from older dashboard data. */
export function stripLegacyVantaBackground(config) {
  if (!isRecord(config)) return config;

  const hasRootVanta = Object.hasOwn(config, "vantaBackground");
  let normalizedPages = config.pages;
  if (Array.isArray(config.pages)) {
    const pages = config.pages.map((page) => {
      if (!isRecord(page) || !Array.isArray(page.sections)) return page;
      const sections = page.sections.map(withoutLegacyVantaBackground);
      if (sections.every((section, index) => section === page.sections[index])) {
        return page;
      }
      return { ...page, sections };
    });
    if (!pages.every((page, index) => page === config.pages[index])) {
      normalizedPages = pages;
    }
  }

  if (!hasRootVanta && normalizedPages === config.pages) return config;
  const normalized = { ...config, pages: normalizedPages };
  delete normalized.vantaBackground;
  return normalized;
}
