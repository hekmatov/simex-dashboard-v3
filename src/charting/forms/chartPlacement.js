import { destinationIdentity, resolveDestination } from "./chartDestination.js";
import {
  isSupportedFootprintRowHeight,
  resolveChartFootprint,
} from "../../components/chartPanelLayout.js";

const POSITIONS = new Set(["append", "before", "after"]);

export function planIdentityPlacement({
  destination,
  anchorChartId = null,
  position = "append",
  chartId,
  presets = {},
} = {}, dashboard = {}) {
  const destinationResolution = normalizeDestination(destination, dashboard);
  const identity = destinationIdentity(destinationResolution);
  const errors = [];
  const fatalErrors = [];
  const requestedPosition = position ?? "append";

  if (destinationResolution.status !== "valid") {
    fatalErrors.push(issue(
      "PLACEMENT_DESTINATION_INVALID",
      "Repair the named Destination before validating placement.",
    ));
  }
  if (!POSITIONS.has(requestedPosition)) {
    fatalErrors.push(issue(
      "PLACEMENT_POSITION_INVALID",
      'Placement must be "append", "before", or "after".',
    ));
  }
  if (!validIdentity(chartId)) {
    fatalErrors.push(issue("CHART_ID_REQUIRED", "A stable chart identity is required for placement."));
  }

  const locatedCharts = chartLocations(dashboard);
  if (locatedCharts.some(({ chart }) => chart.id === chartId)) {
    fatalErrors.push(issue(
      "CHART_ID_DUPLICATE",
      `Chart identity "${String(chartId)}" already exists in the dashboard.`,
    ));
  }

  const presetResult = validatePresets(presets);
  fatalErrors.push(...presetResult.errors);
  const destinationSection = findSection(dashboard, identity.pageId, identity.sectionId);
  const savedEntries = panelEntries(destinationSection?.panels ?? []);

  let anchor = null;
  if (requestedPosition === "before" || requestedPosition === "after") {
    const matches = locatedCharts.filter(({ chart }) => chart.id === anchorChartId);
    if (matches.length === 0) {
      fatalErrors.push(issue(
        "PLACEMENT_ANCHOR_MISSING",
        `Insertion anchor "${String(anchorChartId)}" no longer exists. The original choice was retained for repair.`,
      ));
    } else {
      anchor = matches[0];
      if (anchor.pageId !== identity.pageId || anchor.sectionId !== identity.sectionId) {
        fatalErrors.push(issue(
          "PLACEMENT_ANCHOR_OUTSIDE_DESTINATION",
          `Insertion anchor "${String(anchorChartId)}" moved outside the named destination section.`,
        ));
      }
    }
  }

  errors.push(...fatalErrors);
  let projectedEntries = null;
  let affectedNeighbourIds = [];
  if (fatalErrors.length === 0) {
    const draftEntry = {
      chart: { id: chartId, title: "New chart", layout: { size: presetResult.width.id } },
      width: presetResult.width,
      height: presetResult.height,
      draft: true,
    };
    projectedEntries = [...savedEntries];
    if (requestedPosition === "append") {
      projectedEntries.push(draftEntry);
    } else {
      const anchorIndex = projectedEntries.findIndex(({ chart }) => chart.id === anchorChartId);
      projectedEntries.splice(requestedPosition === "before" ? anchorIndex : anchorIndex + 1, 0, draftEntry);
    }
    affectedNeighbourIds = affectedNeighbours({
      before: savedEntries,
      after: projectedEntries,
      columns: presetResult.columns,
      presetResult,
    });
  }

  const projectedChartIds = projectedEntries?.map(({ chart }) => chart.id) ?? null;
  const baseRevision = revisionFor("placement", {
    destinationRevision: identity.revision,
    chartId: chartId ?? null,
    anchorChartId: anchorChartId ?? null,
    position: requestedPosition,
    selectedWidth: presetResult.width?.id ?? presets?.selectedWidth ?? null,
    selectedHeight: presetResult.height?.id ?? presets?.selectedHeight ?? null,
    columns: presetResult.columns,
    currentOrder: savedEntries.map(({ chart }) => chart.id),
    projectedOrder: projectedChartIds,
    affectedNeighbourIds,
    fatalErrorCodes: fatalErrors.map(({ code }) => code),
  });

  if (
    fatalErrors.length === 0
    && presets?.acknowledgedRevision
    && presets.acknowledgedRevision !== baseRevision
  ) {
    errors.push(issue(
      "PLACEMENT_ACKNOWLEDGEMENT_STALE",
      "The destination order changed. Review and acknowledge the current placement projection.",
    ));
  }

  return {
    revision: baseRevision,
    destinationRevision: identity.revision,
    status: errors.length === 0 ? "valid" : "invalid",
    orderedText: placementText({
      identity,
      position: requestedPosition,
      anchor,
      anchorChartId,
      presetResult,
      projectedEntries,
      affectedNeighbourIds,
      savedEntries,
    }),
    affectedNeighbourIds,
    errors,
    position: requestedPosition,
    anchorChartId,
    projectedChartIds,
    projection: projectedEntries
      ? projectedEntries.map(({ chart, draft }) => ({ chartId: chart.id, draft: draft === true }))
      : null,
  };
}

