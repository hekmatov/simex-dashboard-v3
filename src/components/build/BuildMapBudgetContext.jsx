import React from "react";

import { GEOJSON_CONCURRENT_MAPS } from "../../lib/geoJsonValidation.js";

const BuildMapBudgetContext = React.createContext(null);
const INACTIVE = Object.freeze({ status: "inactive", allocated: false, deferred: false });
const UNBOUNDED = Object.freeze({ status: "normal", allocated: true, deferred: false });

export function createBuildMapBudget() {
  const requests = new Map();
  const snapshots = new Map();
  const listeners = new Map();
  let sequence = 0;
  let activationSequence = 0;

  const notify = (ownerId) => {
    for (const listener of listeners.get(ownerId) ?? []) listener();
  };
  const recompute = () => {
    const active = [...requests.values()]
      .filter((request) => request.active)
      .sort((left, right) => (
        priority(left) - priority(right)
        || right.activation - left.activation
        || left.sequence - right.sequence
      ));
    const next = new Map();
    for (const request of requests.values()) {
      if (!request.active) next.set(request.ownerId, INACTIVE);
      else {
        const rank = active.findIndex(({ ownerId }) => ownerId === request.ownerId);
        const status = rank < GEOJSON_CONCURRENT_MAPS.normalMax
          ? "normal"
          : rank < GEOJSON_CONCURRENT_MAPS.eagerMax
          ? "degraded"
          : "deferred";
        next.set(request.ownerId, Object.freeze({
          status,
          allocated: status !== "deferred",
          deferred: status === "deferred",
        }));
      }
    }
    const ownerIds = new Set([...snapshots.keys(), ...next.keys()]);
    const changed = [];
    for (const ownerId of ownerIds) {
      const before = snapshots.get(ownerId) ?? INACTIVE;
      const after = next.get(ownerId) ?? INACTIVE;
      if (before.status !== after.status) changed.push(ownerId);
    }
    snapshots.clear();
    for (const [ownerId, snapshot] of next) snapshots.set(ownerId, snapshot);
    for (const ownerId of changed) notify(ownerId);
  };

  return Object.freeze({
    acquire(input) {
      const request = normalizeRequest(input);
      requests.set(request.ownerId, { ...request, sequence: sequence += 1, activation: 0 });
      recompute();
      let released = false;
      return () => {
        if (released) return false;
        released = true;
        requests.delete(request.ownerId);
        recompute();
        return true;
      };
    },
    activate(ownerId) {
      const request = requests.get(ownerId);
      if (!request?.active || snapshots.get(ownerId)?.allocated === true) return false;
      request.activation = activationSequence += 1;
      recompute();
      return snapshots.get(ownerId)?.allocated === true;
    },
    getSnapshot(ownerId) {
      return snapshots.get(ownerId) ?? INACTIVE;
    },
    subscribe(ownerId, listener) {
      const bucket = listeners.get(ownerId) ?? new Set();
      bucket.add(listener);
      listeners.set(ownerId, bucket);
      return () => {
        bucket.delete(listener);
        if (bucket.size === 0) listeners.delete(ownerId);
      };
    },
  });
}

export function BuildMapBudgetProvider({ children, enabled = true }) {
  const budgetRef = React.useRef(null);
  budgetRef.current ??= createBuildMapBudget();
  return React.createElement(
    BuildMapBudgetContext.Provider,
    { value: enabled ? budgetRef.current : null },
    children,
  );
}

export function useBuildMapBudgetSlot(input = {}) {
  const budget = React.useContext(BuildMapBudgetContext);
  const request = normalizeRequest(input, { allowInactive: true });
  React.useEffect(() => {
    if (!budget) return undefined;
    return budget.acquire(request);
  }, [budget, request.ownerId, request.kind, request.visible, request.active]);
  const snapshot = React.useSyncExternalStore(
    (listener) => budget?.subscribe(request.ownerId, listener) ?? (() => {}),
    () => budget?.getSnapshot(request.ownerId) ?? (request.active ? UNBOUNDED : INACTIVE),
    () => request.active ? UNBOUNDED : INACTIVE,
  );
  return React.useMemo(() => Object.freeze({
    ...snapshot,
    activate: () => budget?.activate(request.ownerId) ?? false,
  }), [budget, request.ownerId, snapshot]);
}

export function mapBudgetNotice(status) {
  return status === "degraded" ? "Additional live map — performance may be reduced." : "";
}

function normalizeRequest(input, { allowInactive = false } = {}) {
  const ownerId = typeof input?.ownerId === "string" ? input.ownerId.trim() : "";
  if (!ownerId && !allowInactive) throw new Error("Build map budget ownerId is required.");
  const kind = input?.kind === "dashboard" ? "dashboard" : input?.kind === "preview" ? "preview" : null;
  if (!kind && !allowInactive) throw new Error("Build map budget kind must be dashboard or preview.");
  return {
    ownerId: ownerId || "inactive-map",
    kind: kind ?? "preview",
    visible: input?.visible === true,
    active: input?.active === true,
  };
}

function priority(request) {
  if (request.kind === "dashboard" && request.visible) return 0;
  if (request.kind === "dashboard") return 1;
  if (request.visible) return 2;
  return 3;
}
