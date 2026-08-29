import {
  validateDashboardTimezone,
} from "../time/dashboardTemporalConfig.js";

const PAGE_TYPES = Object.freeze(["dashboard", "landing"]);
const DOMAIN_ROUTE_TONES = Object.freeze(["biomedical", "socio"]);
const DELIVERY_STATES = Object.freeze(["complete", "ready"]);
const RUNTIME_NON_SEMANTIC_FIELDS = Object.freeze(["datasetProfiles"]);

function shape(required, optional = []) {
  return Object.freeze({
    required: Object.freeze([...required]),
    optional: Object.freeze([...optional]),
  });
}

/**
 * The versioned, declarative boundary for dashboard-level configuration.
 * Chart, data-source, and chrono-group internals have their own strict contracts;
 * this contract owns their placement and every dashboard presentation field.
 */
export const DASHBOARD_CONFIG_STRUCTURE = deepFreeze({
  version: 6,
  runtimeNonSemanticFields: RUNTIME_NON_SEMANTIC_FIELDS,
  pageTypes: PAGE_TYPES,
  domainRouteTones: DOMAIN_ROUTE_TONES,
  deliveryStates: DELIVERY_STATES,
  shapes: {
    dashboard: shape(
      ["configVersion", "contentLibrary", "dataSources", "home", "id", "pages", "timezone", "title"],
      [
        "description",
        "globalStyles",
        "lastUpdated",
        "layout",
        "programLabel",
        "scenarioLabel",
        "scenes",
        "chronoGroups",
        "assets",
      ],
    ),
    home: shape(["enabled"]),
    page: shape(
      ["id", "sections"],
      ["description", "label", "landing", "pageType", "title"],
    ),
    section: shape(
      ["id", "panels"],
      ["description", "layout", "title"],
    ),
    panelWrapper: shape(["chart", "id"]),
    landing: shape(["capabilities", "hero"], [
      "deliveryStatus", "domainRoutes", "faq", "previewAsset", "proofPoints",
      "resources", "tourAnchorId", "tourItems",
    ]),
    landingHero: shape(["headline", "primaryAction"], ["deliveryLabel", "secondaryAction", "summary"]),
    landingPrimaryAction: shape(["label", "pageId"]),
    landingSecondaryAction: shape(["anchorId", "label"]),
    landingProofPoint: shape(["description", "title"]),
    landingCapability: shape(["description", "number", "title"]),
    landingDomainRoute: shape([
      "actionLabel",
      "description",
      "eyebrow",
      "pageId",
      "title",
      "tone",
    ]),
    landingDeliveryStatus: shape(["description", "label", "state"]),
    landingPreviewAsset: shape(["alt", "src"]),
    landingFaq: shape(["description", "heading", "items"]),
    landingFaqItem: shape(["answer", "question"]),
    landingResources: shape(["description", "heading", "repository"]),
    landingRepository: shape(["destination", "label"]),
    globalStyles: shape(
      ["panelColors"],
      [
        "accessibility",
        "chartColorMode",
        "dashboardColorProfile",
        "dashboardStyle",
        "iconAccent",
      ],
    ),
    accessibility: shape(["enabled"]),
    panelColors: shape([
      "chartAreaBorderColor",
      "chartAreaColor",
      "editHighlightColor",
      "multiSelectHighlightColor",
      "panelBackgroundColor",
      "panelBorderColor",
    ]),
  },
});

/**
 * Validates dashboard-level structure and returns a single placement inventory.
 * Runtime hydration may explicitly admit datasetProfiles; packaged semantic
 * configuration never does.
 */