function normalizeDestination(destination, dashboard) {
  if (destination?.destination && destination?.revision && destination?.status) return destination;
  return resolveDestination(destination ?? {}, dashboard);
}

function validatePresets(presets) {
  const errors = [];
  const columns = Number.isInteger(presets?.columns) && presets.columns > 0 ? presets.columns : 1;
  const widths = normalizePresetList(presets?.widths, "columns", columns);
  const heights = normalizePresetList(presets?.heights, "rows", Number.MAX_SAFE_INTEGER);
  if (widths.length === 0) {
    errors.push(issue("WIDTH_PRESET_UNAVAILABLE", "The destination exposes no supported width preset."));
  }
  if (heights.length === 0) {
    errors.push(issue("HEIGHT_PRESET_UNAVAILABLE", "The destination exposes no supported height preset."));
  }
  const width = widths.find(({ id }) => id === presets?.selectedWidth)
    ?? (presets?.selectedWidth === undefined ? widths.find(({ default: preferred }) => preferred) ?? widths[0] : null);
  const height = heights.find(({ id }) => id === presets?.selectedHeight)
    ?? (presets?.selectedHeight === undefined ? heights.find(({ default: preferred }) => preferred) ?? heights[0] : null);
  if (widths.length > 0 && !width) {
    errors.push(issue(
      "WIDTH_PRESET_UNSUPPORTED",
      `Width preset "${String(presets?.selectedWidth)}" is not supported by this destination.`,
    ));
  }
  if (heights.length > 0 && !height) {
    errors.push(issue(
      "HEIGHT_PRESET_UNSUPPORTED",
      `Height preset "${String(presets?.selectedHeight)}" is not supported by this destination.`,
    ));
  }
  return { columns, widths, heights, width, height, errors };
}

function normalizePresetList(value, sizeKey, maximum) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.flatMap((entry) => {
    if (
      !entry
      || !validIdentity(entry.id)
      || seen.has(entry.id)
      || typeof entry.label !== "string"
      || entry.label.trim() === ""
      || !validPresetSize(entry[sizeKey], sizeKey, maximum)
    ) return [];
    seen.add(entry.id);
    return [{
      id: entry.id,
      label: entry.label.trim(),
      [sizeKey]: entry[sizeKey],
      default: entry.default === true,
    }];
  });
}

function validPresetSize(value, sizeKey, maximum) {
  if (sizeKey === "rows") return isSupportedFootprintRowHeight(value);
  return Number.isInteger(value) && value >= 1 && value <= maximum;
}

function affectedNeighbours({ before, after, columns }) {
  const beforePositions = pack(before, columns);
  const afterPositions = pack(after, columns);
  return after
    .filter(({ draft }) => draft !== true)
    .filter(({ chart }) => !samePosition(beforePositions.get(chart.id), afterPositions.get(chart.id)))
    .map(({ chart }) => chart.id);
}

