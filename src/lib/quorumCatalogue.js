import {
  COLLECTION_GRID_LIMITS,
  COLLECTION_LAYOUT_MODES,
  COLLECTION_PRIORITY_METHODS,
  COLLECTION_RANKING_MODES,
} from "../charting/collection/collectionModel.js";
import {
  DASHBOARD_CONFIG_STRUCTURE,
  validateDashboardStructure,
} from "../charting/config/dashboardConfigStructure.js";
import { migrateDashboardV3ToV4 } from "../charting/config/migrateDashboardV3ToV4.js";
import { migrateDashboardV4ToV5 } from "../content-library/migrateDashboardV4ToV5.js";
import { migrateDashboardV5ToV6 } from "../charting/config/migrateDashboardV5ToV6.js";
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
} from "../charting/time/chronoGroupModel.js";
import {
  validateDataSourceDescriptor,
} from "./loadDashboard.js";
import { validateStaticSource } from "../static-content/staticSourceSchema.js";

const CONTRACT_VERSION = "2";
const CATALOGUE_ID = "simex-dashboard";
const DISPLAY_MODES = Object.freeze(["fullscreen", "multi_fullscreen"]);
const PLAYBACK_DISPLAY_MODE = "playback";
const CHRONO_GROUP_KEYS = new Set([
  "id",
  "name",
  "period",
  "matching",
  "secondsPerFrame",
  "members",
]);
const TIME_PERIOD_KEYS = new Set(["start", "end"]);
const TIME_MEMBER_KEYS = new Set(["chartId", "timeRole", "matching"]);
const ALIAS_KEYS = new Set(["aliases", "keywords"]);
const CANONICAL_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

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
    const chronoGroupId = context.membershipByChartId.get(entry.chart.id) ?? null;
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
      chrono_group_id: chronoGroupId,
      collection_capability: entry.schema.capabilities.collection,
      supported_display_modes: chronoGroupId === null
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
    dashboard: cloneJson(context.dashboard),
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
    authoring_workflow: schema.authoringWorkflow,
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
      source_csv: schema.capabilities.sourceCsv,
      time_context: schema.capabilities.timeContext,
      surfaces: [...schema.capabilities.surfaces],
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
  const input = requiredRecord(dashboard, "dashboard");
  const v4 = input.configVersion === 3 ? migrateDashboardV3ToV4(input) : input;
  const v5 = v4.configVersion === 4 ? migrateDashboardV4ToV5(v4) : v4;
  const root = migrateDashboardV5ToV6(v5);
  const structure = validateDashboardStructure(root);
  if (root.configVersion !== DASHBOARD_CONFIG_STRUCTURE.version) {
    throw new Error(`dashboard configuration version ${DASHBOARD_CONFIG_STRUCTURE.version} is required`);
  }
  const catalogueRevision = requiredText(
    root.lastUpdated,
    "catalogue revision",
  );
  const dataSources = requiredRecord(root.dataSources, "dashboard dataSources");
  for (const sourceId of Object.keys(dataSources)) {
    const source = dataSources[sourceId];
    if (source?.kind === "staticText" || source?.kind === "staticImage") {
      validateStaticSource(source, { assets: root.assets });
    } else {
      validateDataSourceDescriptor(sourceId, source);
    }
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
    } of validateDashboardChartReferences(structure, dataSources, { assets: root.assets })
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
  const chronoGroups = root.chronoGroups === undefined
    ? []
    : requiredArray(root.chronoGroups, "dashboard chronoGroups");
  const membershipByChartId = validateTimeMembership(
    chronoGroups,
    chartsById,
  );

  return {
    dashboard: root,
    catalogueRevision,
    dataSources,
    chronoGroups,
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

function validateTimeMembership(groups, chartsById) {
  const groupIds = new Set();
  const membershipByChartId = new Map();

  for (const rawGroup of groups) {
    const group = requiredRecord(rawGroup, "Chrono Group");
    rejectUnknownKeys(group, CHRONO_GROUP_KEYS, "Chrono Group");
    const groupId = requiredText(group.id, "Chrono Group ID");
    if (groupIds.has(groupId)) {
      throw new Error(`duplicate Chrono Group ID: ${groupId}`);
    }
    groupIds.add(groupId);
    requiredText(group.name, `name for Chrono Group ${groupId}`);
    validateTimePeriod(group.period, groupId);
    if (!Number.isFinite(group.secondsPerFrame) || group.secondsPerFrame <= 0) {
      throw new Error(
        `Chrono Group ${groupId} secondsPerFrame must be positive and finite`,
      );
    }
    validateEffectiveTimeSyncMatching(
      group.matching,
      `Chrono Group ${groupId}`,
    );

    const memberIds = new Set();
    for (const rawMember of requiredArray(
      group.members,
      `members for Chrono Group ${groupId}`,
    )) {
      const member = requiredRecord(
        rawMember,
        `member for Chrono Group ${groupId}`,
      );
      rejectUnknownKeys(
        member,
        TIME_MEMBER_KEYS,
        `member for Chrono Group ${groupId}`,
      );
      const chartId = requiredText(
        member.chartId,
        `member chart ID for Chrono Group ${groupId}`,
      );
      const timeRole = requiredText(
        member.timeRole,
        `member time role for chart ${chartId}`,
      );
      if (memberIds.has(chartId)) {
        throw new Error(
          `duplicate member chart ${chartId} in Chrono Group ${groupId}`,
        );
      }
      if (membershipByChartId.has(chartId)) {
        throw new Error(
          `Quorum catalogue v2 cannot represent multiple Chrono Group memberships for chart ${chartId}`,
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
    }
  }

  return membershipByChartId;
}

function validateTimePeriod(value, groupId) {
  const period = requiredRecord(
    value,
    `period for Chrono Group ${groupId}`,
  );
  rejectUnknownKeys(
    period,
    TIME_PERIOD_KEYS,
    `period for Chrono Group ${groupId}`,
  );
  const start = requiredText(
    period.start,
    `period start for Chrono Group ${groupId}`,
  );
  const end = requiredText(
    period.end,
    `period end for Chrono Group ${groupId}`,
  );
  if (!CANONICAL_DATE_ONLY.test(start) || !CANONICAL_DATE_ONLY.test(end)) {
    throw new Error(
      `Chrono Group ${groupId} period must use canonical YYYY-MM-DD dates`,
    );
  }
  if (end < start) {
    throw new Error(
      `Chrono Group ${groupId} period end must be on or after start`,
    );
  }
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
