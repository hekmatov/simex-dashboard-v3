import { getChartSchema } from "../../charting/schemas/chartSchemaRegistry.js";
import { sceneMemberTimeRole, normalizeSceneDefaults } from "../../charting/time/sceneSchema.js";
import { collectTemporalAvailability } from "../../charting/time/temporalAvailability.js";
import { buildPresentableItemIndex } from "../../static-content/staticPanelCapabilities.js";
import { displayLayoutToScenePresentLayout } from "./scenePresentLayout.js";

const DAY = 86400000;
const DISPLAY_LAYOUTS = Object.freeze({ 1: ["solo"], 2: ["sideBySide", "overUnder"],
  3: ["leftFocus", "rightFocus", "topFocus", "bottomFocus"], 4: ["grid2x2"] });

export function storylineViewMembers(chartIds, layout) {
  if (!DISPLAY_LAYOUTS[chartIds.length]?.includes(layout)) throw new Error("Choose a comparison layout valid for the selected chart count.");
  return chartIds.map((chartId, index) => ({ chartId,
    width: layout === "solo" || layout === "overUnder" || (layout === "topFocus" && index === 0)
      || (layout === "bottomFocus" && index === 2) ? 4 : 2,
    height: ["leftFocus", "rightFocus"].includes(layout) && index === 0 ? 2 : 1,
  }));
}

export function buildStorylineCoverage(dashboard = {}, window = null, { calendarPeriod = false } = {}) {
  const presentable = buildPresentableItemIndex(dashboard);
  const start = window?.start ? Date.parse(window.start) : -Infinity;
  const end = window?.end ? Date.parse(window.end) : Infinity;
  const candidates = [];
  for (const page of dashboard.pages ?? []) for (const section of page.sections ?? []) for (const placement of section.panels ?? []) {
    const chart = placement.chart ?? placement;
    let schema;
    try { schema = getChartSchema(chart.typeId); } catch { continue; }
    if (schema.authoringWorkflow === "static") continue;
    let epochs = [], timeRole = null, reason = "";
    try {
      timeRole = sceneMemberTimeRole(chart, {}, dashboard.datasetProfiles);
      if (!presentable.has(chart.id)) throw new Error("This chart cannot be included in a Present composition.");
      if (!Array.isArray(dashboard.loadedData?.[chart.sourceId])) throw new Error("Source data is not loaded. Restore the source before including this chart.");
      const entry = dashboard.datasetProfiles?.[chart.sourceId];
      epochs = collectTemporalAvailability({ chart, member: { chartId: chart.id, timeRole },
        rows: dashboard.loadedData[chart.sourceId], profile: entry?.datasetProfile ?? entry?.profile ?? entry,
        period: { start: "0001-01-01", end: "9999-12-31" }, timezone: dashboard.timezone ?? "UTC" });
    } catch (error) { reason = error.message; }
    const profileEntry = dashboard.datasetProfiles?.[chart.sourceId];
    const inside = calendarPeriod && window && !reason ? collectTemporalAvailability({ chart, member: { chartId: chart.id, timeRole },
      rows: dashboard.loadedData[chart.sourceId], profile: profileEntry?.datasetProfile ?? profileEntry?.profile ?? profileEntry,
      period: window, timezone: dashboard.timezone ?? "UTC" }) : epochs.filter(epoch => epoch >= start && epoch <= end);
    const first = epochs[0] ?? null, last = epochs.at(-1) ?? null;
    candidates.push({ id: chart.id, chart, title: chart.title ?? chart.id, pageId: page.id,
      pageLabel: page.label ?? page.title ?? page.id, sectionId: section.id, sectionLabel: section.title ?? section.id,
      sourceId: chart.sourceId, sourceLabel: dashboard.contentLibrary?.sourceEntries?.[chart.sourceId]?.displayName ?? chart.sourceId,
      eligible: !reason, reason, timeRole, epochs, start: first, end: last, count: epochs.length,
      inWindowCount: inside.length, inWindowEpochs: inside, cadence: cadenceName(epochs),
      coverage: !inside.length ? "none" : !window ? "whole-coverage" : first > start || last < end ? "partial" : "spans-window" });
  }
  return candidates;
}

export function filterStorylineCoverage(candidates, { sourceId = "all", cadence = "all", query = "" } = {}) {
  const text = query.trim().toLocaleLowerCase();
  return candidates.filter(candidate => (sourceId === "all" || candidate.sourceId === sourceId)
    && (cadence === "all" || candidate.cadence === cadence)
    && (!text || [candidate.title, candidate.pageLabel, candidate.sectionLabel, candidate.sourceLabel].some(value => String(value ?? "").toLocaleLowerCase().includes(text))));
}

export function createComparisonStoryline({ dashboard, chartIds, layout, id, name = "" }) {
  if (!Array.isArray(chartIds) || chartIds.length < 2 || chartIds.length > 4 || new Set(chartIds).size !== chartIds.length) {
    throw new Error("Choose two to four distinct temporal charts to save a Storyline.");
  }
  const candidates = new Map(buildStorylineCoverage(dashboard).map(candidate => [candidate.id, candidate]));
  const selected = chartIds.map(chartId => {
    const candidate = candidates.get(chartId);
    if (!candidate?.eligible) throw new Error(candidate?.reason || `Chart "${chartId}" no longer exists or is not temporal.`);
    return candidate;
  });
  const epochs = selected.flatMap(candidate => candidate.epochs);
  let start = Infinity, end = -Infinity;
  for (const epoch of epochs) { start = Math.min(start, epoch); end = Math.max(end, epoch); }
  return normalizeSceneDefaults({ id, name,
    ...(epochs.length ? { period: { start: new Date(start).toISOString(), end: new Date(end).toISOString() } } : {}),
    members: storylineViewMembers(chartIds, layout), view: { layout },
    frames: { mode: "source", chartId: selected.find(candidate => candidate.count > 0)?.id ?? chartIds[0], selection: "all" },
    present: { chartIds: [...chartIds], layout: displayLayoutToScenePresentLayout(layout, chartIds.length) },
  });
}

/** Admission is separate from durable save and never replaces an existing owner. */
export function storylineDraftAdmission({ readOnly = false, mutationsDisabled = false, chartDraftOpen = false,
  sceneDraft, chronoGroupDraft, layoutDraft, sourceContentOwners = [] } = {}) {
  if (readOnly) return "This dashboard is read-only.";
  if (mutationsDisabled) return "Wait for the current dashboard operation to finish.";
  if (chartDraftOpen || sceneDraft || chronoGroupDraft || sourceContentOwners.length
    || (layoutDraft && layoutDraft.status !== "clean")) return "Save or discard the existing Build drafts before saving this comparison as a Storyline.";
  return "";
}

function cadenceName(epochs) {
  if (!epochs.length) return "none";
  if (epochs.length === 1) return "single";
  const gaps = epochs.slice(1).map((epoch, index) => epoch - epochs[index]).sort((a, b) => a - b);
  const days = gaps[Math.floor(gaps.length / 2)] / DAY;
  return days <= 1.5 ? "daily" : days <= 8 ? "weekly" : days <= 16 ? "fortnightly"
    : days <= 45 ? "monthly" : days <= 100 ? "quarterly" : days <= 400 ? "annual" : "irregular";
}
