import { chartPreparationIdentity } from "./chartPreparationIdentity.js";
import { compileChartRuntimeArtifact } from "./chartRuntimeArtifact.js";
import { collectTemporalAvailability } from "../time/temporalAvailability.js";

export function compileAuthoredChartRuntimeArtifact({
  chart,
  prepared,
  source,
  profile,
  geoSource = null,
  temporalAvailability,
  timeSyncGroups = [],
  rows = [],
  timezone = "UTC",
} = {}) {
  const identity = chartPreparationIdentity({ chart, source, profile, geoSource });
  const availability = temporalAvailability ?? collectAuthoredAvailability({
    chart,
    timeSyncGroups,
    rows,
    profile,
    timezone,
  });
  return compileChartRuntimeArtifact({
    identity,
    chart,
    source,
    prepared,
    temporalAvailability: availability,
  });
}

function collectAuthoredAvailability({ chart, timeSyncGroups, rows, profile, timezone }) {
  const epochs = new Set();
  for (const group of timeSyncGroups ?? []) {
    const member = group?.members?.find(({ chartId }) => chartId === chart.id);
    if (!member) continue;
    for (const epochMs of collectTemporalAvailability({
      chart,
      member,
      rows,
      profile,
      period: group.period,
      timezone,
    })) epochs.add(epochMs);
  }
  return Object.freeze([...epochs].sort((left, right) => left - right));
}
