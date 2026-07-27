import { normalizeCollectionSettings } from "../collection/collectionModel.js";
import { validateChartInstance } from "../config/chartConfigV3.js";
import { getChartSchema } from "../schemas/chartSchemaRegistry.js";

const STEP_DEFINITIONS = Object.freeze([
  Object.freeze({ id: "type", label: "Chart type" }),
  Object.freeze({ id: "source", label: "Data source" }),
  Object.freeze({ id: "roles", label: "Data roles" }),
  Object.freeze({ id: "style", label: "Style and layout" }),
]);

const SECTION_LABELS = Object.freeze({
  data: "Data",
  appearance: "Appearance",
  labels: "Labels",
  axes: "Axes",
  targets: "Targets",
  map: "Map",
  timeline: "Timeline",
  collection: "Collection",
  interactions: "Interactions",
  advanced: "Advanced",
});

const VISUAL_SECTIONS = new Set([
  "appearance",
  "labels",
  "axes",
  "targets",
  "map",
  "timeline",
  "collection",
  "advanced",
]);

const INTERPRETATION_LABELS = Object.freeze({
  any: "Automatic",
  number: "Number",
  text: "Text",
  category: "Category",
  temporal: "Date or time",
  geographic: "Geography",
  boolean: "True / false",
  url: "Web address",
});

export function buildWizardFormModel({
  draft,
  profile,
  prepared,
  timeSyncGroups,
} = {}) {
  const hasType = Boolean(draft?.typeId);
  const hasSource = hasType && nonEmptyString(draft.sourceId);
  const rolesComplete = hasSource && requiredRolesAssigned(draft);
  const previewReady = rendererReady(prepared);
  const editor = hasType
    ? buildEditorFormModel({
        chart: draft,
        profile,
        prepared,
        timeSyncGroups,
      })
    : null;

  const prerequisiteSets = {
    type: [],
    source: hasType ? [] : ["Choose a chart type."],
    roles: [
      ...(!hasType ? ["Choose a chart type."] : []),
      ...(!hasSource ? ["Choose a data source."] : []),
    ],
    style: [
      ...(!hasType ? ["Choose a chart type."] : []),
      ...(!hasSource ? ["Choose a data source."] : []),
      ...(!rolesComplete ? ["Assign the required data roles."] : []),
      ...(!previewReady ? ["Prepare a valid chart preview."] : []),
    ],
  };

  return {
    steps: STEP_DEFINITIONS.map(({ id, label }) => ({
      id,
      label,
      complete: {
        type: hasType,
        source: hasSource,
        roles: rolesComplete,
        style: previewReady,
      }[id],
      prerequisites: prerequisiteSets[id],
      navigable: true,
    })),
    canCreate: Boolean(editor?.valid && previewReady),
  };
}

export function buildEditorFormModel({
  chart,
  profile,
  prepared,
  timeSyncGroups = [],
} = {}) {
  if (!chart || typeof chart !== "object") {
    throw new TypeError("A chart draft is required to build its form.");
  }
  const schema = getChartSchema(chart.typeId);
  const context = {
    chart,
    profile,
    prepared,
    schema,
    timeSyncGroups: Array.isArray(timeSyncGroups) ? timeSyncGroups : [],
  };
  const sections = schema.form.sections
    .filter((sectionId) => (
      !VISUAL_SECTIONS.has(sectionId) || rendererReady(prepared)
    ))
    .map((sectionId) => ({
      id: sectionId,
      label: SECTION_LABELS[sectionId] ?? sectionId,
      fields: materializeSection(sectionId, context),
      advanced: sectionId === "advanced",
    }))
    .filter(({ fields }) => fields.length > 0);

  return {
    sections,
    valid: rendererReady(prepared) && chartIsValid(chart, profile),
  };
}

function materializeSection(sectionId, context) {
  const builders = {
    data: dataFields,
    appearance: appearanceFields,
    labels: labelsFields,
    axes: axesFields,
    targets: targetsFields,
    map: mapFields,
    timeline: timelineFields,
    collection: collectionFields,
    interactions: interactionFields,
    advanced: advancedFields,
  };
  return builders[sectionId]?.(context) ?? [];
}