function pack(entries, columns) {
  const positions = new Map();
  let row = 0;
  let column = 0;
  let rowHeight = 1;
  for (const entry of entries) {
    const footprint = placementEntryFootprint(entry);
    const span = Math.min(footprint.columns, columns);
    if (column > 0 && column + span > columns) {
      row += rowHeight;
      column = 0;
      rowHeight = 1;
    }
    positions.set(entry.chart.id, { row, column, columns: span, rows: footprint.rows });
    column += span;
    rowHeight = Math.max(rowHeight, footprint.rows);
    if (column === columns) {
      row += rowHeight;
      column = 0;
      rowHeight = 1;
    }
  }
  return positions;
}

export function placementEntryFootprint(entry = {}) {
  const saved = resolveChartFootprint(entry?.chart?.layout);
  return {
    columns: Number.isInteger(entry?.width?.columns) && entry.width.columns > 0
      ? entry.width.columns
      : saved.columns,
    rows: isSupportedFootprintRowHeight(entry?.height?.rows)
      ? entry.height.rows
      : saved.rows,
  };
}

function samePosition(left, right) {
  return Boolean(left && right)
    && left.row === right.row
    && left.column === right.column
    && left.columns === right.columns
    && left.rows === right.rows;
}

function placementText({
  identity,
  position,
  anchor,
  anchorChartId,
  presetResult,
  projectedEntries,
  affectedNeighbourIds,
  savedEntries,
}) {
  const anchorLabel = anchor?.chart?.title ?? anchorChartId;
  const relation = position === "append"
    ? "append"
    : `${position} ${anchorLabel ?? "missing anchor"} (${String(anchorChartId)})`;
  const width = presetResult.width
    ? `${presetResult.width.label} (${presetResult.width.columns} ${plural(presetResult.width.columns, "column")})`
    : String(presetResult.width?.id ?? "unavailable");
  const height = presetResult.height
    ? `${presetResult.height.label} (${presetResult.height.rows} ${plural(presetResult.height.rows, "row")})`
    : String(presetResult.height?.id ?? "unavailable");
  const projectedOrder = projectedEntries
    ? projectedEntries.map(({ chart }) => chart.title ?? chart.id).join(", ")
    : "unavailable";
  const namesById = new Map(savedEntries.map(({ chart }) => [chart.id, chart.title ?? chart.id]));
  const affected = affectedNeighbourIds.length > 0
    ? affectedNeighbourIds.map((id) => namesById.get(id) ?? id).join(", ")
    : "none";
  return [
    `Page: ${identity.pageLabel ?? `Missing page (${String(identity.pageId)})`}.`,
    `Section: ${identity.sectionLabel ?? `Missing section (${String(identity.sectionId)})`}.`,
    `Placement: ${relation}.`,
    `Width: ${width}.`,
    `Height: ${height}.`,
    `Projected reading order: ${projectedOrder}.`,
    `Affected neighbours in projected reading order: ${affected}.`,
  ].join(" ");
}

function findSection(dashboard, pageId, sectionId) {
  const page = (dashboard?.pages ?? []).find(({ id }) => id === pageId);
  return page?.sections?.find(({ id }) => id === sectionId) ?? null;
}

function chartLocations(dashboard) {
  const locations = [];
  for (const page of dashboard?.pages ?? []) {
    for (const section of page?.sections ?? []) {
      for (const entry of panelEntries(section?.panels ?? [])) {
        locations.push({ pageId: page.id, sectionId: section.id, chart: entry.chart });
      }
    }
  }
  return locations;
}

function panelEntries(panels) {
  return panels.flatMap((panel) => {
    const chart = panel?.chart && typeof panel.chart === "object" ? panel.chart : panel;
    return validIdentity(chart?.id) ? [{ panel, chart, draft: false }] : [];
  });
}

function validIdentity(value) {
  return typeof value === "string" && value.trim() !== "";
}

function issue(code, message) {
  return { code, message, retryable: true };
}

function plural(value, word) {
  return value === 1 ? word : `${word}s`;
}

function revisionFor(prefix, value) {
  const source = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
