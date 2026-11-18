import Papa from "papaparse";
import { parseDashboardBundle, serializeDashboardBundle, normalizeDashboardBoundary } from "../../src/charting/config/dashboardBundleV3.js";
import { prepareDashboardPackageExport } from "../../src/lib/dashboardPackageExport.js";
import { resolveDashboardPackageSelection, dashboardPackageSectionKey } from "../../src/lib/dashboardPackageSelection.js";
import { removeTemporalChartReferences } from "../../src/charting/time/storylineReferences.js";
import { bindingList, bindingField, resolveEffectiveBinding } from "../../src/charting/data/bindings.js";
import { parseTemporalValue } from "../../src/charting/data/temporal.js";
import { profileDataset } from "../../src/charting/data/profileDataset.js";
import { parseCsvText } from "../../src/lib/loadCsv.js";
import { sha256HexSync } from "../../src/static-content/assets/assetPayloadEnvelope.js";

export const REHEARSAL_CUTOFFS = Object.freeze(["2027-03-31", "2027-05-31", "2027-08-15"]);
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const hash = bytes => sha256HexSync(bytes);
export const rehearsalJsonBytes = value => encoder.encode(`${JSON.stringify(value, null, 2)}\n`);
const charts = config => config.pages.flatMap(page => page.sections.flatMap(section => section.panels.map(panel => panel.chart ?? panel)));
const pick = (record, keys) => Object.fromEntries([...keys].sort().filter(key => Object.hasOwn(record ?? {}, key)).map(key => [key, record[key]]));

function releaseAuthority(policy, kind, id, cutoff) {
  const rule = policy?.[kind]?.[id];
  if (!rule) return false;
  if (typeof rule.evidence !== "string" || !rule.evidence.trim()) throw new Error(`Release authority for ${kind}.${id} needs an actual human-evidence reference.`);
  const parsed = parseTemporalValue(rule.releaseDate, { format: "YYYY-MM-DD" });
  if (!parsed.ok) throw new Error(`Release authority for ${kind}.${id} needs a valid releaseDate.`);
  return parsed.canonical <= cutoff;
}

function temporalRules(config, sourceId, source, rows) {
  const rules = new Map(Object.entries(source.parsingMetadata ?? {}).filter(([, rule]) => rule.interpretation === "temporal"));
  const conflicts = new Set();
  const columns = new Map();
  const columnFor = field => {
    if (!columns.has(field)) columns.set(field, profileDataset(rows.map(row => ({ [field]: row[field] })), {
      [field]: source.parsingMetadata?.[field] ?? {},
    }).columns.find(column => column.name === field));
    return columns.get(field);
  };
  for (const chart of charts(config).filter(chart => chart.sourceId === sourceId)) {
    for (const bindings of Object.values(chart.roles ?? {})) for (const binding of bindingList(bindings)) {
      const field = bindingField(binding);
      const effective = resolveEffectiveBinding(binding, columnFor(field));
      if (effective.type !== "temporal") continue;
      const previous = rules.get(field) ?? {};
      const temporal = effective.temporal ?? {};
      if (previous.format && temporal.format && previous.format !== temporal.format) conflicts.add(field);
      if (previous.timezone && temporal.timezone && previous.timezone !== temporal.timezone) conflicts.add(field);
      rules.set(field, { ...previous, ...temporal, interpretation: "temporal" });
    }
  }
  return { rules, conflicts: [...conflicts].sort() };
}

function sourceRows(source, sourceId) {
  if (source.kind === "inline") return source.rows;
  if (source.type === "uploadedCsv") return parseCsvText(source.csvText, sourceId);
  return null;
}

