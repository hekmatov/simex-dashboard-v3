import {
  COLLECTION_GRID_LIMITS,
  COLLECTION_LAYOUT_MODES,
  COLLECTION_PRIORITY_METHODS,
  COLLECTION_RANKING_MODES,
} from "../charting/collection/collectionModel.js";
import {
  CHART_CONFIG_VERSION,
} from "../charting/config/chartConfigV3.js";
import {
  validateDashboardStructure,
} from "../charting/config/dashboardConfigStructure.js";
import {
  validateDashboardChartReferences,
} from "../charting/config/dashboardSemanticReferences.js";
import {
  GEOGRAPHY_BINDING_CONTRACT,
} from "../charting/data/geographyBindingContract.js";
import {
  CHART_CONVERSION_CONTRACT,
} from "../charting/forms/conversionContract.js";
import {
  CHART_SCHEMA_VERSION,
  listChartSchemas,
} from "../charting/schemas/chartSchemaRegistry.js";
import {
  getChartFormSectionDefinition,
} from "../charting/schemas/schemaTypes.js";
import {
  isTimeSyncInterpolationEligible,
  TIME_SYNC_MATCHING_POLICIES,
  validateEffectiveTimeSyncMatching,
} from "../charting/time/timeSyncModel.js";
import { validateDataSourceDescriptor } from "./loadDashboard.js";

const CONTRACT_VERSION = "2";
const CATALOGUE_ID = "simex-dashboard";
const DISPLAY_MODES = Object.freeze(["fullscreen", "multi_fullscreen"]);
const PLAYBACK_DISPLAY_MODE = "playback";
const TIME_GROUP_KEYS = new Set([
  "id",
  "name",
  "primaryClock",
  "matching",
  "members",
]);
const PRIMARY_CLOCK_KEYS = new Set(["sourceId", "timeField"]);
const TIME_MEMBER_KEYS = new Set(["chartId", "timeRole", "matching"]);
const ALIAS_KEYS = new Set(["aliases", "keywords"]);

export function buildChartCatalogue(dashboard, aliasConfig) {
  const context = buildDashboardContext(dashboard);
  const aliases = validateAliasConfig(context, aliasConfig);
  const chartTypes = semanticChartTypes(listChartSchemas());
  const charts = context.charts.map((entry) => {
    const metadata = requiredRecord(
      aliases[entry.chart.id],
      `alias metadata for chart ${entry.chart.id}`,
    );
    rejectUnknownKeys(
      metadata,
      ALIAS_KEYS,
      `alias metadata for chart ${entry.chart.id}`,
    );
    const timeSyncGroupId = context.membershipByChartId.get(entry.chart.id) ?? null;
    return {
      chart_id: entry.chart.id,
      type_id: entry.chart.typeId,
      title: requiredText(entry.chart.title, `title for chart ${entry.chart.id}`),
      description: chartDescription(entry),
      page_id: entry.pageId,
      section_id: entry.sectionId,
      aliases: normalizedTerms(
        metadata.aliases,
        `aliases for chart ${entry.chart.id}`,
      ),
      keywords: normalizedTerms(
        metadata.keywords,
        `keywords for chart ${entry.chart.id}`,
      ),
      role_ids: Object.keys(entry.chart.roles).sort(compareText),
      time_sync_group_id: timeSyncGroupId,
      collection_capability: entry.schema.capabilities.collection,
      supported_display_modes: timeSyncGroupId === null
        ? [...DISPLAY_MODES]
        : [...DISPLAY_MODES, PLAYBACK_DISPLAY_MODE],
    };
  });

  const chartIds = new Set(context.charts.map(({ chart }) => chart.id));
  const orphanIds = Object.keys(aliases)
    .filter((chartId) => !chartIds.has(chartId))
    .sort(compareText);
  if (orphanIds.length > 0) {
    throw new Error(`orphan alias record: ${orphanIds.join(", ")}`);
  }

  charts.sort((left, right) => compareText(left.chart_id, right.chart_id));
  return {
    contract_version: CONTRACT_VERSION,
    catalogue_id: CATALOGUE_ID,
    catalogue_revision: context.catalogueRevision,
    chart_schema_version: CHART_SCHEMA_VERSION,
    chart_types: chartTypes,
    charts,
  };
}

