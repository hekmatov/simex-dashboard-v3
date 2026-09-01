import {
  createChartDraft,
  normalizeChartInstance,
  validateChartInstance,
} from "../config/chartConfigV3.js";
import {
  SERIES_STYLE_PROPERTIES,
  seriesStylePropertySupported,
} from "../presentation/seriesStyleContract.js";
import { cardPresentationCompatible } from "../presentation/cardPresentationContract.js";
import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import {
  chartConversionKind,
  preservedTargetRoleAssignments,
  targetRoleAssignmentAccepted,
  targetRoleAssignmentCount,
} from "./conversionContract.js";

const TRANSFORMATION_SETTINGS = Object.freeze([
  Object.freeze({ capability: "filter", key: "filters", fallback: [] }),
  Object.freeze({ capability: "group", key: "grouping", fallback: null }),
  Object.freeze({ capability: "aggregate", key: "aggregation", fallback: null }),
  Object.freeze({ capability: "duplicates", key: "duplicates", fallback: null }),
  Object.freeze({ capability: "missing", key: "missingValues", fallback: "gap" }),
]);

const PRESENTATION_SECTIONS = Object.freeze({
  labels: "labels",
  axes: "axes",
  targets: "targets",
  map: "map",
  timeline: "timeline",
  collection: "collection",
  background: "appearance",
  legend: "appearance",
  accessibility: "advanced",
  advanced: "advanced",
  card: "appearance",
});

const DANGEROUS_PROPERTY_KEYS = new Set([
  "__proto__",
  "prototype",
  "constructor",
]);

/**
 * Describe which target roles can be retained and which settings will be
 * removed before any conversion is applied.
 */
export function planChartConversion(
  chart,
  targetTypeId,
  roleAssignments = undefined,
) {
  const snapshot = clonePlainData(chart, "Chart");
  if (!isRecord(snapshot)) {
    throw new TypeError("Chart must be a plain object.");
  }
  const sourceTypeId = requiredString(snapshot.typeId, "Chart typeId");
  const targetId = requiredString(targetTypeId, "Target chart type");
  const source = getChartSchema(sourceTypeId);
  const target = getChartSchema(targetId);
  const roles = preservedRoles(snapshot.roles, target);
  const effectiveRoles = roleAssignments === undefined
    ? roles
    : mergeTargetRoles(
        roles,
        cloneRoleAssignments(roleAssignments),
        target,
      );
  if (effectiveRoles === null) {
    throw new Error("Role assignments include a role not declared by the target chart.");
  }

  return {
    kind: chartConversionKind(source, target),
    sourceTypeId,
    targetTypeId: targetId,
    preservedRoles: clonePlainData(roles, "Preserved roles"),
    requiredRoles: target.roles
      .filter((role) => (
        role.min > targetRoleAssignmentCount(
          effectiveRoles[role.id],
          role,
        )
        || !targetRoleAssignmentAccepted(effectiveRoles[role.id], role)
      ))
      .map((role) => clonePlainData(role, `Target role "${role.id}"`)),
    removedSettings: removedSettings(
      snapshot,
      target,
      roles,
      effectiveRoles,
    ),
  };
}

/**
 * Apply a planned conversion atomically. A null role-assignment sentinel
 * means the author canceled; cancellation or invalid target configuration
 * returns the exact original chart reference.
 */
export function applyChartConversion(chart, targetTypeId, roleAssignments = {}) {
  if (roleAssignments === null) return chart;
  const assignmentSnapshot = cloneRoleAssignments(roleAssignments);

  const snapshot = clonePlainData(chart, "Chart");
  if (!isRecord(snapshot)) {
    throw new TypeError("Chart must be a plain object.");
  }
  const sourceTypeId = requiredString(snapshot.typeId, "Chart typeId");
  const targetId = requiredString(targetTypeId, "Target chart type");
  getChartSchema(sourceTypeId);
  const target = getChartSchema(targetId);
  const roles = mergeTargetRoles(
    preservedRoles(snapshot.roles, target),
    assignmentSnapshot,
    target,
  );
  if (roles === null || !requiredRolesComplete(roles, target)) return chart;

  try {
    const candidate = createChartDraft(targetId, {
      id: snapshot.id,
      title: snapshot.title,
      description: snapshot.description,
      sourceId: snapshot.sourceId,
      roles,
      transformations: targetTransformations(snapshot.transformations, target),
      presentation: targetPresentation(snapshot.presentation, target),
      interaction: targetInteraction(snapshot.interaction, target, roles),
      layout: snapshot.layout,
    });
    validateChartInstance(candidate);
    return normalizeChartInstance(candidate);
  } catch {
    return chart;
  }
}

function cloneRoleAssignments(roleAssignments) {
  const snapshot = clonePlainData(roleAssignments, "Role assignments");
  if (!isRecord(snapshot)) {
    throw new TypeError("Role assignments must be a plain object.");
  }
  return snapshot;
}

