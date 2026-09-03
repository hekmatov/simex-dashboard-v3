const CANDIDATE_SIGNALS = new Set([
  "named-structure", "toolbar-navigation", "sticky-fixed", "distinct-paint", "multi-action",
  "dialog", "drawer", "menu", "status", "table", "chart-cell",
]);

const failure = (type, details) => Object.freeze({ type, ...details });

export function isDashboardRegionCandidate({ signals = [] } = {}) {
  return signals.some((signal) => CANDIDATE_SIGNALS.has(signal));
}

export function classifyDashboardRegionClosure({
  journeyId,
  registry = [],
  candidates = [],
  mountedRegions = [],
  knownJourneyIds = [],
} = {}) {
  const failures = [];
  const registered = new Map(registry.map((region) => [region.id, region]));
  const mountedById = new Map();
  for (const mounted of mountedRegions) {
    const instances = mountedById.get(mounted.regionId) ?? [];
    instances.push(mounted);
    mountedById.set(mounted.regionId, instances);
  }
  const knownJourneys = new Set(knownJourneyIds);

  for (const region of registry) {
    const witnesses = Array.isArray(region.witnesses) ? region.witnesses : [];
    if (!witnesses.length || witnesses.some((witness) => !knownJourneys.has(witness))) {
      failures.push(failure("UNWITNESSED", { regionId: region.id }));
    }
    if (witnesses.includes(journeyId) && !mountedById.has(region.id)) {
      failures.push(failure("MISSING", { regionId: region.id }));
    }
  }

  for (const [regionId, mounted] of mountedById) {
    const region = registered.get(regionId);
    if (!region) continue;
    for (const instance of mounted) {
      if (
        instance.role !== region.role
        || instance.material !== region.material
        || (region.styleWitnessRequired !== false && !String(instance.styleSignature ?? "").trim())
      ) {
        failures.push(failure("UNSTYLED", { regionId }));
        break;
      }
    }
  }

  for (const candidate of candidates.filter(isDashboardRegionCandidate)) {
    if (candidate.exemption?.owner && candidate.exemption?.reason) continue;
    const containing = (candidate.containingRegions ?? [])
      .filter(({ regionId }) => registered.has(regionId))
      .sort((left, right) => left.distance - right.distance);
    const exact = containing.filter(({ distance }) => distance === 0);
    const nearestDistance = containing[0]?.distance;
    const nearest = containing.filter(({ distance }) => distance === nearestDistance);
    const owners = candidate.requiresOwnBoundary ? exact : nearest;
    if (!owners.length) {
      failures.push(failure("UNOWNED", { candidateId: candidate.id }));
    } else if (owners.length > 1) {
      failures.push(failure("AMBIGUOUS", { candidateId: candidate.id }));
    }
  }

  return Object.freeze({
    journeyId,
    failures: Object.freeze(failures),
  });
}
