import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import { prepareAxisData } from "./prepareAxisData.js";
import { prepareCompositionData } from "./prepareCompositionData.js";
import { prepareGeographyData } from "./prepareGeographyData.js";
import { prepareMatrixData } from "./prepareMatrixData.js";
import { prepareOperationalData } from "./prepareOperationalData.js";
import { prepareRelationshipData } from "./prepareRelationshipData.js";
import { prepareTargetData } from "./prepareTargetData.js";
import { prepareTimelineData } from "./prepareTimelineData.js";
import { analyzeGeographyJoin } from "./geographyJoin.js";
import {
  applyTemporalProvenance,
  applyTimeContext as applyPlaybackTimeContext,
} from "../time/applyTimeContext.js";
import {
  applyTimeContext as applyLegacyTimeContext,
  applyTransforms,
  error,
  validateRoleBindings,
  warning,
} from "./transforms.js";

const PREPARERS = Object.freeze({
  axis: prepareAxisData,
  composition: prepareCompositionData,
  relationship: prepareRelationshipData,
  matrix: prepareMatrixData,
  timeline: prepareTimelineData,
  target: prepareTargetData,
  geography: prepareGeographyData,
  operational: prepareOperationalData,
});

const MARK_FIELDS_BY_ROLE = Object.freeze({
  axis: { measurements: "value", observation: "x" },
  composition: { category: "category", value: "value" },
  relationship: { x: "x", y: "y", size: "size", label: "label", cluster: "cluster" },
  matrix: { row: "row", column: "column", value: "value", time: "time" },
  timeline: { event: "event", start: "start", end: "end", lane: "lane", status: "status" },
  target: {
    value: "value", actual: "actual", measurement: "displayed", entity: "entity",
    time: "time", target: "target", label: "label",
  },
  geography: { geography: "geography", value: "value", time: "time" },
  operational: { columns: "columns", time: "time" },
});
const GROUPABLE_FAMILIES = new Set(["axis", "composition", "relationship", "matrix", "timeline", "geography"]);

export function prepareChartData(input = {}) {
  const chart = input.chart ?? {};
  const schema = getChartSchema(chart.typeId);
  const transformedRows = applyTransforms(input.rows, chart.transformations, input.datasetProfile, chart);
  const timeScoped = applyLegacyTimeContext(transformedRows.rows, input.timeContext, input.datasetProfile);
  const temporalProjection = applyPlaybackTimeContext({
    chart,
    rows: timeScoped.rows,
    profile: input.datasetProfile,
    timeContext: input.timeContext,
    transformed: transformedRows,
  });
  const transformed = {
    ...transformedRows,
    rows: temporalProjection.rows,
    rowsAfterTimeContext: temporalProjection.rowsAfterTimeContext,
    diagnostics: [...transformedRows.diagnostics, ...temporalProjection.diagnostics],
  };
  const geographyBinding = prepareGeographyBinding(
    schema,
    chart,
    transformed.rows,
    input.geoData,
  );
  const preparationChart = geographyBinding.chart;
  const bindingDiagnostics = validateRoleBindings(schema, chart, input.datasetProfile);
  const initialDiagnostics = [
    ...transformed.diagnostics,
    ...bindingDiagnostics,
    ...validateGroupTransform(schema, transformed, input.datasetProfile),
    ...geographyBinding.diagnostics,
  ];

  if (initialDiagnostics.some(({ severity }) => severity === "error")) {
    return finalizePreparedResult(
      { marks: [], diagnostics: initialDiagnostics, duplicateGroupCount: 0, meta: {} },
      transformed,
      schema,
    );
  }

  const prepared = prepareProjectedData({
    ...input,
    chart: preparationChart,
    schema,
    rows: transformed.rows,
    transformed,
  }, temporalProjection);
  const timeAware = applyTemporalProvenance({
    chart: preparationChart,
    prepared,
    projection: temporalProjection,
  });
  return finalizePreparedResult({
    ...timeAware,
    diagnostics: [...initialDiagnostics, ...(timeAware.diagnostics ?? [])],
  }, transformed, schema);
}