function preservedRoles(sourceRoles, target) {
  return preservedTargetRoleAssignments(sourceRoles, target, {
    cloneAssignment: (assignment, role) => clonePlainData(
      assignment,
      `Role "${role.id}" assignment`,
    ),
  });
}

function mergeTargetRoles(retained, supplied, target) {
  if (supplied === undefined) return retained;
  if (!isRecord(supplied)) return null;
  const targetRoleIds = new Set(target.roles.map(({ id }) => id));
  if (Object.keys(supplied).some((id) => !targetRoleIds.has(id))) return null;
  const merged = { ...retained };
  for (const [roleId, assignment] of Object.entries(supplied)) {
    if (assignment === null || assignment === undefined) {
      delete merged[roleId];
    } else {
      merged[roleId] = clonePlainData(
        assignment,
        `Role "${roleId}" assignment`,
      );
    }
  }
  return merged;
}

function requiredRolesComplete(roles, target) {
  return target.roles.every((role) => (
    targetRoleAssignmentCount(roles[role.id], role) >= role.min
    && targetRoleAssignmentAccepted(roles[role.id], role)
  ));
}

function removedSettings(chart, target, preserved, effectiveRoles = preserved) {
  const removed = [];
  const targetRoleIds = new Set(target.roles.map(({ id }) => id));
  for (const roleId of Object.keys(isRecord(chart.roles) ? chart.roles : {})) {
    if (!targetRoleIds.has(roleId) || !Object.hasOwn(preserved, roleId)) {
      removed.push(setting(`roles.${roleId}`, "Role is not valid for the target chart."));
    }
  }

  const transformations = isRecord(chart.transformations)
    ? chart.transformations
    : {};
  for (const descriptor of TRANSFORMATION_SETTINGS) {
    const value = transformations[descriptor.key];
    if (
      !target.transforms.includes(descriptor.capability)
      && meaningful(value, descriptor.fallback)
    ) {
      removed.push(setting(
        `transformations.${descriptor.key}`,
        "Transformation is not supported by the target chart.",
      ));
    }
  }
  if (
    Object.hasOwn(transformations, "comparison")
    && !comparisonCompatible(transformations.comparison, target)
  ) {
    removed.push(setting(
      "transformations.comparison",
      "Comparison settings are not supported by the target chart.",
    ));
  }

  const presentation = isRecord(chart.presentation) ? chart.presentation : {};
  for (const [key, section] of Object.entries(PRESENTATION_SECTIONS)) {
    if (
      Object.hasOwn(presentation, key)
      && meaningful(presentation[key], key === "collection" ? null : undefined)
      && !presentationAllowed(target, key, section, presentation[key])
    ) {
      removed.push(setting(
        `presentation.${key}`,
        "Presentation setting is not used by the target chart.",
      ));
    }
  }
  removed.push(...removedSeriesSettings(presentation.series, target));

  const interaction = isRecord(chart.interaction) ? chart.interaction : {};
  if (
    interaction.zoom?.enabled === true
    && !target.capabilities.zoom
  ) {
    removed.push(setting(
      "interaction.zoom",
      "Zoom is not supported by the target chart.",
    ));
  }
  if (
    interaction.timeSync !== null
    && interaction.timeSync !== undefined
    && (
      !target.capabilities.timeSync
      || !hasTemporalAssignment(target, effectiveRoles)
    )
  ) {
    removed.push(setting(
      "interaction.timeSync",
      "Time synchronization cannot be preserved without a compatible temporal role.",
    ));
  }
  return removed;
}

function setting(path, label) {
  return { path, label };
}

function meaningful(value, fallback) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.keys(value).length > 0;
  return value !== fallback;
}

function targetTransformations(sourceValue, target) {
  const source = isRecord(sourceValue) ? sourceValue : {};
  const transformations = {};
  for (const descriptor of TRANSFORMATION_SETTINGS) {
    transformations[descriptor.key] = target.transforms.includes(
      descriptor.capability,
    ) && Object.hasOwn(source, descriptor.key)
      ? clonePlainData(
          source[descriptor.key],
          `Transformation "${descriptor.key}"`,
        )
      : clonePlainData(
          descriptor.fallback,
          `Transformation "${descriptor.key}" default`,
        );
  }

  if (target.comparison) {
    transformations.comparison = comparisonCompatible(
      source.comparison,
      target,
    )
      ? clonePlainData(source.comparison, "Comparison transformation")
      : { mode: target.comparison.defaultMode };
  }
  return transformations;
}

function comparisonCompatible(comparison, target) {
  return Boolean(
    target.comparison
    && isRecord(comparison)
    && typeof comparison.mode === "string"
    && target.comparison.modes.includes(comparison.mode),
  );
}