export function validateDashboardStructure(
  config,
  {
    allowRuntimeState = false,
    requireComplete = true,
  } = {},
) {
  const dashboardShape = allowRuntimeState
    ? shapeWithOptional(
        DASHBOARD_CONFIG_STRUCTURE.shapes.dashboard,
        RUNTIME_NON_SEMANTIC_FIELDS,
      )
    : DASHBOARD_CONFIG_STRUCTURE.shapes.dashboard;
  strictShape(
    config,
    dashboardShape,
    "dashboard configuration",
    { requireComplete },
  );

  if (
    config.configVersion !== undefined
    && config.configVersion !== DASHBOARD_CONFIG_STRUCTURE.version
  ) {
    throw new Error(
      `Dashboard configuration version ${DASHBOARD_CONFIG_STRUCTURE.version} is required.`,
    );
  }
  if (requireComplete) {
    requiredText(config.id, "Dashboard id");
    requiredText(config.title, "Dashboard title");
  } else {
    optionalText(config.id, "Dashboard id");
    optionalText(config.title, "Dashboard title");
  }
  if (requireComplete || config.timezone !== undefined) {
    validateDashboardTimezone(config.timezone);
  }
  for (const [key, label] of [
    ["description", "Dashboard description"],
    ["lastUpdated", "Dashboard lastUpdated"],
    ["layout", "Dashboard layout"],
    ["programLabel", "Dashboard programLabel"],
    ["scenarioLabel", "Dashboard scenarioLabel"],
  ]) {
    optionalText(config[key], label);
  }
  if (config.dataSources !== undefined) {
    ordinaryRecord(config.dataSources, "Dashboard dataSources");
  }
  if (config.chronoGroups !== undefined) {
    denseArray(config.chronoGroups, "Dashboard chronoGroups");
  }
  if (config.scenes !== undefined) {
    denseArray(config.scenes, "Dashboard scenes");
  }
  if (config.datasetProfiles !== undefined) {
    ordinaryRecord(config.datasetProfiles, "Dashboard datasetProfiles");
  }
  if (config.assets !== undefined) {
    ordinaryRecord(config.assets, "Dashboard assets");
  }
  ordinaryRecord(config.contentLibrary, "Dashboard contentLibrary");
  if (config.globalStyles !== undefined) {
    validateGlobalStyles(config.globalStyles);
  }
  const home = strictShape(
    config.home,
    DASHBOARD_CONFIG_STRUCTURE.shapes.home,
    "dashboard home preference",
  );
  if (typeof home.enabled !== "boolean") {
    throw new TypeError("Dashboard home preference enabled must be boolean.");
  }

  if (config.pages === undefined) {
    if (requireComplete) {
      throw new Error("Dashboard pages are required.");
    }
    return {
      pages: [],
      panels: [],
      pageIds: new Set(),
    };
  }

  const rawPages = denseArray(config.pages, "Dashboard pages");
  if (rawPages.length === 0) {
    return {
      pages: [],
      panels: [],
      pageIds: new Set(),
    };
  }
  const pageIds = new Set();
  const panelIds = new Set();
  const chartIds = new Set();
  const pages = [];
  const panels = [];

  for (const rawPage of rawPages) {
    const page = strictShape(
      rawPage,
      DASHBOARD_CONFIG_STRUCTURE.shapes.page,
      "dashboard page",
    );
    const pageId = uniqueText(
      pageIds,
      page.id,
      "Dashboard page id",
    );
    if (pageId === "home") {
      throw new Error('Dashboard page id "home" is reserved for canonical Home.');
    }
    optionalText(page.label, `Dashboard page "${pageId}" label`);
    optionalText(page.title, `Dashboard page "${pageId}" title`);
    optionalText(page.description, `Dashboard page "${pageId}" description`);
    if (
      page.pageType !== undefined
      && !PAGE_TYPES.includes(page.pageType)
    ) {
      throw new Error(
        `Dashboard page "${pageId}" pageType must be "dashboard" or "landing".`,
      );
    }
    if (page.pageType === "landing" && page.landing === undefined) {
      throw new Error(
        `Dashboard landing page "${pageId}" requires landing content.`,
      );
    }
    if (page.landing !== undefined && page.pageType !== "landing") {
      throw new Error(
        `Dashboard page "${pageId}" must declare pageType "landing" when landing content is present.`,
      );
    }
    if (page.landing !== undefined) {
      validateLanding(page.landing, pageId);
    }

    const rawSections = denseArray(
      page.sections,
      `Dashboard page "${pageId}" sections`,
    );
    if (rawSections.length === 0) {
      throw new Error(
        `Dashboard page "${pageId}" sections must be a non-empty array.`,
      );
    }
    const sectionIds = new Set();
    const sections = [];

    for (const rawSection of rawSections) {
      const section = strictShape(
        rawSection,
        DASHBOARD_CONFIG_STRUCTURE.shapes.section,
        `dashboard section in page "${pageId}"`,
      );
      const sectionId = uniqueText(
        sectionIds,
        section.id,
        `Dashboard section id in page "${pageId}"`,
      );
      optionalText(
        section.title,
        `Dashboard section "${sectionId}" title`,
      );
      optionalText(
        section.description,
        `Dashboard section "${sectionId}" description`,
      );
      optionalText(
        section.layout,
        `Dashboard section "${sectionId}" layout`,
      );

      const rawPanels = denseArray(
        section.panels,
        `Dashboard section "${sectionId}" panels`,
      );
      const sectionPanels = rawPanels.map((rawPanel) => {
        const panel = ordinaryRecord(
          rawPanel,
          `Dashboard panel in section "${sectionId}"`,
        );
        const wrapped = Object.hasOwn(panel, "chart");
        let chart;
        let panelId;
        if (wrapped) {
          strictShape(
            panel,
            DASHBOARD_CONFIG_STRUCTURE.shapes.panelWrapper,
            `dashboard panel wrapper in section "${sectionId}"`,
          );
          panelId = requiredText(
            panel.id,
            `Dashboard panel id in section "${sectionId}"`,
          );
          chart = ordinaryRecord(
            panel.chart,
            `Dashboard panel "${panelId}" chart`,
          );
        } else {
          chart = panel;
          panelId = requiredText(
            chart.id,
            `Dashboard panel id in section "${sectionId}"`,
          );
        }
        ensureUnique(panelIds, panelId, "Dashboard panel id");
        const chartId = requiredText(
          chart.id,
          `Dashboard chart id in section "${sectionId}"`,
        );
        ensureUnique(chartIds, chartId, "Dashboard chart id");
        const entry = {
          chart,
          panel,
          panelId,
          page,
          pageId,
          section,
          sectionId,
          wrapped,
        };
        panels.push(entry);
        return entry;
      });

      sections.push({
        section,
        sectionId,
        panels: sectionPanels,
      });
    }
    pages.push({ page, pageId, sections });
  }

  validateLandingReferences(pages, pageIds);
  return { pages, panels, pageIds };
}