function filterSource(config, sourceId, source, cutoff, policy) {
  const rows = sourceRows(source, sourceId);
  const authorized = () => releaseAuthority(policy, "sources", sourceId, cutoff);
  if (!rows) return authorized()
    ? { source: structuredClone(source), disposition: "explicit-static-release", omittedRows: [] }
    : { source: null, disposition: "undated-static-source-needs-review", omittedRows: [] };
  if (rows.some(row => typeof row?.src === "string" && !/^data:image\//.test(row.src))) {
    return { source: null, disposition: "uncontained-media-needs-review", omittedRows: [] };
  }
  const { rules, conflicts } = temporalRules(config, sourceId, source, rows);
  if (conflicts.length) return { source: null, disposition: "conflicting-temporal-authority", fields: conflicts, omittedRows: rows.map((_, index) => ({ index, reason: "conflicting-temporal-authority" })) };
  if (!rules.size) return authorized()
    ? { source: structuredClone(source), rows, disposition: "explicit-static-release", omittedRows: [] }
    : { source: null, disposition: "undated-snapshot-needs-review", omittedRows: rows.map((_, index) => ({ index, reason: "undated" })) };
  const retained = [], omittedRows = [];
  const cutoffEpoch = Date.parse(`${cutoff}T23:59:59.999Z`);
  rows.forEach((row, index) => {
    const invalid = [], future = [];
    for (const [field, rule] of rules) {
      const parsed = parseTemporalValue(row[field], rule);
      if (!parsed.ok) { invalid.push(field); continue; }
      // A year-only observation may describe the whole year: do not publish
      // an annual statistic merely because its parser normalizes to January 1.
      const yearOnly = rule.format === "YYYY" || /^\d{4}$/.test(String(row[field]).trim());
      const epoch = yearOnly
        ? Date.parse(`${parsed.canonical.slice(0, 4)}-12-31T23:59:59.999Z`)
        : Date.parse(parsed.canonical);
      if (epoch > cutoffEpoch) future.push(field);
    }
    if (invalid.length || future.length) omittedRows.push({ index, reason: invalid.length ? "ambiguous-or-undated" : "after-publication-cutoff", fields: invalid.length ? invalid : future });
    else retained.push(row);
  });
  if (!retained.length) return { source: null, disposition: "no-released-rows", omittedRows };
  const next = structuredClone(source);
  if (next.kind === "inline") next.rows = retained;
  else next.csvText = Papa.unparse(retained, { newline: "\n" });
  delete next.fingerprint;
  delete next.sourceFingerprint;
  return { source: next, rows: retained, disposition: "temporal-filter", fields: [...rules.keys()], omittedRows };
}

/** Native parser/normalizer owns version support; V7 is admitted when it is. */
export async function prepareRehearsalInput({ inputBytes, expectedInputSha256, readers = {}, staticReleases = {} }) {
  if (!(inputBytes instanceof Uint8Array)) throw new TypeError("Original inputBytes must be Uint8Array.");
  const inputSha256 = hash(inputBytes);
  if (!/^[a-f0-9]{64}$/.test(expectedInputSha256 ?? "") || inputSha256 !== expectedInputSha256) throw new Error("Input SHA-256 does not match the explicitly selected input identity.");
  if (Object.keys(staticReleases).length && staticReleases.inputSha256 !== inputSha256) throw new Error("Static release authority must identify these exact input bytes.");
  const text = decoder.decode(inputBytes).replace(/^\uFEFF/, "");
  const input = JSON.parse(text);
  let envelope;
  if (input.bundleType) envelope = parseDashboardBundle(text, { includeEnvelope: true });
  else {
    if (![6, 7].includes(input.configVersion)) throw new Error("Rehearsal preparation requires a native dashboard config 6/7 or supported bundle.");
    const normalized = normalizeDashboardBoundary(input);
    const exported = await prepareDashboardPackageExport(normalized, readers);
    envelope = parseDashboardBundle(JSON.stringify(serializeDashboardBundle(exported.config, { assetPayloads: exported.assetPayloads })), { includeEnvelope: true });
  }
  if (charts(envelope.config).some(chart => chart.configVersion !== 3)) throw new Error("Only native chart V3 is supported.");
  for (const key of Object.keys(staticReleases)) if (!["inputSha256", "sources", "media"].includes(key)) throw new Error(`Unknown static release authority field ${key}.`);
  for (const [kind, available] of [["sources", envelope.config.dataSources], ["media", envelope.config.contentLibrary?.mediaItems ?? {}]]) {
    const entries = staticReleases[kind] ?? {};
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) throw new Error(`Static release ${kind} must be a record.`);
    for (const [id, rule] of Object.entries(entries)) {
      if (!Object.hasOwn(available, id)) throw new Error(`Static release ${kind}.${id} does not exist in this input.`);
      if (!rule || typeof rule !== "object" || Array.isArray(rule) || Object.keys(rule).some(key => !["releaseDate", "evidence"].includes(key))) throw new Error(`Static release ${kind}.${id} requires only releaseDate and evidence.`);
      releaseAuthority(staticReleases, kind, id, REHEARSAL_CUTOFFS.at(-1));
    }
  }
  return { envelope, inputSha256, inputBytes: new Uint8Array(inputBytes), staticReleases };
}

