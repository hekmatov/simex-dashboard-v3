import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import { validateChartInstance } from "./chartConfigV3.js";
import { validateStaticSource } from "../../static-content/staticSourceSchema.js";

/**
 * Validates chart-to-source references for an already validated dashboard
 * structure. Every public dashboard consumer uses this inventory so source
 * existence and source-kind compatibility cannot drift between boundaries.
 */
export function validateDashboardChartReferences(
  structure,
  dataSources,
  { columnTypesForSource, assets } = {},
) {
  const entries = [];

  for (const placement of structure.panels) {
    const { chart } = placement;

    if (!Object.hasOwn(dataSources, chart.sourceId)) {
      validateChartInstance(chart);
      throw new Error(
        `Chart "${chart.id}" references unknown source "${chart.sourceId}".`,
      );
    }

    const source = dataSources[chart.sourceId];
    const schema = getChartSchema(chart.typeId);
    if (schema.authoringWorkflow === "static") {
      const sourceKind = source.kind;
      if (!schema.sources.includes(sourceKind)) {
        throw new Error(
          `Chart "${chart.id}" does not support ${source.kind} source "${chart.sourceId}".`,
        );
      }
      if (sourceKind === "staticText" || sourceKind === "staticImage") {
        validateStaticSource(source, { assets });
      }
      validateChartInstance(chart);
      entries.push({
        ...placement,
        placement,
        schema,
        source,
      });
      continue;
    }
    const sourceKind = source.kind === "inline" ? "inline" : "dataset";
    if (!schema.sources.includes(sourceKind)) {
      throw new Error(
        `Chart "${chart.id}" does not support ${source.kind} source "${chart.sourceId}".`,
      );
    }

    validateChartInstance(
      chart,
      columnTypesForSource === undefined
        ? undefined
        : { columnTypes: columnTypesForSource(chart.sourceId, source) },
    );

    entries.push({
      ...placement,
      placement,
      schema,
      source,
    });
  }

  return entries;
}