function validateLanding(value, pageId) {
  const landing = strictShape(
    value,
    DASHBOARD_CONFIG_STRUCTURE.shapes.landing,
    `landing content for page "${pageId}"`,
  );
  const hero = strictShape(
    landing.hero,
    DASHBOARD_CONFIG_STRUCTURE.shapes.landingHero,
    `landing hero for page "${pageId}"`,
  );
  requiredText(hero.headline, `Landing headline for page "${pageId}"`);
  optionalText(hero.deliveryLabel, `Landing delivery label for page "${pageId}"`);
  optionalText(hero.summary, `Landing summary for page "${pageId}"`);
  const primaryAction = strictShape(
    hero.primaryAction,
    DASHBOARD_CONFIG_STRUCTURE.shapes.landingPrimaryAction,
    `landing primary action for page "${pageId}"`,
  );
  requiredText(
    primaryAction.label,
    `Landing primary action label for page "${pageId}"`,
  );
  requiredText(
    primaryAction.pageId,
    `Landing primary action pageId for page "${pageId}"`,
  );
  if (hero.secondaryAction !== undefined) {
    const secondaryAction = strictShape(hero.secondaryAction, DASHBOARD_CONFIG_STRUCTURE.shapes.landingSecondaryAction, `landing secondary action for page "${pageId}"`);
    requiredText(secondaryAction.label, `Landing secondary action label for page "${pageId}"`);
    requiredText(secondaryAction.anchorId, `Landing secondary action anchorId for page "${pageId}"`);
  }

  if (landing.proofPoints !== undefined) validateTextRecords(landing.proofPoints, DASHBOARD_CONFIG_STRUCTURE.shapes.landingProofPoint, ["description", "title"], `Landing proof points for page "${pageId}"`);
  validateTextRecords(
    landing.capabilities,
    DASHBOARD_CONFIG_STRUCTURE.shapes.landingCapability,
    ["description", "number", "title"],
    `Landing capabilities for page "${pageId}"`,
  );
  const domainRoutes = landing.domainRoutes === undefined ? [] : denseNonEmptyArray(landing.domainRoutes, `Landing domain routes for page "${pageId}"`);
  for (const [index, rawRoute] of domainRoutes.entries()) {
    const route = strictShape(
      rawRoute,
      DASHBOARD_CONFIG_STRUCTURE.shapes.landingDomainRoute,
      `landing domain route ${index} for page "${pageId}"`,
    );
    for (const field of [
      "actionLabel",
      "description",
      "eyebrow",
      "pageId",
      "title",
    ]) {
      requiredText(
        route[field],
        `Landing domain route ${index} ${field} for page "${pageId}"`,
      );
    }
    if (!DOMAIN_ROUTE_TONES.includes(route.tone)) {
      throw new Error(
        `Landing domain route ${index} tone for page "${pageId}" is invalid.`,
      );
    }
  }
  if (landing.tourItems !== undefined || landing.tourAnchorId !== undefined) {
    requiredText(landing.tourAnchorId, `Landing tour anchor id for page "${pageId}"`);
    const tourItems = denseNonEmptyArray(landing.tourItems, `Landing tour items for page "${pageId}"`);
    tourItems.forEach((item, index) => requiredText(item, `Landing tour item ${index} for page "${pageId}"`));
  }
  const deliveryStatuses = landing.deliveryStatus === undefined ? [] : denseNonEmptyArray(landing.deliveryStatus, `Landing delivery status for page "${pageId}"`);
  for (const [index, rawStatus] of deliveryStatuses.entries()) {
    const status = strictShape(
      rawStatus,
      DASHBOARD_CONFIG_STRUCTURE.shapes.landingDeliveryStatus,
      `landing delivery status ${index} for page "${pageId}"`,
    );
    requiredText(
      status.description,
      `Landing delivery status ${index} description for page "${pageId}"`,
    );
    requiredText(
      status.label,
      `Landing delivery status ${index} label for page "${pageId}"`,
    );
    if (!DELIVERY_STATES.includes(status.state)) {
      throw new Error(
        `Landing delivery status ${index} state for page "${pageId}" is invalid.`,
      );
    }
  }
  if (landing.previewAsset !== undefined) {
    const preview = strictShape(landing.previewAsset, DASHBOARD_CONFIG_STRUCTURE.shapes.landingPreviewAsset, `landing preview asset for page "${pageId}"`);
    requiredText(preview.alt, `Landing preview asset alt for page "${pageId}"`);
    requiredText(preview.src, `Landing preview asset src for page "${pageId}"`);
  }
  if (landing.faq !== undefined) {
    const faq = strictShape(landing.faq, DASHBOARD_CONFIG_STRUCTURE.shapes.landingFaq, `landing FAQ for page "${pageId}"`);
    requiredText(faq.heading, `Landing FAQ heading for page "${pageId}"`);
    requiredText(faq.description, `Landing FAQ description for page "${pageId}"`);
    validateTextRecords(faq.items, DASHBOARD_CONFIG_STRUCTURE.shapes.landingFaqItem, ["answer", "question"], `Landing FAQ items for page "${pageId}"`);
  }
  if (landing.resources !== undefined) {
    const resources = strictShape(landing.resources, DASHBOARD_CONFIG_STRUCTURE.shapes.landingResources, `landing resources for page "${pageId}"`);
    requiredText(resources.heading, `Landing resources heading for page "${pageId}"`);
    requiredText(resources.description, `Landing resources description for page "${pageId}"`);
    const repository = strictShape(resources.repository, DASHBOARD_CONFIG_STRUCTURE.shapes.landingRepository, `landing repository for page "${pageId}"`);
    requiredText(repository.label, `Landing repository label for page "${pageId}"`);
    requiredText(repository.destination, `Landing repository destination for page "${pageId}"`);
  }
}

