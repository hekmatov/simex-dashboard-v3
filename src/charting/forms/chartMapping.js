import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import { applyChartPreparation } from "./chartPreparation.js";

const TEMPORAL_POLICY_KEYS = new Set([
  "matching",
  "matchingPolicy",
  "fallback",
  "memberFallback",
  "memberFallbacks",
  "fallbackPolicy",
  "defaultMatching",
  "period",
  "frames",
  "secondsPerFrame",
  "scene",
  "playback",
]);

export function validateChartMapping({ chartTypeId, profile, mapping = {}, preparation = {} } = {}) {
  const errors = [];
  const warnings = [];
  let schema;
  try {
    schema = getChartSchema(chartTypeId);
  } catch (error) {
    return invalidResult(issue("CHART_SCHEMA_UNAVAILABLE", error.message), mapping, preparation);
  }

  if (!profile || !["ready", "partial"].includes(profile.status)) {
    return invalidResult(issue(
      "SOURCE_PROFILE_NOT_READY",
      "A ready or partial source profile is required before mapping data.",
    ), mapping, preparation);
  }

  const fieldsById = new Map((profile.fields ?? []).map((field) => [field.id, field]));
  const roles = {};
  const defaultLedger = [];
  const embeddedTemporalPolicy = Object.keys(preparation ?? {}).find((key) => TEMPORAL_POLICY_KEYS.has(key));
  if (embeddedTemporalPolicy) {
    errors.push(issue(
      "TEMPORAL_POLICY_NOT_OWNED",
      `Chart creation cannot author "${embeddedTemporalPolicy}". Open the owning Time Group workflow.`,
      "time-group-memberships",
    ));
  }
  const authorizedRoleIds = new Set(schema.roles.map(({ id }) => id));
  for (const mappingRoleId of Object.keys(mapping ?? {})) {
    if (!authorizedRoleIds.has(mappingRoleId)) {
      errors.push(issue(
        "ROLE_NOT_AUTHORIZED",
        `Role "${mappingRoleId}" is not authorized for ${schema.label}.`,
        mappingRoleId,
      ));
    }
  }

  for (const role of schema.roles) {
    const binding = normalizeBinding(mapping?.[role.id]);
    const count = binding.entries.length;
    if (count < role.min) {
      errors.push(issue(
        "ROLE_CARDINALITY_MIN",
        `${role.label} requires at least ${role.min} ${plural(role.min, "field")}.`,
        role.id,
      ));
    }
    if (role.max !== null && count > role.max) {
      errors.push(issue(
        "ROLE_CARDINALITY_MAX",
        `${role.label} accepts at most ${role.max} ${plural(role.max, "field")}.`,
        role.id,
      ));
    }
    for (const entry of binding.entries) {
      const field = fieldsById.get(entry.field);
      if (!field) {
        errors.push(issue(
          "FIELD_MISSING",
          `Field "${entry.field}" assigned to ${role.label} is missing from the current source profile.`,
          role.id,
        ));
        continue;
      }
      const effectiveType = entry.interpretation ?? field.type;
      if (!role.accepts.includes("any") && !role.accepts.includes(effectiveType)) {
        errors.push(issue(
          "FIELD_TYPE_INCOMPATIBLE",
          `${role.label} does not accept ${effectiveType} field "${field.id}".`,
          role.id,
        ));
      }
      if (entry.unit && field.unit && entry.unit !== field.unit) {
        errors.push(issue(
          "FIELD_UNIT_INCOMPATIBLE",
          `${role.label} requested ${entry.unit}, but field "${field.id}" uses ${field.unit}.`,
          role.id,
        ));
      }
    }
    if (binding.origin === "suggestion") {
      defaultLedger.push({
        path: `mapping.${role.id}`,
        origin: "suggestion",
        basis: binding.basis,
        accepted: binding.accepted,
        value: binding.entries.map(({ field }) => field),
        consequence: "Changes mapped chart meaning and dependent proofs.",
        invalidates: ["prepared-output", "render-proof", "temporal-validation"],
        reviewVisible: true,
      });
      if (!binding.basis || binding.accepted !== true) {
        errors.push(issue(
          "SUGGESTION_ACCEPTANCE_REQUIRED",
          `${role.label} suggestion requires an explained basis and explicit acceptance.`,
          role.id,
        ));
      }
    }
    roles[role.id] = {
      fields: binding.entries.map(({ field }) => field),
      required: role.min > 0,
      min: role.min,
      max: role.max,
      cardinality: role.max === 1 ? "single" : "multiple",
      acceptedTypes: [...role.accepts],
      origin: binding.origin,
      basis: binding.basis,
      accepted: binding.accepted,
    };
  }

  const mappedFieldIds = Object.values(roles).flatMap(({ fields }) => fields);
  const timeField = resolveTimeField(schema, roles, preparation);
  const mappedFields = mappedFieldIds.map((id) => fieldsById.get(id)).filter(Boolean);
  const hasNullableMappedField = mappedFields.some(({ nullable }) => nullable === true);
  if (hasNullableMappedField) {
    validateConsequentialRule(
      preparation.missingValues,
      "MISSING_VALUE_RULE",
      "missing-value",
      errors,
    );
  }
  if ((preparation.duplicateTimeCount ?? 0) > 0) {
    validateConsequentialRule(
      preparation.duplicates,
      "DUPLICATE_TIME_RULE",
      "duplicate-time",
      errors,
    );
  }

  const preparationReview = [];
  if (hasNullableMappedField && preparation.missingValues?.rule) {
    preparationReview.push(reviewRule("missingValues", preparation.missingValues));
  }
  if ((preparation.duplicateTimeCount ?? 0) > 0 && preparation.duplicates?.rule) {
    preparationReview.push(reviewRule("duplicates", preparation.duplicates));
  }

  const membershipResult = validateMemberships(
    preparation.timeGroupMemberships ?? [],
    fieldsById,
  );
  errors.push(...membershipResult.errors);

  const prepared = applyChartPreparation({
    rows: preparation.rows ?? [],
    mappedFieldIds,
    timeField,
    preparation,
  });
  errors.push(...prepared.errors);
  warnings.push(...prepared.warnings);

  return {
    valid: errors.length === 0,
    effectiveOutputCount: prepared.effectiveOutputCount,
    value: {
      chartTypeId,
      profileRevision: profile.schemaRevision,
      roles,
      preparation: sanitizePreparation(preparation),
      preparationReview,
      defaultLedger,
      timeGroupMemberships: membershipResult.memberships,
      preparedRows: prepared.rows,
    },
    errors,
    warnings,
  };
}