function dataFields({ chart, profile, prepared, schema }) {
  const fields = schema.roles.map((role) => {
    const supportsAxisAssignment = schema.dataFamily === "axis"
      && role.accepts.includes("number")
      && (role.max === null || role.max > 1);
    return {
      id: role.id,
      label: role.label,
      control: "role",
      path: ["roles", role.id],
      accepts: [...role.accepts],
      min: role.min,
      max: role.max,
      required: role.min > 0,
      multiple: role.max === null || role.max > 1,
      value: chart.roles?.[role.id],
      ...(supportsAxisAssignment
        ? { axisOptions: ["primary", "secondary"] }
        : {}),
    };
  });

  for (const role of schema.roles) {
    const interpretation = interpretationField(role, chart, profile);
    if (interpretation) fields.push(interpretation);
  }

  if (schema.comparison) {
    fields.push({
      id: "deltaComparison",
      label: "Comparison",
      control: "deltaComparison",
      path: ["transformations", "comparison"],
      value: chart.transformations?.comparison,
      defaultMode: schema.comparison.defaultMode,
      modes: [...schema.comparison.modes],
      matchingPolicies: [...schema.comparison.matchingPolicies],
    });
  }

  fields.push(...transformationFields(schema, chart));

  if (
    schema.transforms.includes("duplicates")
    && Number(prepared?.meta?.duplicateGroupCount) > 0
  ) {
    fields.push({
      id: "duplicates",
      label: "Duplicate observations",
      control: "duplicates",
      path: ["transformations", "duplicates"],
      aggregationPath: ["transformations", "aggregation"],
      duplicateGroupCount: prepared.meta.duplicateGroupCount,
      value: chart.transformations?.duplicates,
    });
  }
  return fields;
}

function appearanceFields({ chart }) {
  return [
    {
      id: "titleAlignment",
      label: "Title alignment",
      control: "select",
      path: ["presentation", "title", "align"],
      value: chart.presentation?.title?.align ?? "left",
      options: selectOptions(["left", "center", "right"]),
    },
    {
      id: "background",
      label: "Background",
      control: "color",
      path: ["presentation", "background", "color"],
      value: chart.presentation?.background?.color ?? "",
    },
  ];
}

function labelsFields({ chart }) {
  return [{
    id: "labels",
    label: "Labels",
    control: "labels",
    path: ["presentation", "labels"],
    value: chart.presentation?.labels ?? {},
  }];
}

function axesFields({ chart }) {
  return [{
    id: "axes",
    label: "Axes",
    control: "axes",
    path: ["presentation", "axes"],
    value: chart.presentation?.axes ?? {},
  }];
}

function targetsFields({ chart }) {
  return [{
    id: "targets",
    label: "Targets and thresholds",
    control: "targets",
    path: ["presentation", "targets"],
    value: chart.presentation?.targets ?? {},
  }];
}

function mapFields({ chart }) {
  return [{
    id: "map",
    label: "Map",
    control: "map",
    path: ["presentation", "map"],
    value: chart.presentation?.map ?? {},
  }];
}

function timelineFields({ chart }) {
  return [{
    id: "timeline",
    label: "Timeline",
    control: "timeline",
    path: ["presentation", "timeline"],
    value: chart.presentation?.timeline ?? {},
  }];
}

function collectionFields({ chart, schema }) {
  if (!schema.capabilities.collection) return [];
  return [{
    id: "collection",
    label: "Collection display",
    control: "collection",
    path: ["presentation", "collection"],
    value: normalizeCollectionSettings(chart.presentation?.collection ?? {}),
  }];
}

function interactionFields({
  chart,
  profile,
  schema,
  timeSyncGroups,
}) {
  const fields = [];
  if (schema.capabilities.zoom) {
    fields.push({
      id: "zoom",
      label: "Zoom",
      control: "toggle",
      path: ["interaction", "zoom", "enabled"],
      value: chart.interaction?.zoom?.enabled ?? false,
    });
  }
  if (schema.capabilities.timeSync) {
    const groupId = chart.interaction?.timeSync?.groupId ?? null;
    const group = timeSyncGroups.find(({ id }) => id === groupId);
    const member = group?.members?.find(({ chartId }) => chartId === chart.id);
    fields.push({
      id: "timeSync",
      label: "Synchronized playback",
      control: "timeSync",
      chartPath: ["interaction", "timeSync", "groupId"],
      groupId,
      groups: timeSyncGroups,
      timeRoles: temporalRoleOptions(schema, chart, profile),
      groupTarget: groupId
        ? {
            groupId,
            chartId: chart.id,
            property: "matching",
          }
        : null,
      groupMatching: group?.matching,
      memberMatching: member?.matching,
    });
  }
  return fields;
}

function advancedFields({ chart }) {
  return [
    {
      id: "description",
      label: "Description",
      control: "textarea",
      path: ["description"],
      value: chart.description ?? "",
    },
    {
      id: "accessibility",
      label: "Accessible description",
      control: "accessibility",
      path: ["presentation", "accessibility"],
      value: chart.presentation?.accessibility ?? {},
    },
  ];
}