export function buildRehearsalPhase({ prepared, cutoff, appVersion }) {
  if (!REHEARSAL_CUTOFFS.includes(cutoff)) throw new Error("Use one of the three accepted rehearsal cutoffs.");
  if (typeof appVersion !== "string" || !appVersion.trim()) throw new Error("App version is required.");
  let config = structuredClone(prepared.envelope.config);
  const report = { sources: [], omittedCharts: [], detachedDrills: [], omittedMediaIds: [], omittedAssetIds: [] };
  const filtered = {}, rowsBySource = {};
  const originalUses = resolveDashboardPackageSelection(prepared.envelope, {
    sectionIds: config.pages.flatMap(page => page.sections.map(section => dashboardPackageSectionKey(page.id, section.id))),
  });
  for (const sourceId of Object.keys(config.dataSources).sort()) {
    if (!originalUses.sourceIds.includes(sourceId)) {
      report.sources.push({ sourceId, disposition: "unused-source-omitted", retainedRowCount: 0, omittedRows: [] });
      continue;
    }
    const result = filterSource(config, sourceId, config.dataSources[sourceId], cutoff, prepared.staticReleases);
    report.sources.push({ sourceId, disposition: result.disposition, ...(result.fields ? { temporalFields: result.fields } : {}), retainedRowCount: result.rows?.length ?? null, omittedRows: result.omittedRows });
    if (result.source) { filtered[sourceId] = result.source; if (result.rows) rowsBySource[sourceId] = result.rows; }
  }
  const approvedMedia = new Set(Object.entries(config.contentLibrary?.mediaItems ?? {}).filter(([id, item]) =>
    item.current.kind === "asset" && releaseAuthority(prepared.staticReleases, "media", id, cutoff)).map(([id]) => id));
  const missingCharts = [];
  for (const page of config.pages) for (const section of page.sections) {
    section.panels = section.panels.filter(panel => {
      const chart = panel.chart ?? panel;
      let reason = !filtered[chart.sourceId] ? "source-omitted" : chart.presentation?.map?.geoSource && !filtered[chart.presentation.map.geoSource] ? "map-source-omitted" : null;
      if (!reason) {
        const selected = resolveDashboardPackageSelection(prepared.envelope, { placementIds: [panel.id] });
        if (selected.mediaIds.some(id => !approvedMedia.has(id))) reason = "unreleased-or-uncontained-media";
      }
      if (!reason) return true;
      missingCharts.push(chart.id); report.omittedCharts.push({ chartId: chart.id, placementId: panel.id, sourceId: chart.sourceId, reason }); return false;
    });
  }
  config = removeTemporalChartReferences(config, missingCharts);
  const surviving = new Set(charts(config).map(chart => chart.id));
  for (const page of config.pages) for (const section of page.sections) for (const panel of section.panels) if (panel.drill) {
    const retained = panel.drill.kind === "chart" ? surviving.has(panel.drill.chartId) : page.sections.some(target => target.id === panel.drill.sectionId && target.panels.length);
    if (!retained) { report.detachedDrills.push({ placementId: panel.id, ...panel.drill }); delete panel.drill; }
  }
  const selection = resolveDashboardPackageSelection({ ...prepared.envelope, config }, {
    sectionIds: config.pages.flatMap(page => page.sections.map(section => dashboardPackageSectionKey(page.id, section.id))),
  });
  config.dataSources = pick(filtered, selection.sourceIds);
  config.datasetProfiles = Object.fromEntries(Object.keys(config.dataSources).filter(id => rowsBySource[id]).sort().map(id => {
    // Papa's native dynamic typing can return Date examples for ISO instants.
    // Existing generated profiles cross a JSON file boundary; apply that same
    // plain-data projection before the native structural serializer sees them.
    const profile = JSON.parse(JSON.stringify(profileDataset(rowsBySource[id], config.dataSources[id].parsingMetadata ?? {})));
    // Rebuild from retained rows; never copy future examples/ranges/diagnostics.
    config.dataSources[id].fingerprint = profile.fingerprint;
    config.dataSources[id].sourceFingerprint = profile.fingerprint;
    return [id, profile];
  }));
  config.contentLibrary.sourceEntries = pick(config.contentLibrary.sourceEntries, selection.sourceIds);
  config.contentLibrary.mediaItems = pick(config.contentLibrary.mediaItems, selection.mediaIds);
  config.assets = pick(config.assets, selection.assetIds);
  const assetPayloads = pick(prepared.envelope.assetPayloads, selection.assetIds);
  report.omittedMediaIds = Object.keys(prepared.envelope.config.contentLibrary?.mediaItems ?? {}).filter(id => !selection.mediaIds.includes(id)).sort();
  report.omittedAssetIds = Object.keys(prepared.envelope.config.assets ?? {}).filter(id => !selection.assetIds.includes(id)).sort();
  const bundle = serializeDashboardBundle(config, { now: null, assetPayloads });
  const bundleBytes = rehearsalJsonBytes(bundle);
  const manifest = {
    factory: "simex-rehearsal-packages", manifestVersion: 1, appVersion,
    inputSha256: prepared.inputSha256, publicationCutoff: `${cutoff}T23:59:59.999Z`,
    publicationCutoffIsExerciseTime: false, exerciseTime: bundle.config.scenario?.exerciseTime ?? null,
    bundleType: bundle.bundleType, bundleVersion: bundle.version, configVersion: bundle.config.configVersion,
    bundleSha256: hash(bundleBytes), bundleFile: "dashboard-bundle.json",
    humanReleaseReviewRequired: true,
  };
  report.unusedSourceIds = Object.keys(filtered).filter(id => !selection.sourceIds.includes(id)).sort();
  report.reviewBoundary = "Rows/assets are physically excluded. Retained authored text, titles, provenance, source interpretation and Storyline communication still require human release review; this utility does not approve them.";
  return { cutoff, bundleBytes, manifest, report };
}
