const CONTRACT_VERSION = "1";
const CATALOGUE_ID = "simex-dashboard";
const DISPLAY_MODES = Object.freeze(["fullscreen", "multi_fullscreen"]);

export function buildChartCatalogue(dashboard, aliasConfig) {
  if (!dashboard || typeof dashboard !== "object" || Array.isArray(dashboard)) {
    throw new Error("dashboard must be an object");
  }
  if (!aliasConfig || typeof aliasConfig !== "object" || Array.isArray(aliasConfig)) {
    throw new Error("chart aliases must be an object");
  }

  const catalogueRevision = requiredText(
    dashboard.catalogueRevision ?? dashboard.lastUpdated,
    "catalogue revision",
  );
  const charts = [];
  const chartIds = new Set();

  for (const page of requiredArray(dashboard.pages, "dashboard pages")) {
    const pageId = requiredText(page?.id, "page ID");
    for (const section of requiredArray(page?.sections, `sections for page ${pageId}`)) {
      const sectionId = requiredText(section?.id, `section ID for page ${pageId}`);
      for (const panel of requiredArray(
        section?.panels,
        `panels for section ${sectionId}`,
      )) {
        const chartId = requiredText(panel?.id, "chart ID");
        if (chartIds.has(chartId)) {
          throw new Error(`duplicate chart ID: ${chartId}`);
        }
        chartIds.add(chartId);

        const metadata = aliasConfig[chartId];
        if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
          throw new Error(`missing alias metadata for chart: ${chartId}`);
        }

        charts.push({
          chart_id: chartId,
          title: requiredText(panel.title, `title for chart ${chartId}`),
          description: chartDescription(panel, section, page),
          page_id: pageId,
          section_id: sectionId,
          aliases: normalizedTerms(metadata.aliases, `aliases for chart ${chartId}`),
          keywords: normalizedTerms(metadata.keywords, `keywords for chart ${chartId}`),
          supported_display_modes: [...DISPLAY_MODES],
        });
      }
    }
  }

  const orphanIds = Object.keys(aliasConfig)
    .filter((chartId) => !chartIds.has(chartId))
    .sort(compareText);
  if (orphanIds.length > 0) {
    throw new Error(`orphan alias record: ${orphanIds.join(", ")}`);
  }

  charts.sort((left, right) => compareText(left.chart_id, right.chart_id));
  return {
    contract_version: CONTRACT_VERSION,
    catalogue_id: CATALOGUE_ID,
    catalogue_revision: catalogueRevision,
    charts,
  };
}

export function canonicalCatalogueBytes(catalogue) {
  return new TextEncoder().encode(JSON.stringify(sortObjectKeys(catalogue)));
}

export function canonicalDashboardSemanticsBytes(dashboard) {
  if (!dashboard || typeof dashboard !== "object" || Array.isArray(dashboard)) {
    throw new Error("dashboard must be an object");
  }
  return new TextEncoder().encode(
    JSON.stringify(
      sortObjectKeys({
        catalogue_revision: requiredText(
          dashboard.catalogueRevision ?? dashboard.lastUpdated,
          "catalogue revision",
        ),
        pages: semanticPages(dashboard.pages),
      }),
    ),
  );
}

function semanticPages(pages) {
  return requiredArray(pages, "dashboard pages").map((page) => ({
    ...page,
    sections: requiredArray(page?.sections, `sections for page ${page?.id}`).map(
      (section) => ({
        ...section,
        panels: requiredArray(
          section?.panels,
          `panels for section ${section?.id}`,
        ).map(semanticPanel),
      }),
    ),
  }));
}

function semanticPanel({
  sourceSchema: _runtimeCompatibility,
  ...panel
}) {
  if (!panel.dataBinding?.x) {
    return panel;
  }
  const { type: _profiledAxisType, ...semanticXAxis } = panel.dataBinding.x;
  return {
    ...panel,
    dataBinding: {
      ...panel.dataBinding,
      x: semanticXAxis,
    },
  };
}

export async function buildChartCatalogueSnapshot(
  dashboard,
  aliasConfig,
  digestBytes = sha256Hex,
) {
  const catalogue = buildChartCatalogue(dashboard, aliasConfig);
  const dashboardSemanticDigest = await digestBytes(
    canonicalDashboardSemanticsBytes(dashboard),
  );
  const body = {
    ...catalogue,
    dashboard_semantic_digest: dashboardSemanticDigest,
  };
  return {
    ...body,
    digest: await digestBytes(canonicalCatalogueBytes(body)),
  };
}

export async function catalogueMatchesDashboardSnapshot(
  dashboard,
  aliasConfig,
  snapshot,
  digestBytes = sha256Hex,
) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return false;
  }
  try {
    const active = await buildChartCatalogueSnapshot(
      dashboard,
      aliasConfig,
      digestBytes,
    );
    return (
      active.catalogue_id === snapshot.catalogue_id &&
      active.dashboard_semantic_digest === snapshot.dashboard_semantic_digest &&
      active.digest === snapshot.digest
    );
  } catch {
    return false;
  }
}

function chartDescription(panel, section, page) {
  const description =
    panel.description ??
    panel.infoSource ??
    section.description ??
    page.description ??
    panel.title;
  return requiredText(description, `description for chart ${panel.id}`);
}

function normalizedTerms(value, label) {
  const terms = requiredArray(value, label)
    .map((term) => requiredText(term, label).normalize("NFC"))
    .sort(compareText);
  const unique = [];
  const seen = new Set();
  for (const term of terms) {
    const key = term.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(term);
    }
  }
  if (unique.length === 0) {
    throw new Error(`${label} must not be empty`);
  }
  return unique;
}

function requiredArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
}

function requiredText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be non-empty text`);
  }
  return value.trim().normalize("NFC");
}

function sortObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort(compareText)
        .map((key) => [key, sortObjectKeys(value[key])]),
    );
  }
  return value;
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

async function sha256Hex(bytes) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