function validateLandingReferences(pages, pageIds) {
  for (const { page, pageId } of pages) {
    if (page.landing === undefined) continue;
    const { hero, domainRoutes = [], tourAnchorId } = page.landing;
    if (!pageIds.has(hero.primaryAction.pageId)) {
      throw new Error(
        `Landing primary action for page "${pageId}" references unknown page "${hero.primaryAction.pageId}".`,
      );
    }
    for (const route of domainRoutes) {
      if (!pageIds.has(route.pageId)) {
        throw new Error(
          `Landing domain route for page "${pageId}" references unknown page "${route.pageId}".`,
        );
      }
    }
    if (hero.secondaryAction && hero.secondaryAction.anchorId !== tourAnchorId) {
      throw new Error(
        `Landing secondary action for page "${pageId}" must reference tour anchor "${tourAnchorId}".`,
      );
    }
  }
}

function validateTextRecords(value, recordShape, fields, description) {
  const records = denseNonEmptyArray(value, description);
  for (const [index, rawRecord] of records.entries()) {
    const record = strictShape(
      rawRecord,
      recordShape,
      `${description} item ${index}`,
    );
    for (const field of fields) {
      requiredText(record[field], `${description} item ${index} ${field}`);
    }
  }
}

function validateGlobalStyles(value) {
  const styles = strictShape(
    value,
    DASHBOARD_CONFIG_STRUCTURE.shapes.globalStyles,
    "dashboard global styles",
  );
  const colors = strictShape(
    styles.panelColors,
    DASHBOARD_CONFIG_STRUCTURE.shapes.panelColors,
    "dashboard panel colors",
  );
  for (const key of DASHBOARD_CONFIG_STRUCTURE.shapes.panelColors.required) {
    requiredText(colors[key], `Dashboard panel color "${key}"`);
  }
  if (styles.accessibility !== undefined) {
    const accessibility = strictShape(
      styles.accessibility,
      DASHBOARD_CONFIG_STRUCTURE.shapes.accessibility,
      "dashboard accessibility settings",
    );
    if (typeof accessibility.enabled !== "boolean") {
      throw new TypeError("Dashboard accessibility enabled must be boolean.");
    }
  }
  if (
    styles.iconAccent !== undefined
    && !/^#[0-9a-f]{6}$/i.test(styles.iconAccent)
  ) {
    throw new TypeError("Dashboard icon accent must use #RRGGBB.");
  }
  allowedValue(
    styles.dashboardStyle,
    ["evidence-ledger", "humanist-standard", "signal-instrument"],
    "Dashboard style",
  );
  allowedValue(
    styles.dashboardColorProfile,
    [
      "evidence-ledger/brighter-vellum",
      "evidence-ledger/ash-register",
      "evidence-ledger/cool-archive",
      "humanist-standard/common-ground",
      "humanist-standard/open-forum",
      "signal-instrument/calibrated-steel",
      "signal-instrument/quiet-telemetry",
      "signal-instrument/amber-vector",
      "utility/prismatic-index",
      "utility/luminance-ladder",
      "graphpad/sunrise-reference",
      "graphpad/lakeside-reference",
      "utility/monochrome-reserve",
    ],
    "Dashboard color profile",
  );
  allowedValue(
    styles.chartColorMode,
    ["profile", "standard"],
    "Dashboard chart color mode",
  );
}

