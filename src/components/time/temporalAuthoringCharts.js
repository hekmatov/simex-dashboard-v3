import { collectChartPlacements } from "../build/panelEditingModel.js";
import { buildTemporalChartVariables, describeTemporalInterpolationSupport } from "./temporalAuthoringData.js";
import { getChartSchema } from "../../charting/schemas/chartSchemaRegistry.js";

export function temporalAuthoringCharts(dashboard) {
  const memberships = new Map();
  const membershipLists = new Map();
  for (const group of dashboard.chronoGroups ?? []) {
    for (const member of group.members ?? []) {
      memberships.set(member.chartId, member);
      const entries = membershipLists.get(member.chartId) ?? [];
      entries.push({ groupId: group.id, groupName: group.name ?? group.id });
      membershipLists.set(member.chartId, entries);
    }
  }
  const variableCache = new Map();
  return collectChartPlacements(dashboard)
    .filter(({ chart }) => isTemporalAuthoringChart(chart))
    .map((placement) => {
    const chart = placement.chart;
    const member = memberships.get(chart.id);
    const timeField = bindingField(chart.roles?.[member?.timeRole])
      ?? temporalRoleField(chart.roles);
    const rows = dashboard.loadedData?.[chart.sourceId] ?? [];
    const valueFields = Object.entries(chart.roles ?? {})
      .filter(([role]) => role !== member?.timeRole)
      .flatMap(([, binding]) => bindingFields(binding))
      .filter((field) => field && field !== timeField);
    const cacheKey = JSON.stringify([chart.sourceId, timeField, valueFields]);
    const variables = variableCache.get(cacheKey)
      ?? buildTemporalChartVariables(rows, timeField, valueFields, parseEpoch);
    variableCache.set(cacheKey, variables);
    const interpolationSupport = describeTemporalInterpolationSupport(variables);
    const configuredInterpolation = chart.interaction?.timeSync?.interpolationAllowed;
    return {
      id: chart.id,
      title: chart.title,
      label: chart.title ?? chart.id,
      pageId: placement.pageId,
      pageLabel: dashboard.pages?.find(({ id }) => id === placement.pageId)?.label
        ?? dashboard.pages?.find(({ id }) => id === placement.pageId)?.title
        ?? placement.pageId,
      sectionId: placement.sectionId,
      sectionLabel: dashboard.pages?.find(({ id }) => id === placement.pageId)
        ?.sections?.find(({ id }) => id === placement.sectionId)?.title ?? placement.sectionId,
      interpolationAllowed: typeof configuredInterpolation === "boolean"
        ? configuredInterpolation
        : interpolationSupport.allowed,
      interpolationUnsupportedVariables: interpolationSupport.unsupportedVariables,
      interpolationReason: interpolationSupport.reason,
      chronoGroupMemberships: membershipLists.get(chart.id) ?? [],
      variables,
      sourceChart: chart,
      timeRole: member?.timeRole ?? temporalRoleName(chart.roles),
    };
    });
}

export function isTemporalAuthoringChart(chart) {
  try {
    return getChartSchema(chart?.typeId).authoringWorkflow !== "static";
  } catch {
    return true;
  }
}

function bindingFields(binding) {
  if (Array.isArray(binding)) return binding.flatMap(bindingFields);
  const field = bindingField(binding);
  return field ? [field] : [];
}

function bindingField(binding) {
  return typeof binding === "string" ? binding : binding?.field;
}

function temporalRoleName(roles = {}) {
  return Object.keys(roles).find((role) => /time|date|observation/i.test(role)) ?? "observation";
}

function temporalRoleField(roles = {}) {
  return bindingField(roles[temporalRoleName(roles)]);
}

function parseEpoch(value) {
  if (Number.isFinite(value)) return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}