export function canonicalCatalogueBytes(catalogue) {
  return canonicalBytes(catalogue);
}

export function canonicalDashboardSemanticsBytes(dashboard, aliasConfig) {
  const context = buildDashboardContext(dashboard);
  const semantics = {
    dashboard: cloneJson(dashboard),
  };
  if (aliasConfig !== undefined) {
    validateAliasConfig(context, aliasConfig);
    semantics.aliases = cloneJson(aliasConfig);
  }
  return canonicalBytes(semantics);
}

export async function buildChartCatalogueSnapshot(
  dashboard,
  aliasConfig,
  digestBytes = sha256Hex,
) {
  const catalogue = buildChartCatalogue(dashboard, aliasConfig);
  const dashboardSemanticDigest = await digestBytes(
    canonicalDashboardSemanticsBytes(dashboard, aliasConfig),
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
  try {
    if (!isRecord(snapshot)) return false;
    const active = await buildChartCatalogueSnapshot(
      dashboard,
      aliasConfig,
      digestBytes,
    );
    return bytesEqual(
      canonicalCatalogueBytes(active),
      canonicalCatalogueBytes(snapshot),
    );
  } catch {
    return false;
  }
}

function semanticChartTypes(schemas) {
  const knownTypeIds = new Set();
  const descriptors = schemas.map((schema) => {
    const typeId = requiredText(schema.typeId, "chart schema typeId");
    if (knownTypeIds.has(typeId)) {
      throw new Error(`duplicate chart type: ${typeId}`);
    }
    knownTypeIds.add(typeId);
    return semanticChartType(schema);
  });

  for (const schema of schemas) {
    for (const conversionTypeId of schema.conversions) {
      if (!knownTypeIds.has(conversionTypeId)) {
        throw new Error(
          `chart type ${schema.typeId} references unknown conversion ${conversionTypeId}`,
        );
      }
    }
  }

  return descriptors.sort((left, right) => (
    compareText(left.type_id, right.type_id)
  ));
}

function semanticChartType(schema) {
  const roleIds = new Set();
  const roles = schema.roles.map((role) => {
    const roleId = requiredText(
      role.id,
      `role ID for chart type ${schema.typeId}`,
    );
    if (roleIds.has(roleId)) {
      throw new Error(`duplicate role ${roleId} for chart type ${schema.typeId}`);
    }
    roleIds.add(roleId);
    return {
      role_id: roleId,
      label: requiredText(
        role.label,
        `role label ${roleId} for chart type ${schema.typeId}`,
      ),
      required: role.min > 0,
      cardinality: {
        min: role.min,
        max: role.max,
      },
      accepted_semantic_types: [...role.accepts],
    };
  });
  const timeRoleIds = schema.roles
    .filter((role) => role.accepts.includes("temporal"))
    .map((role) => role.id);
  const interpolationEligible = isTimeSyncInterpolationEligible(schema);
  const collection = schema.capabilities.collection
    ? {
        layout_modes: [...COLLECTION_LAYOUT_MODES],
        ranking_modes: [...COLLECTION_RANKING_MODES],
        priority_methods: [...COLLECTION_PRIORITY_METHODS],
        grid: {
          min_rows: COLLECTION_GRID_LIMITS.min,
          max_rows: COLLECTION_GRID_LIMITS.max,
          min_columns: COLLECTION_GRID_LIMITS.min,
          max_columns: COLLECTION_GRID_LIMITS.max,
        },
      }
    : null;
  const geographyRole = schema.roles.find((role) => (
    role.accepts.includes("geographic")
  ));

  if (schema.capabilities.timeSync && timeRoleIds.length === 0) {
    throw new Error(
      `time-synchronized chart type ${schema.typeId} has no temporal role`,
    );
  }
  if (schema.dataFamily === "geography" && !geographyRole) {
    throw new Error(`geography chart type ${schema.typeId} has no geography role`);
  }
  if (
    schema.dataFamily === "geography"
    && geographyRole.id
      !== GEOGRAPHY_BINDING_CONTRACT.geography_role_id
  ) {
    throw new Error(
      `geography chart type ${schema.typeId} role must match the geography binding contract`,
    );
  }

  return {
    type_id: schema.typeId,
    label: schema.label,
    description: schema.description,
    group_id: schema.group,
    purpose: schema.semantics.purpose,
    mark: schema.semantics.mark,
    data_family: schema.dataFamily,
    renderer: schema.renderer,
    role_ids: schema.roles.map(({ id }) => id),
    roles,
    data_constraints: {
      source_kinds: [...schema.sources].sort(compareText),
      transforms: [...schema.transforms],
      manual_data: cloneJson(schema.manualData),
    },
    conversion: {
      compatible_type_ids: [...schema.conversions].sort(compareText),
      rules: cloneJson(CHART_CONVERSION_CONTRACT),
    },
    capabilities: {
      collection: schema.capabilities.collection,
      time_sync: schema.capabilities.timeSync,
      zoom: schema.capabilities.zoom,
    },
    temporal: schema.capabilities.timeSync
      ? {
          time_role_ids: timeRoleIds,
          matching_policies: TIME_SYNC_MATCHING_POLICIES.filter(
            (policy) => policy !== "interpolate" || interpolationEligible,
          ),
          interpolation_eligible: interpolationEligible,
          interpolation_requires_explicit_permission: interpolationEligible,
        }
      : null,
    collection,
    geography: schema.dataFamily === "geography"
      ? cloneJson(GEOGRAPHY_BINDING_CONTRACT)
      : null,
    presentation_section_ids: schema.form.sections.filter(
      (sectionId) => (
        getChartFormSectionDefinition(sectionId)
          ?.cataloguePresentation === true
      ),
    ),
  };
}

function buildDashboardContext(dashboard) {
  const root = requiredRecord(dashboard, "dashboard");
  const structure = validateDashboardStructure(root);
  if (root.configVersion !== CHART_CONFIG_VERSION) {
    throw new Error(`dashboard configuration version ${CHART_CONFIG_VERSION} is required`);
  }
  const catalogueRevision = requiredText(
    root.lastUpdated,
    "catalogue revision",
  );
  const dataSources = requiredRecord(root.dataSources, "dashboard dataSources");
  for (const sourceId of Object.keys(dataSources)) {
    validateDataSourceDescriptor(sourceId, dataSources[sourceId]);
  }

  const charts = [];
  const entriesByPlacement = new Map();
  for (
    const {
      chart,
      page,
      pageId,
      placement,
      schema,
      section,
      sectionId,
    } of validateDashboardChartReferences(structure, dataSources)
  ) {
    const entry = {
      chart,
      schema,
      page,
      section,
      pageId,
      sectionId,
    };
    charts.push(entry);
    entriesByPlacement.set(placement, entry);
  }
  const pages = structure.pages.map((pageEntry) => ({
    pageId: pageEntry.pageId,
    sections: pageEntry.sections.map((sectionEntry) => ({
      sectionId: sectionEntry.sectionId,
      charts: sectionEntry.panels.map((placement) => (
        entriesByPlacement.get(placement)
      )),
    })),
  }));
  const chartsById = new Map(charts.map((entry) => [entry.chart.id, entry]));
  const timeSyncGroups = root.timeSyncGroups === undefined
    ? []
    : requiredArray(root.timeSyncGroups, "dashboard timeSyncGroups");
  const membershipByChartId = validateTimeMembership(
    timeSyncGroups,
    chartsById,
    dataSources,
  );

  return {
    catalogueRevision,
    dataSources,
    timeSyncGroups,
    pages,
    charts,
    membershipByChartId,
  };
}

function validateAliasConfig(context, aliasConfig) {
  const aliases = requiredRecord(aliasConfig, "chart aliases");
  const chartIds = new Set(context.charts.map(({ chart }) => chart.id));
  for (const chartId of chartIds) {
    const metadata = requiredRecord(
      aliases[chartId],
      `alias metadata for chart ${chartId}`,
    );
    rejectUnknownKeys(
      metadata,
      ALIAS_KEYS,
      `alias metadata for chart ${chartId}`,
    );
    normalizedTerms(metadata.aliases, `aliases for chart ${chartId}`);
    normalizedTerms(metadata.keywords, `keywords for chart ${chartId}`);
  }
  const orphanIds = Object.keys(aliases)
    .filter((chartId) => !chartIds.has(chartId))
    .sort(compareText);
  if (orphanIds.length > 0) {
    throw new Error(`orphan alias record: ${orphanIds.join(", ")}`);
  }
  return aliases;
}

function validateTimeMembership(groups, chartsById, dataSources) {
  const groupIds = new Set();
  const membershipByChartId = new Map();

  for (const rawGroup of groups) {
    const group = requiredRecord(rawGroup, "time synchronization group");
    rejectUnknownKeys(group, TIME_GROUP_KEYS, "time synchronization group");
    const groupId = requiredText(group.id, "time synchronization group ID");
    if (groupIds.has(groupId)) {
      throw new Error(`duplicate time synchronization group ID: ${groupId}`);
    }
    groupIds.add(groupId);
    requiredText(group.name, `name for time synchronization group ${groupId}`);
    const primaryClock = requiredRecord(
      group.primaryClock,
      `primary clock for time synchronization group ${groupId}`,
    );
    rejectUnknownKeys(
      primaryClock,
      PRIMARY_CLOCK_KEYS,
      `primary clock for time synchronization group ${groupId}`,
    );
    const primarySourceId = requiredText(
      primaryClock.sourceId,
      `primary clock source for time synchronization group ${groupId}`,
    );
    requiredText(
      primaryClock.timeField,
      `primary clock field for time synchronization group ${groupId}`,
    );
    if (!Object.hasOwn(dataSources, primarySourceId)) {
      throw new Error(
        `time synchronization group ${groupId} references unknown primary source ${primarySourceId}`,
      );
    }
    validateEffectiveTimeSyncMatching(
      group.matching,
      `time synchronization group ${groupId}`,
    );

    const memberIds = new Set();
    for (const rawMember of requiredArray(
      group.members,
      `members for time synchronization group ${groupId}`,
    )) {
      const member = requiredRecord(
        rawMember,
        `member for time synchronization group ${groupId}`,
      );
      rejectUnknownKeys(
        member,
        TIME_MEMBER_KEYS,
        `member for time synchronization group ${groupId}`,
      );
      const chartId = requiredText(
        member.chartId,
        `member chart ID for time synchronization group ${groupId}`,
      );
      const timeRole = requiredText(
        member.timeRole,
        `member time role for chart ${chartId}`,
      );
      if (memberIds.has(chartId)) {
        throw new Error(
          `duplicate member chart ${chartId} in time synchronization group ${groupId}`,
        );
      }
      if (membershipByChartId.has(chartId)) {
        throw new Error(
          `chart ${chartId} belongs to more than one time synchronization group`,
        );
      }
      memberIds.add(chartId);
      membershipByChartId.set(chartId, groupId);

      const chartEntry = chartsById.get(chartId);
      if (!chartEntry) {
        throw new Error(
          `time synchronization member chart ${chartId} does not exist`,
        );
      }
      if (!chartEntry.schema.capabilities.timeSync) {
        throw new Error(`chart ${chartId} does not support time synchronization`);
      }
      const role = chartEntry.schema.roles.find(({ id }) => id === timeRole);
      if (!role || !role.accepts.includes("temporal")) {
        throw new Error(
          `chart ${chartId} time role ${timeRole} is not a temporal role`,
        );
      }
      if (!Object.hasOwn(chartEntry.chart.roles, timeRole)) {
        throw new Error(
          `chart ${chartId} has no configured binding for time role ${timeRole}`,
        );
      }
      if (member.matching !== undefined) {
        validateEffectiveTimeSyncMatching(
          member.matching,
          `time synchronization member ${chartId}`,
        );
      }
      if (chartEntry.chart.interaction.timeSync?.groupId !== groupId) {
        throw new Error(
          `chart ${chartId} time synchronization membership does not match ${groupId}`,
        );
      }
    }
  }

  for (const { chart } of chartsById.values()) {
    const configuredGroupId = chart.interaction.timeSync?.groupId ?? null;
    const memberGroupId = membershipByChartId.get(chart.id) ?? null;
    if (configuredGroupId !== memberGroupId) {
      throw new Error(
        `chart ${chart.id} time synchronization membership is inconsistent`,
      );
    }
  }
  return membershipByChartId;
}

function chartDescription({ chart, section, page }) {
  const description =
    chart.description
    || section.description
    || page.description
    || chart.title;
  return requiredText(description, `description for chart ${chart.id}`);
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

function requiredRecord(value, label) {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`);
  }
  assertEnumerableDataProperties(value, label);
  return value;
}

function isRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function rejectUnknownKeys(value, allowed, label) {
  const keys = Object.keys(value);
  for (const key of keys) {
    if (!allowed.has(key)) {
      throw new Error(`unknown ${label} property: ${key}`);
    }
  }
}

function requiredArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  if (
    Object.getPrototypeOf(value) !== Array.prototype
    || Object.getOwnPropertySymbols(value).length > 0
  ) {
    throw new Error(`${label} must be an ordinary array`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[index];
    if (
      !descriptor
      || !Object.hasOwn(descriptor, "value")
      || !descriptor.enumerable
    ) {
      throw new Error(`${label} must be a dense data array`);
    }
  }
  const namedKeys = Object.keys(descriptors).filter((key) => (
    key !== "length" && !/^(?:0|[1-9]\d*)$/.test(key)
  ));
  if (namedKeys.length > 0) {
    throw new Error(`${label} cannot contain named properties`);
  }
  return value;
}

function requiredText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be non-empty text`);
  }
  return value.trim().normalize("NFC");
}

function cloneJson(value) {
  return value === undefined ? null : structuredClone(value);
}

function canonicalBytes(value) {
  return new TextEncoder().encode(
    JSON.stringify(canonicalJsonValue(value, "canonical value")),
  );
}

function canonicalJsonValue(value, label) {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${label} must contain only finite numbers`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return requiredArray(value, label).map((entry, index) => (
      canonicalJsonValue(entry, `${label}[${index}]`)
    ));
  }
  if (isRecord(value)) {
    assertEnumerableDataProperties(value, label);
    return Object.fromEntries(
      Object.keys(value)
        .sort(compareText)
        .map((key) => [
          key,
          canonicalJsonValue(value[key], `${label}.${key}`),
        ]),
    );
  }
  throw new Error(`${label} must contain only JSON data`);
}

function assertEnumerableDataProperties(value, label) {
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new Error(`${label} cannot contain symbol properties`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!Object.hasOwn(descriptor, "value") || !descriptor.enumerable) {
      throw new Error(
        `${label} property ${key} must be an enumerable data property`,
      );
    }
  }
}

function bytesEqual(left, right) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
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
