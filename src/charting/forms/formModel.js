import { normalizeCollectionSettings } from "../collection/collectionModel.js";
import { validateChartInstance } from "../config/chartConfigV3.js";
import {
  SERIES_STYLE_LIMITS,
} from "../presentation/seriesStyleContract.js";
import {
  cardPresentationForChart,
  cardStyleOptions,
  cardStyleUsesAccentColors,
  isDeltaCardType,
} from "../presentation/cardPresentationContract.js";
import { chartDescriptionVisible } from "../presentation/chartCitation.js";
import { enforceRenderReadiness } from "../rendering/buildRenderModel.js";
import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import {
  getChartFormSectionDefinition,
} from "../schemas/schemaTypes.js";

const STEP_DEFINITIONS = Object.freeze([
  Object.freeze({ id: "source", label: "Data source" }),
  Object.freeze({ id: "type", label: "Chart type" }),
  Object.freeze({ id: "roles", label: "Data roles" }),
  Object.freeze({ id: "style", label: "Style and layout" }),
]);

const LEGEND_PRESENTATION_RENDERERS = new Set([
  "axis",
  "composition",
  "relationship",
]);

const QUICK_PRESENTATION_FIELD_IDS = new Set([
  "title",
  "titleVisible",
  "background",
  "legendVisible",
  "seriesColors",
  "tableRowDistribution",
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
  sourceSelection = null,
  profile,
  prepared,
  chronoGroups,
  geoSources = [],
  geoJoinFields = [],
} = {}) {
  const hasType = Boolean(draft?.typeId);
  const hasSource = nonEmptyString(sourceSelection?.sourceId ?? draft?.sourceId);
  const rolesComplete = hasSource && requiredRolesAssigned(draft);
  const previewReady = preparationMatchesDraft({
    chart: draft,
    profile,
    prepared,
  });
  const editor = hasType
      ? buildEditorFormModel({
          chart: draft,
        profile,
        prepared,
        chronoGroups,
        geoSources,
          geoJoinFields,
          includeCitation: false,
        })
    : null;

  const prerequisiteSets = {
    source: [],
    type: hasSource ? [] : ["Choose a data source."],
    roles: [
      ...(!hasSource ? ["Choose a data source."] : []),
      ...(!hasType ? ["Choose a chart type."] : []),
    ],
    style: [
      ...(!hasSource ? ["Choose a data source."] : []),
      ...(!hasType ? ["Choose a chart type."] : []),
      ...(!rolesComplete ? ["Assign the required data roles."] : []),
      ...(!previewReady ? ["Prepare a valid chart preview."] : []),
      ...(previewReady && !editor?.valid
        ? ["Complete the chart title and required settings."]
        : []),
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
        style: Boolean(editor?.valid),
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
  chronoGroups = [],
  geoSources = [],
  geoJoinFields = [],
  includeCitation = true,
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
    chronoGroups: Array.isArray(chronoGroups) ? chronoGroups : [],
    geoSources: normalizedGeoSources(geoSources),
    geoJoinFields: normalizedGeoSources(geoJoinFields),
    includeCitation,
  };
  const previewReady = preparationMatchesDraft({
    chart,
    profile,
    prepared,
  });
  const sections = schema.form.sections
    .filter((sectionId) => (
      previewReady || sectionId === "data" || sectionId === "appearance"
    ))
    .map((sectionId) => {
      const definition = getChartFormSectionDefinition(sectionId);
      const fields = materializeSection(sectionId, context);
      return {
        id: sectionId,
        label: definition?.label ?? sectionId,
        fields: !previewReady && sectionId === "appearance"
          ? fields.filter(({ id }) => id === "title")
          : fields,
        advanced: definition?.advanced === true,
      };
    })
    .filter(({ fields }) => fields.length > 0);

  return {
    sections,
    valid: previewReady && chartIsValid(chart, profile),
  };
}

export function buildQuickEditorFormModel({ chart, profile } = {}) {
  if (!chart || typeof chart !== "object") {
    throw new TypeError("A chart draft is required to build its quick form.");
  }
  const schema = getChartSchema(chart.typeId);
  if (schema.authoringWorkflow !== "chart") {
    throw new Error(`Chart type "${schema.typeId}" does not use chart quick editing.`);
  }
  const fields = appearanceFields({ chart, schema }).flatMap((field) => {
    if (QUICK_PRESENTATION_FIELD_IDS.has(field.id)) return [field];
    if (field.id !== "referenceLine") return [];
    const referenceLine = chart.presentation?.referenceLine;
    if (
      !referenceLine
      || typeof referenceLine !== "object"
      || Array.isArray(referenceLine)
    ) {
      return [];
    }
    return [{
      id: "referenceLineColor",
      label: "Reference line color",
      control: "color",
      path: ["presentation", "referenceLine", "color"],
      value: referenceLine.color ?? "",
    }];
  });
  return {
    sections: [{
      id: "quick-appearance",
      label: "Quick appearance",
      fields,
      advanced: false,
    }],
    valid: chartIsValid(chart, profile),
  };
}

/**
 * Creates the pure correlation key a preview caller stores at
 * `prepared.meta.formPreparationKey`. Only preparation-affecting chart and
 * profile state participates, so title and visual edits do not invalidate a
 * valid preview while source, role, parsing, transform, or map-join changes do.
 */
export function buildFormPreparationKey({ chart, profile } = {}) {
  if (
    !chart?.typeId
    || !nonEmptyString(chart.id)
    || !nonEmptyString(chart.sourceId)
    || !requiredRolesAssigned(chart)
    || !nonEmptyString(profile?.fingerprint)
  ) {
    return null;
  }
  try {
    return `chart-form-preparation-v1:${stableSerialize({
      chart: {
        id: chart.id,
        typeId: chart.typeId,
        sourceId: chart.sourceId,
        roles: chart.roles,
        transformations: chart.transformations,
        map: chart.presentation?.map ?? null,
      },
      profile: {
        fingerprint: profile.fingerprint,
        columns: profile.columns?.map(profilePreparationColumn) ?? [],
      },
    })}`;
  } catch {
    return null;
  }
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

function dataFields({
  chart,
  profile,
  prepared,
  schema,
  geoSources,
  geoJoinFields,
  includeCitation,
}) {
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

  if (includeCitation) {
    fields.unshift({
      id: "citation",
      label: "Source citation",
      control: "citation",
      path: ["presentation", "citation", "label"],
      value: chart.presentation?.citation?.label ?? "",
      help: "Shown from the information icon. Leave blank to inherit the data-source citation.",
    });
  }

  for (const role of schema.roles) {
    const interpretation = interpretationField(role, chart, profile);
    if (interpretation) fields.push(interpretation);
  }

  if (schema.dataFamily === "geography") {
    fields.push({
      id: "geoSource",
      label: "GeoJSON source",
      control: "select",
      path: ["presentation", "map", "geoSource"],
      value: chart.presentation?.map?.geoSource ?? "",
      required: true,
      help: "Choose the validated boundary or point file used to locate the selected geographic identifiers.",
      options: [
        { value: "", label: "Choose a GeoJSON source" },
        ...geoSources,
      ],
    });
    if (
      nonEmptyString(chart.presentation?.map?.geoSource)
      && geoJoinFields.length > 0
    ) {
      fields.push({
        id: "geoJoinField",
        label: "GeoJSON property",
        control: "select",
        path: ["presentation", "map", "joinField"],
        value: chart.presentation?.map?.joinField ?? "",
        help: "Choose the GeoJSON property whose values match the selected geographic identifier column.",
        options: [
          { value: "", label: "Detect feature ID or property automatically" },
          ...geoJoinFields,
        ],
      });
    }
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
    && preparationCorrelatesDraft({ chart, profile, prepared })
    && Number(prepared?.meta?.duplicateGroupCount) > 0
    && duplicateResolutionIsEditable(prepared)
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

function appearanceFields({ chart, schema }) {
  const common = [
    {
      id: "title",
      label: "Chart title",
      control: "text",
      path: ["title"],
      value: chart.title ?? "",
      required: true,
    },
    {
      id: "titleVisible",
      label: "Show title",
      control: "toggle",
      path: ["presentation", "title", "visible"],
      value: chart.presentation?.title?.visible !== false,
    },
    {
      id: "description",
      label: "Description",
      control: "textarea",
      path: ["description"],
      value: chart.description ?? "",
    },
    {
      id: "descriptionVisible",
      label: "Show description",
      control: "toggle",
      path: ["presentation", "description", "visible"],
      value: chartDescriptionVisible(chart),
    },
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
  const series = chart.presentation?.series ?? {};
  return [
    ...common,
    ...cardAppearanceFields(chart),
    ...(LEGEND_PRESENTATION_RENDERERS.has(schema.renderer)
      ? [{
          id: "legendVisible",
          label: "Show legend",
          control: "toggle",
          path: ["presentation", "legend", "visible"],
          value: chart.presentation?.legend?.visible !== false,
        }]
      : []),
    ...(schema.typeId === "table"
      ? [{
          id: "tableRowDistribution",
          label: "Table row spacing",
          control: "select",
          path: ["presentation", "table", "rowDistribution"],
          value: chart.presentation?.table?.rowDistribution ?? "regular",
          options: [
            { value: "regular", label: "Regular spacing" },
            { value: "fill", label: "Fill available height" },
          ],
          help: "Use regular spacing for compact rows, or distribute rows to occupy the chart height.",
        }]
      : []),
    ...schema.form.appearance.map((fieldId) => (
      seriesAppearanceField(
        fieldId,
        series,
        chart.presentation?.referenceLine,
      )
    )),
  ];
}

function cardAppearanceFields(chart) {
  const options = cardStyleOptions(chart.typeId);
  if (options.length === 0) return [];

  const card = cardPresentationForChart(chart);
  const fields = [{
    id: "cardStyle",
    label: "Card style",
    control: "select",
    path: ["presentation", "card", "style"],
    value: card.style,
    options,
  }];

  if (cardStyleUsesAccentColors(chart.typeId, card.style)) {
    fields.push({
      id: "cardAccentColors",
      label: "Accent colors",
      control: "palette",
      path: ["presentation", "card", "accentColors"],
      value: card.accentColors,
      min: SERIES_STYLE_LIMITS.colors.min,
      max: SERIES_STYLE_LIMITS.colors.max,
      help: "Applied in order to card accents in this collection.",
    });
  }

  if (isDeltaCardType(chart.typeId)) {
    fields.push({
      id: "deltaArrow",
      label: "Show direction arrow",
      control: "toggle",
      path: ["presentation", "card", "showDeltaArrow"],
      value: card.showDeltaArrow,
    });
  }
  return fields;
}

function seriesAppearanceField(fieldId, series, referenceLine) {
  if (fieldId === "referenceLine") {
    return {
      id: fieldId,
      label: "Reference line",
      control: "referenceLine",
      path: ["presentation", "referenceLine"],
      value: referenceLine,
    };
  }
  if (fieldId === "seriesColors") {
    return {
      id: fieldId,
      label: "Series colors",
      control: "palette",
      path: ["presentation", "series", "colors"],
      value: series.colors,
      min: SERIES_STYLE_LIMITS.colors.min,
      max: SERIES_STYLE_LIMITS.colors.max,
    };
  }
  const limits = SERIES_STYLE_LIMITS[fieldId];
  const value = series[fieldId];
  const invalid = value !== undefined && (
    !Number.isFinite(value)
    || value < limits.min
    || value > limits.max
  );
  return {
    id: fieldId,
    label: fieldId === "lineWidth" ? "Line width" : "Bar width",
    control: "number",
    path: ["presentation", "series", fieldId],
    value,
    min: limits.min,
    max: limits.max,
    step: "any",
    help: `Choose a width from ${limits.min} through ${limits.max}.`,
    ...(invalid
      ? {
          error: `Enter a number from ${limits.min} through ${limits.max}.`,
        }
      : {}),
  };
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

function axesFields({ chart, schema, prepared }) {
  const xKind = (prepared?.meta?.axisInterpretation ?? chart.roles?.observation?.interpretation) === "temporal"
    ? "temporal"
    : "category";
  const bindings = Array.isArray(chart.roles?.measurements)
    ? chart.roles.measurements
    : [];
  return [{
    id: "axes",
    label: "Axes",
    control: "axes",
    path: ["presentation", "axes"],
    value: chart.presentation?.axes ?? {},
    xKind,
    hasSecondary: bindings.some((binding) => binding?.axis === "secondary" || binding?.yAxisIndex === 1),
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
  chronoGroups,
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
    if (chart.interaction?.zoom?.enabled === true) {
      fields.push({
        id: "rangeSelector",
        label: "Show range selector",
        control: "toggle",
        path: ["interaction", "zoom", "rangeSelector"],
        value: chart.interaction?.zoom?.rangeSelector === true,
        help: "Show a draggable overview slider below the plot.",
      });
    }
  }
  const selectedGroupIds = chronoGroups
    .filter(({ members }) => (
      Array.isArray(members)
      && members.some(({ chartId }) => chartId === chart.id)
    ))
    .map(({ id }) => id);
  const collectionIneligible = chart.presentation?.collection != null;
  if (
    schema.capabilities.timeSync
    && (!collectionIneligible || selectedGroupIds.length > 0)
  ) {
    fields.push({
      id: "timeSync",
      label: "Chrono Group memberships",
      control: "timeSync",
      groups: chronoGroups,
      selectedGroupIds,
      ineligible: collectionIneligible,
      ...(collectionIneligible
        ? {
            help: "Collection displays cannot join Chrono Groups. Remove existing memberships before saving Collection display settings.",
          }
        : {}),
      timeRoles: temporalRoleOptions(schema, chart, profile),
    });
  }
  return fields;
}

function advancedFields({ chart }) {
  return [
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

function preparationMatchesDraft({ chart, profile, prepared }) {
  if (!rendererReady(enforceRenderReadiness({ chart, prepared }))) return false;
  return preparationCorrelatesDraft({ chart, profile, prepared });
}

function preparationCorrelatesDraft({ chart, profile, prepared }) {
  const expected = buildFormPreparationKey({ chart, profile });
  return expected !== null
    && prepared?.meta
    && Object.hasOwn(prepared.meta, "formPreparationKey")
    && prepared.meta.formPreparationKey === expected;
}

function duplicateResolutionIsEditable(prepared) {
  return prepared?.status === "ready"
    || (
      prepared?.status === "invalid"
      && prepared.diagnostics?.some(
        ({ code }) => code === "duplicate-resolution-required",
      )
    );
}

function profilePreparationColumn(column) {
  return {
    name: column?.name,
    type: column?.type,
    interpretationAlternatives: column?.interpretationAlternatives,
    validInterpretations: column?.validInterpretations,
    interpolationAllowed: column?.interpolationAllowed,
    temporal: column?.temporal
      ? {
          parsingMetadata: column.temporal.parsingMetadata,
          diagnostics: column.temporal.diagnostics?.map((diagnostic) => ({
            index: diagnostic?.index,
            code: diagnostic?.code,
            format: diagnostic?.format,
          })),
        }
      : null,
  };
}

function stableSerialize(value, ancestors = new Set()) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "number:NaN";
    if (value === Number.POSITIVE_INFINITY) return "number:Infinity";
    if (value === Number.NEGATIVE_INFINITY) return "number:-Infinity";
    if (Object.is(value, -0)) return "number:-0";
    return `number:${value}`;
  }
  if (typeof value !== "object") {
    throw new TypeError("Unsupported form preparation value.");
  }
  if (ancestors.has(value)) {
    throw new TypeError("Cyclic form preparation value.");
  }
  ancestors.add(value);
  let serialized;
  if (Array.isArray(value)) {
    serialized = `[${value
      .map((item) => stableSerialize(item, ancestors))
      .join(",")}]`;
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("Form preparation values must be plain objects.");
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new TypeError("Form preparation values cannot contain symbols.");
    }
    const entries = [];
    for (const key of Object.keys(descriptors).sort()) {
      const descriptor = descriptors[key];
      if (!Object.hasOwn(descriptor, "value") || !descriptor.enumerable) {
        throw new TypeError("Form preparation values must be enumerable data.");
      }
      entries.push(
        `${JSON.stringify(key)}:${stableSerialize(descriptor.value, ancestors)}`,
      );
    }
    serialized = `{${entries.join(",")}}`;
  }
  ancestors.delete(value);
  return serialized;
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

function normalizedGeoSources(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.flatMap((option) => {
    if (
      !option
      || typeof option !== "object"
      || !nonEmptyString(option.value)
      || !nonEmptyString(option.label)
      || seen.has(option.value)
    ) {
      return [];
    }
    seen.add(option.value);
    return [{
      value: option.value,
      label: option.label,
    }];
  });
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}