export function validateChartDataCompatibility({ chart, rows = [], datasetProfile, geoData } = {}) {
  const columns = new Set((datasetProfile?.columns ?? []).map(({ name }) => name));
  const referenced = configuredDataFields(chart);
  const missingColumns = [...referenced].filter((field) => !columns.has(field)).sort();
  if (missingColumns.length > 0) {
    return cloneAndFreeze({
      ok: false,
      missingColumns,
      errors: missingColumns.map((field) => ({
        code: "missing-encoding-column",
        field,
        message: `Configured column "${field}" is missing from the replacement CSV.`,
      })),
      prepared: null,
    });
  }
  const prepared = prepareChartData({ chart, rows, datasetProfile, geoData });
  const errors = (prepared.diagnostics ?? [])
    .filter(({ severity }) => severity === "error")
    .map((diagnostic) => ({ code: diagnostic.code ?? "chart-data-invalid", message: diagnostic.message }));
  return cloneAndFreeze({ ok: errors.length === 0, missingColumns: [], errors, prepared });
}

function configuredDataFields(value) {
  const fields = new Set();
  const stack = [value?.roles, value?.transformations];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    if (Array.isArray(current)) {
      for (const child of current) stack.push(child);
      continue;
    }
    for (const [key, child] of Object.entries(current)) {
      if (key === "field" && typeof child === "string" && child.trim()) fields.add(child.trim());
      else if (key === "fields" && Array.isArray(child)) {
        for (const field of child) if (typeof field === "string" && field.trim()) fields.add(field.trim());
      } else stack.push(child);
    }
  }
  return fields;
}

function prepareGeographyBinding(schema, chart, rows, geoData) {
  if (schema.dataFamily !== "geography") {
    return { chart, diagnostics: [] };
  }
  const sourceId = chart.presentation?.map?.geoSource;
  const sourceDetails = {
    fieldId: "geoSource",
    path: ["presentation", "map", "geoSource"],
  };
  if (typeof sourceId !== "string" || sourceId.trim() === "") {
    return {
      chart,
      diagnostics: [error(
        "geography-source-required",
        "Choose a valid GeoJSON source for this chart.",
        sourceDetails,
      )],
    };
  }
  if (
    !geoData
    || geoData.type !== "FeatureCollection"
    || !Array.isArray(geoData.features)
    || geoData.features.length === 0
  ) {
    return {
      chart,
      diagnostics: [error(
        "geography-source-unavailable",
        `GeoJSON source "${sourceId}" is unavailable or invalid. Choose another source.`,
        sourceDetails,
      )],
    };
  }

  const analysis = analyzeGeographyJoin({ chart, rows, geoData });
  if (analysis.status === "pending") {
    return { chart, diagnostics: [] };
  }
  if (analysis.status === "ready") {
    if (!analysis.joinField || chart.presentation?.map?.joinField) {
      return { chart, diagnostics: [] };
    }
    return {
      chart: {
        ...chart,
        presentation: {
          ...chart.presentation,
          map: {
            ...chart.presentation.map,
            joinField: analysis.joinField,
          },
        },
      },
      diagnostics: [],
    };
  }
  const joinDetails = {
    fieldId: "geoJoinField",
    path: ["presentation", "map", "joinField"],
  };
  if (analysis.status === "ambiguous") {
    return {
      chart,
      diagnostics: [error(
        "geography-join-ambiguous",
        `Several GeoJSON properties match the geographic identifiers (${analysis.candidates.join(", ")}). Choose the GeoJSON property to use.`,
        { ...joinDetails, candidates: analysis.candidates },
      )],
    };
  }
  if (analysis.status === "missing-property") {
    return {
      chart,
      diagnostics: [error(
        "geography-join-property-missing",
        `GeoJSON property "${analysis.joinField}" is not present in the selected source. Choose another GeoJSON property.`,
        { ...joinDetails, joinField: analysis.joinField },
      )],
    };
  }
  return {
    chart,
    diagnostics: [error(
      "geography-join-unmatched",
      "No GeoJSON feature IDs or properties match the selected geographic identifiers. Choose the GeoJSON property to use.",
      joinDetails,
    )],
  };
}

function prepareProjectedData(input, temporalProjection) {
  if (input.schema.dataFamily !== "axis" || !temporalProjection.measureRows) {
    return PREPARERS[input.schema.dataFamily](input);
  }
  const parts = [...temporalProjection.measureRows.values()].map(({ measure, rows }) => (
    prepareAxisData({
      ...input,
      chart: {
        ...input.chart,
        roles: {
          ...input.chart.roles,
          measurements: measure,
        },
      },
      rows,
      transformed: {
        ...input.transformed,
        rows,
      },
    })
  ));
  return {
    marks: parts.flatMap(({ marks = [] }) => marks),
    diagnostics: parts.flatMap(({ diagnostics = [] }) => diagnostics),
    duplicateGroupCount: parts.reduce(
      (total, { duplicateGroupCount = 0 }) => total + duplicateGroupCount,
      0,
    ),
    meta: {
      ...(parts[0]?.meta ?? {}),
      axes: {
        primary: parts.flatMap(({ meta }) => meta?.axes?.primary ?? []),
        secondary: parts.flatMap(({ meta }) => meta?.axes?.secondary ?? []),
      },
    },
  };
}