function allowedValue(value, options, description) {
  if (value !== undefined && !options.includes(value)) {
    throw new TypeError(
      `${description} must be one of: ${options.join(", ")}.`,
    );
  }
}

function strictShape(
  value,
  definition,
  description,
  { requireComplete = true } = {},
) {
  const record = ordinaryRecord(value, description);
  const allowed = new Set([
    ...definition.required,
    ...definition.optional,
  ]);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new Error(`Unknown ${description} property "${key}".`);
    }
  }
  if (requireComplete) {
    for (const key of definition.required) {
      if (!Object.hasOwn(record, key)) {
        throw new Error(`${description} property "${key}" is required.`);
      }
    }
  }
  return record;
}

function shapeWithOptional(definition, extraOptional) {
  return shape(
    definition.required,
    [...definition.optional, ...extraOptional],
  );
}

function ordinaryRecord(value, description) {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Object.getOwnPropertySymbols(value).length > 0
  ) {
    throw new TypeError(`${description} must be an ordinary data object.`);
  }
  for (const [key, descriptor] of Object.entries(
    Object.getOwnPropertyDescriptors(value),
  )) {
    if (!Object.hasOwn(descriptor, "value") || !descriptor.enumerable) {
      throw new TypeError(
        `${description} property "${key}" must be an enumerable data property.`,
      );
    }
  }
  return value;
}

function denseArray(value, description) {
  if (
    !Array.isArray(value)
    || Object.getPrototypeOf(value) !== Array.prototype
    || Object.getOwnPropertySymbols(value).length > 0
  ) {
    throw new TypeError(`${description} must be an ordinary array.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[index];
    if (
      !descriptor
      || !Object.hasOwn(descriptor, "value")
      || !descriptor.enumerable
    ) {
      throw new TypeError(`${description} must be a dense data array.`);
    }
  }
  const named = Object.keys(descriptors).filter((key) => (
    key !== "length" && !/^(?:0|[1-9]\d*)$/.test(key)
  ));
  if (named.length > 0) {
    throw new TypeError(`${description} cannot contain named properties.`);
  }
  return value;
}

function denseNonEmptyArray(value, description) {
  const array = denseArray(value, description);
  if (array.length === 0) {
    throw new Error(`${description} must be non-empty.`);
  }
  return array;
}

function requiredText(value, description) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${description} must be non-empty text.`);
  }
  return value;
}

function optionalText(value, description) {
  if (value !== undefined) requiredText(value, description);
}

function uniqueText(ids, value, description) {
  const id = requiredText(value, description);
  ensureUnique(ids, id, description);
  return id;
}

function ensureUnique(ids, id, description) {
  if (ids.has(id)) {
    throw new Error(`Duplicate ${description.toLowerCase()} "${id}".`);
  }
  ids.add(id);
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const entry of Object.values(value)) deepFreeze(entry);
  }
  return value;
}