function validateConsequentialRule(rule, prefix, label, errors) {
  if (!rule?.rule) {
    errors.push(issue(
      `${prefix}_REQUIRED`,
      `Choose an explicit ${label} rule for affected source values.`,
      label,
    ));
  } else if (rule.accepted !== true) {
    errors.push(issue(
      `${prefix}_ACCEPTANCE_REQUIRED`,
      `Accept or change the consequential ${label} rule before continuing.`,
      label,
    ));
  }
}

function validateMemberships(memberships, fieldsById) {
  const errors = [];
  const result = [];
  const seen = new Set();
  if (!Array.isArray(memberships)) {
    return { memberships: [], errors: [issue(
      "TIME_GROUP_MEMBERSHIPS_INVALID",
      "Time Group memberships must be a list.",
      "time-group-memberships",
    )] };
  }
  for (const membership of memberships) {
    const policyKey = Object.keys(membership ?? {}).find((key) => TEMPORAL_POLICY_KEYS.has(key));
    if (policyKey) {
      errors.push(issue(
        "TEMPORAL_POLICY_NOT_OWNED",
        `Chart creation cannot author "${policyKey}". Open the owning Time Group workflow.`,
        "time-group-memberships",
      ));
      continue;
    }
    if (typeof membership?.groupId !== "string" || membership.groupId.trim() === "") {
      errors.push(issue("TIME_GROUP_ID_REQUIRED", "A selected Time Group requires its saved identity.", "time-group-memberships"));
      continue;
    }
    if (seen.has(membership.groupId)) {
      errors.push(issue(
        "TIME_GROUP_MEMBERSHIP_DUPLICATE",
        `Time Group "${membership.groupId}" is selected more than once.`,
        "time-group-memberships",
      ));
      continue;
    }
    seen.add(membership.groupId);
    const timeField = fieldsById.get(membership.timeField);
    if (!timeField || timeField.type !== "temporal") {
      errors.push(issue(
        "TIME_GROUP_TIME_FIELD_INVALID",
        `Time Group "${membership.groupId}" requires a current temporal chart field.`,
        "time-group-memberships",
      ));
      continue;
    }
    result.push({ groupId: membership.groupId, timeField: membership.timeField });
  }
  return { memberships: result, errors };
}

function normalizeBinding(value) {
  const metadata = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const raw = Array.isArray(value)
    ? value
    : Array.isArray(value?.fields)
      ? value.fields
      : value?.field !== undefined
        ? [value]
        : typeof value === "string"
          ? [value]
          : [];
  return {
    entries: raw.flatMap((entry) => {
      if (typeof entry === "string") return [{ field: entry, unit: null, interpretation: null }];
      if (entry && typeof entry.field === "string") {
        return [{
          field: entry.field,
          unit: entry.unit ?? null,
          interpretation: entry.interpretation ?? null,
        }];
      }
      return [];
    }),
    origin: metadata.origin ?? "authored",
    basis: metadata.basis ?? null,
    accepted: metadata.origin === "suggestion" ? metadata.accepted === true : true,
  };
}

function resolveTimeField(schema, roles, preparation) {
  if (typeof preparation.timeField === "string") return preparation.timeField;
  for (const role of schema.roles) {
    if (role.accepts.includes("temporal") && roles[role.id]?.fields?.length === 1) {
      return roles[role.id].fields[0];
    }
  }
  return null;
}

function sanitizePreparation(preparation) {
  return Object.fromEntries(Object.entries(structuredClone(preparation ?? {})).filter(([key]) => (
    key !== "rows" && key !== "timeGroupMemberships" && !TEMPORAL_POLICY_KEYS.has(key)
  )));
}

function reviewRule(path, rule) {
  return {
    path: `preparation.${path}`,
    value: rule.rule,
    affectedCount: rule.affectedCount ?? 0,
    accepted: rule.accepted === true,
    reviewVisible: true,
  };
}

function invalidResult(error, mapping, preparation) {
  return {
    valid: false,
    effectiveOutputCount: 0,
    value: { roles: structuredClone(mapping ?? {}), preparation: sanitizePreparation(preparation) },
    errors: [error],
    warnings: [],
  };
}

function issue(code, message, roleId = null) {
  return {
    code,
    message,
    ...(roleId ? { roleId } : {}),
    stage: "map-and-prepare-data",
    retryable: true,
  };
}

function plural(value, word) {
  return value === 1 ? word : `${word}s`;
}