function validateGroupTransform(schema, transformed, datasetProfile) {
  const fields = transformed.config.groupFields;
  if (fields.length === 0) return [];
  if (!GROUPABLE_FAMILIES.has(schema.dataFamily)) {
    return [error(
      "group-transform-unsupported",
      `${schema.label} ${schema.dataFamily} marks cannot represent grouped data. Remove the group transform or choose a grouped chart.`,
      { dataFamily: schema.dataFamily, fields },
    )];
  }
  const columns = new Set((datasetProfile?.columns ?? []).map(({ name }) => name));
  return fields
    .filter((field) => !columns.has(field))
    .map((field) => error("group-field-missing", `Group field "${field}" is not in the dataset.`, { field }));
}

function finalizePreparedResult(prepared, transformed, schema) {
  const diagnostics = [...(prepared.diagnostics ?? [])];
  const hasErrors = diagnostics.some(({ severity }) => severity === "error");
  const marks = hasErrors ? [] : (prepared.marks ?? []);
  const renderableMarkCount = marks.filter((mark) => isRenderableMark(mark, schema)).length;
  if (!hasErrors && renderableMarkCount === 0) {
    diagnostics.push(warning("no-renderable-marks", "No renderer-ready marks remain after validation and transformations."));
  }
  return cloneAndFreeze({
    status: hasErrors ? "invalid" : renderableMarkCount > 0 ? "ready" : "empty",
    marks,
    diagnostics,
    meta: {
      dataFamily: schema.dataFamily,
      renderer: schema.renderer,
      markCount: marks.length,
      renderableMarkCount,
      rowsBeforeFilters: transformed.rowsBeforeFilters,
      rowsAfterFilters: transformed.rowsAfterFilters,
      rowsAfterTimeContext: transformed.rowsAfterTimeContext,
      filterCount: transformed.filterCount,
      duplicateGroupCount: prepared.duplicateGroupCount ?? 0,
      aggregation: transformed.config.aggregation,
      duplicateStrategy: transformed.config.duplicateStrategy,
      missingStrategy: transformed.config.missingStrategy,
      ...(prepared.meta ?? {}),
    },
  });
}

function isRenderableMark(mark, schema) {
  if (!mark || typeof mark !== "object") return false;
  const fieldByRole = MARK_FIELDS_BY_ROLE[schema.dataFamily] ?? {};
  for (const role of schema.roles.filter(({ min }) => min > 0)) {
    const field = fieldByRole[role.id];
    if (!field || !hasRenderableValue(mark[field])) return false;
  }
  const family = schema.dataFamily;
  if (family === "axis") return mark.x !== null && mark.x !== undefined && mark.value !== null && mark.value !== undefined;
  if (family === "composition") return mark.category !== null && mark.category !== undefined && mark.value !== null && mark.value !== undefined;
  if (family === "matrix") return hasRenderableValue(mark.row) && hasRenderableValue(mark.column) && hasRenderableValue(mark.value);
  if (family === "geography") {
    const located = schema.typeId === "mapScatter"
      ? Array.isArray(mark.coordinates) && mark.coordinates.length >= 2
      : mark.feature?.type === "Feature";
    return located
      && mark.geography !== null
      && mark.geography !== undefined
      && mark.value !== null
      && mark.value !== undefined;
  }
  if (family === "relationship") return mark.x !== null && mark.y !== null;
  if (family === "timeline") return Boolean(mark.event) && Boolean(mark.start);
  if (family === "target") {
    if ((schema.typeId === "deltaCard" || schema.typeId === "deltaList") && !hasRenderableValue(mark.comparison)) return false;
    return [mark.value, mark.actual, mark.displayed].some((value) => value !== null && value !== undefined);
  }
  if (family === "operational") return Boolean(mark.src) || (Array.isArray(mark.columns) && mark.columns.length > 0);
  return false;
}

function hasRenderableValue(value) {
  return value !== null
    && value !== undefined
    && value !== ""
    && (!Array.isArray(value) || value.length > 0);
}

function cloneAndFreeze(value) {
  return deepFreeze(structuredClone(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}
