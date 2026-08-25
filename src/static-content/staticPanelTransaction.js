import { validateChartInstance } from "../charting/config/chartConfigV3.js";
import { validateDashboardChartReferences } from "../charting/config/dashboardSemanticReferences.js";
import { validateStaticDestination } from "./staticPanelCapabilities.js";
import {
  normalizeStaticSource,
  validateAuthoredAssetManifest,
  validateStaticSource,
} from "./staticSourceSchema.js";

export function nextStaticSourceRevision(previousSource, nextSource) {
  const next = normalizeStaticSource(nextSource);
  if (previousSource === null || previousSource === undefined) return 1;

  const previous = normalizeStaticSource(previousSource);
  const previousRevision = previous.revision;
  return sameSavedSource(previous, next) ? previousRevision : previousRevision + 1;
}

export function prepareStaticPanelTransaction({
  dashboard,
  operation,
  destination,
  panelId,
  panel,
  source,
  assets = {},
} = {}) {
  const baseDashboard = cloneRecord(dashboard, "Static panel transaction dashboard");
  if (!isRecord(panel)) throw new TypeError("Static panel transaction panel is required.");
  validateChartInstance(panel);

  const candidateDashboard = structuredClone(baseDashboard);
  const previousPlacement = operation === "update"
    ? findPanel(candidateDashboard, panelId ?? panel.id)
    : null;
  if (operation !== "create" && operation !== "update") {
    throw new Error(`Unknown static panel transaction operation "${String(operation)}".`);
  }
  if (operation === "update" && !previousPlacement) {
    throw new Error(`Static panel "${String(panelId ?? panel.id)}" does not exist.`);
  }

  const existingSource = previousPlacement
    ? candidateDashboard.dataSources?.[previousPlacement.panel.sourceId]
    : undefined;
  const committedRevision = nextStaticSourceRevision(existingSource, source);
  const committedSource = {
    ...normalizeStaticSource(source),
    revision: committedRevision,
  };
  const mergedAssets = {
    ...(candidateDashboard.assets ?? {}),
    ...structuredClone(assets),
  };
  validateAuthoredAssetManifest(mergedAssets);
  validateStaticSource(committedSource, { assets: mergedAssets });

  if (Object.hasOwn(candidateDashboard, "assets") || Object.keys(assets).length > 0) {
    candidateDashboard.assets = mergedAssets;
  }
  candidateDashboard.dataSources = {
    ...(candidateDashboard.dataSources ?? {}),
    [panel.sourceId]: committedSource,
  };

  if (operation === "create") {
    const target = validateStaticDestination(destination, candidateDashboard);
    const section = candidateDashboard.pages
      .find(({ id }) => id === target.pageId)
      .sections.find(({ id }) => id === target.sectionId);
    if (findPanel(candidateDashboard, panel.id)) {
      throw new Error(`Static panel "${panel.id}" already exists.`);
    }
    section.panels = [...(section.panels ?? []), { id: panel.id, chart: structuredClone(panel) }];
  } else {
    previousPlacement.wrapper.id = panel.id;
    previousPlacement.wrapper.chart = structuredClone(panel);
  }

  validateDashboardChartReferences(
    collectPanelPlacements(candidateDashboard),
    candidateDashboard.dataSources,
    { assets: candidateDashboard.assets },
  );

  return deepFreeze({
    kind: "static-panel-transaction",
    operation,
    panelId: panel.id,
    sourceId: panel.sourceId,
    committedRevision,
    baseDashboard,
    candidateDashboard,
  });
}

export async function commitStaticPanelTransaction(
  prepared,
  { controller, commit, commitPrepared, rollback } = {},
) {
  if (prepared?.kind !== "static-panel-transaction") {
    throw new TypeError("A prepared static panel transaction is required.");
  }
  try {
    const dashboard = typeof commitPrepared === "function"
      ? await commitPrepared(prepared)
      : typeof controller?.commitPrepared === "function"
      ? await controller.commitPrepared(prepared)
      : await requireCommit(commit)(structuredClone(prepared.candidateDashboard));
    return {
      dashboard: structuredClone(dashboard),
      committedRevision: prepared.committedRevision,
    };
  } catch (error) {
    if (typeof rollback === "function") await rollback(prepared, error);
    throw error;
  }
}

function sameSavedSource(previous, next) {
  const comparable = (value) => {
    const clone = structuredClone(value);
    delete clone.revision;
    return clone;
  };
  return stableSerialize(comparable(previous)) === stableSerialize(comparable(next));
}

function stableSerialize(value) {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function findPanel(dashboard, panelId) {
  for (const page of dashboard.pages ?? []) {
    for (const section of page.sections ?? []) {
      for (const wrapper of section.panels ?? []) {
        const panel = wrapper.chart ?? wrapper;
        if (panel.id === panelId) return { page, section, wrapper, panel };
      }
    }
  }
  return null;
}

function collectPanelPlacements(dashboard) {
  const panels = [];
  for (const page of dashboard.pages ?? []) {
    for (const section of page.sections ?? []) {
      for (const wrapper of section.panels ?? []) {
        panels.push({
          chart: wrapper.chart ?? wrapper,
          pageId: page.id,
          sectionId: section.id,
        });
      }
    }
  }
  return { panels };
}

function requireCommit(commit) {
  if (typeof commit !== "function") {
    throw new TypeError("A dashboard commit function or controller is required.");
  }
  return commit;
}

function cloneRecord(value, description) {
  if (!isRecord(value)) throw new TypeError(`${description} must be an object.`);
  return structuredClone(value);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}
