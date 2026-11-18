import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import { sceneMemberTimeRole } from "./sceneSchema.js";

/** Derive screen evidence only from resolved marks, never source date maxima. */
export function resolveChartTimeEvidence({ chart, profile, prepared, timeContext, cursorMode = timeContext?.mode ?? "live", scopeKind } = {}) {
  if (!timeContext) {
    if (cursorMode !== "at") return null;
    let schema;
    try { schema = getChartSchema(chart?.typeId); } catch { return null; }
    if (schema.authoringWorkflow === "static" || !schema.capabilities.timeSync || chart.presentation?.collection != null) return evidence("static", "Static snapshot");
    try {
      sceneMemberTimeRole(chart, {}, { [chart.sourceId]: profile });
      return scopeKind === "storyline" ? evidence("outside", "Outside Storyline time") : null;
    } catch {
      const declaredTemporal = schema.roles.some(role => role.accepts.includes("temporal") && bindings(chart.roles?.[role.id]).some(binding => binding?.interpretation === "temporal"));
      return declaredTemporal ? evidence("unavailable", "Time unavailable") : evidence("static", "Static snapshot");
    }
  }
  const active = prepared?.meta?.activeTime;
  if (!active) return evidence("unavailable", "Time matching unavailable");
  const marks = (prepared.marks ?? []).filter(mark => mark.active === true);
  if (!marks.length || active.status === "missing") {
    return evidence("missing", timeContext.showClosestOnExactMiss
      ? "No observations match this time setting" : "No measurement at this time");
  }
  const provenance = marks.map(mark => mark.temporalProvenance).filter(Boolean);
  const observationEpochs = [...new Set(provenance.flatMap(value => [value.sourceEpochMs, value.lowerEpochMs, value.upperEpochMs]).filter(Number.isFinite))].sort((a, b) => a - b);
  if (!observationEpochs.length) return evidence("unavailable", "Observation time unavailable");
  const range = observationEpochs.length === 1 ? instant(observationEpochs[0]) : `${instant(observationEpochs[0])}–${instant(observationEpochs.at(-1))}`;
  if (Number.isFinite(active.fallbackEpochMs)) return evidence("nonconcurrent", `Not concurrent · Observed ${range}`, observationEpochs, "nearest");
  const interpolated = provenance.some(value => value.status === "interpolated");
  if (interpolated) return evidence("interpolated", `Interpolated at ${instant(timeContext.activeEpochMs)} · Observations ${range}`, observationEpochs, "interpolate");
  const policy = timeContext.matching?.policy ?? "exact";
  const suffix = ({ lastKnown: " · last known", nearest: " · nearest", interpolate: " · interpolation policy" })[policy] ?? "";
  return evidence("observed", `${policy === "lastKnown" ? "As of" : "Observed"} ${range}${suffix}`, observationEpochs, policy);
}

function evidence(kind, label, observationEpochs = [], policy = null) { return Object.freeze({ kind, label, observationEpochs: Object.freeze(observationEpochs), policy }); }
function instant(epoch) { const iso = new Date(epoch).toISOString(); return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso; }
function bindings(value) { return Array.isArray(value) ? value : [value]; }