function targetPresentation(sourceValue, target) {
  const source = isRecord(sourceValue) ? sourceValue : {};
  const presentation = {};
  if (Object.hasOwn(source, "title")) {
    presentation.title = clonePlainData(source.title, "Chart title presentation");
  }
  for (const [key, section] of Object.entries(PRESENTATION_SECTIONS)) {
    if (
      key !== "collection"
      && Object.hasOwn(source, key)
      && presentationAllowed(target, key, section, source[key])
    ) {
      presentation[key] = clonePlainData(
        source[key],
        `Chart presentation "${key}"`,
      );
    }
  }
  presentation.collection = target.capabilities.collection
    && Object.hasOwn(source, "collection")
    ? clonePlainData(source.collection, "Chart collection presentation")
    : null;
  const series = targetSeriesPresentation(source.series, target);
  if (series !== undefined) {
    presentation.series = series;
  }
  return presentation;
}

function presentationAllowed(target, key, section, value) {
  if (key === "collection") return target.capabilities.collection;
  if (key === "card") return cardPresentationCompatible(value, target.typeId);
  return target.form.sections.includes(section);
}

function removedSeriesSettings(series, target) {
  if (!isRecord(series)) return [];
  return SERIES_STYLE_PROPERTIES.flatMap((property) => (
    Object.hasOwn(series, property)
      && !seriesStylePropertySupported(target.form.appearance, property)
      ? [setting(
          `presentation.series.${property}`,
          "Series appearance setting is not used by the target chart.",
        )]
      : []
  ));
}

function targetSeriesPresentation(series, target) {
  if (!isRecord(series)) return undefined;
  const retained = {};
  for (const property of SERIES_STYLE_PROPERTIES) {
    if (
      Object.hasOwn(series, property)
      && seriesStylePropertySupported(target.form.appearance, property)
    ) {
      retained[property] = clonePlainData(
        series[property],
        `Chart presentation series "${property}"`,
      );
    }
  }
  return Object.keys(retained).length > 0 ? retained : undefined;
}

function targetInteraction(sourceValue, target, roles) {
  const source = isRecord(sourceValue) ? sourceValue : {};
  return {
    zoom: {
      enabled: target.capabilities.zoom
        ? source.zoom?.enabled !== false
        : false,
    },
    timeSync: target.capabilities.timeSync
      && hasTemporalAssignment(target, roles)
      ? clonePlainData(source.timeSync ?? null, "Chart time synchronization")
      : null,
  };
}

function hasTemporalAssignment(target, roles) {
  return target.roles.some((role) => {
    if (!role.accepts.includes("temporal")) return false;
    const assignment = roles[role.id];
    const bindings = Array.isArray(assignment)
      ? assignment
      : assignment
        ? [assignment]
        : [];
    return bindings.some((binding) => (
      binding.interpretation === "temporal"
      || (
        binding.interpretation === undefined
        && role.accepts.length === 1
      )
    ));
  });
}

function requiredString(value, description) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${description} is required.`);
  }
  return value;
}

function isRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function clonePlainData(value, description, ancestors = new WeakSet()) {
  if (
    value === null
    || value === undefined
    || typeof value === "string"
    || typeof value === "boolean"
    || (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }
  if (typeof value !== "object") {
    throw new TypeError(`${description} contains unsupported data.`);
  }
  if (ancestors.has(value)) {
    throw new TypeError(`${description} cannot contain circular data.`);
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        throw new TypeError(`${description} must use ordinary arrays.`);
      }
      if (Object.getOwnPropertySymbols(value).length > 0) {
        throw new TypeError(`${description} cannot contain symbol properties.`);
      }
      const names = Object.getOwnPropertyNames(value);
      for (const name of names) {
        if (
          name !== "length"
          && (!/^(0|[1-9]\d*)$/.test(name) || Number(name) >= value.length)
        ) {
          throw new TypeError(
            `${description} contains unknown array property "${name}".`,
          );
        }
      }
      const result = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !Object.hasOwn(descriptor, "value")) {
          throw new TypeError(
            `${description} item ${index} must be an enumerable data property.`,
          );
        }
        if (!descriptor.enumerable) {
          throw new TypeError(
            `${description} item ${index} must be enumerable.`,
          );
        }
        result.push(clonePlainData(
          descriptor.value,
          `${description} item ${index}`,
          ancestors,
        ));
      }
      return result;
    }

    if (!isRecord(value)) {
      throw new TypeError(`${description} must be a plain object.`);
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new TypeError(`${description} cannot contain symbol properties.`);
    }
    const result = {};
    for (const [key, descriptor] of Object.entries(
      Object.getOwnPropertyDescriptors(value),
    )) {
      if (DANGEROUS_PROPERTY_KEYS.has(key)) {
        throw new TypeError(
          `${description} contains dangerous property "${key}".`,
        );
      }
      if (!Object.hasOwn(descriptor, "value")) {
        throw new TypeError(
          `${description} property "${key}" must be a data property.`,
        );
      }
      if (!descriptor.enumerable) {
        throw new TypeError(
          `${description} property "${key}" must be enumerable.`,
        );
      }
      result[key] = clonePlainData(
        descriptor.value,
        `${description} property "${key}"`,
        ancestors,
      );
    }
    return result;
  } finally {
    ancestors.delete(value);
  }
}