function interpretationField(role, chart, profile) {
  if (role.max !== 1) return null;
  const binding = chart.roles?.[role.id];
  if (!binding || Array.isArray(binding) || !nonEmptyString(binding.field)) {
    return null;
  }
  const column = profile?.columns?.find(({ name }) => name === binding.field);
  if (!column) return null;
  const declared = (
    column.interpretationAlternatives
    ?? column.validInterpretations
    ?? []
  );
  const candidates = declared.length > 0
    ? declared
    : inferredInterpretationAlternatives(column, role);
  const alternatives = unique(candidates
    .map(canonicalInterpretation)
    .filter((value) => role.accepts.includes(value)));
  if (alternatives.length < 2) return null;
  return {
    id: `${role.id}Interpretation`,
    label: `${role.label} interpretation`,
    control: "select",
    path: ["roles", role.id, "interpretation"],
    value: binding.interpretation ?? canonicalInterpretation(column.type),
    detected: canonicalInterpretation(column.type),
    options: alternatives.map((value) => ({
      value,
      label: INTERPRETATION_LABELS[value] ?? value,
    })),
  };
}

function transformationFields(schema, chart) {
  const descriptors = {
    filter: {
      id: "filters",
      label: "Filters",
      control: "filters",
      path: ["transformations", "filters"],
      value: chart.transformations?.filters ?? [],
    },
    group: {
      id: "grouping",
      label: "Grouping",
      control: "grouping",
      path: ["transformations", "grouping"],
      value: chart.transformations?.grouping ?? null,
    },
    aggregate: {
      id: "aggregation",
      label: "Aggregation",
      control: "select",
      path: ["transformations", "aggregation"],
      value: chart.transformations?.aggregation ?? null,
      options: selectOptions([
        "sum",
        "mean",
        "min",
        "max",
        "count",
        "first",
        "last",
      ]),
    },
    missing: {
      id: "missingValues",
      label: "Missing values",
      control: "select",
      path: ["transformations", "missingValues"],
      value: chart.transformations?.missingValues ?? "gap",
      options: selectOptions(["gap", "zero", "drop"]),
    },
  };
  return schema.transforms
    .filter((transform) => Object.hasOwn(descriptors, transform))
    .map((transform) => descriptors[transform]);
}

function inferredInterpretationAlternatives(column, role) {
  const diagnostics = column.temporal?.diagnostics;
  const ambiguousTemporal = Array.isArray(diagnostics)
    && diagnostics.length > 0
    && diagnostics.every(({ code }) => code === "ambiguous-date-format");
  if (
    ambiguousTemporal
    && role.accepts.includes("temporal")
    && role.accepts.includes("category")
  ) {
    return ["temporal", "category"];
  }
  return [];
}

function temporalRoleOptions(schema, chart, profile) {
  return schema.roles
    .filter(({ accepts }) => accepts.includes("temporal"))
    .map((role) => {
      const binding = chart.roles?.[role.id];
      const field = Array.isArray(binding) ? null : binding?.field;
      const column = profile?.columns?.find(({ name }) => name === field);
      return {
        value: role.id,
        label: role.label,
        field: field ?? null,
        detected: column ? canonicalInterpretation(column.type) : null,
      };
    });
}

function requiredRolesAssigned(chart) {
  if (!chart?.typeId) return false;
  const schema = getChartSchema(chart.typeId);
  return schema.roles.every((role) => {
    if (role.min === 0) return true;
    const value = chart.roles?.[role.id];
    const bindings = role.max === null
      ? (Array.isArray(value) ? value : [])
      : (value && !Array.isArray(value) ? [value] : []);
    return bindings.length >= role.min
      && bindings.every(({ field }) => nonEmptyString(field));
  });
}

function chartIsValid(chart, profile) {
  try {
    validateChartInstance(chart, {
      columnTypes: profileColumnMap(profile),
    });
    return true;
  } catch {
    return false;
  }
}

function profileColumnMap(profile) {
  if (!Array.isArray(profile?.columns)) return undefined;
  return new Map(profile.columns.map((column) => [column.name, column]));
}

function rendererReady(prepared) {
  return prepared?.status === "ready"
    && Number(prepared?.meta?.renderableMarkCount) > 0;
}

function canonicalInterpretation(value) {
  return value === "numeric" ? "number" : value;
}

function selectOptions(values) {
  return values.map((value) => ({
    value,
    label: value[0].toUpperCase() + value.slice(1),
  }));
}

function unique(values) {
  return [...new Set(values)];
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}
