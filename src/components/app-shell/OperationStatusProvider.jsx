import React from "react";

import { createOperationStatusQueue } from "../../lib/operationStatusQueue.js";

const OperationStatusActionsContext = React.createContext(null);
const OperationStatusSnapshotContext = React.createContext(null);

export function createOperationStatusProviderQueueOwner({
  suppliedQueue = null,
  createQueue = createOperationStatusQueue,
} = {}) {
  const owned = suppliedQueue === null;
  const queue = owned ? createQueue() : suppliedQueue;
  return Object.freeze({
    queue,
    dispose() {
      if (owned) queue.dispose();
    },
  });
}

export default function OperationStatusProvider({ children, queue: suppliedQueue = null }) {
  const ownerRef = React.useRef(null);
  if (ownerRef.current === null) {
    ownerRef.current = createOperationStatusProviderQueueOwner({ suppliedQueue });
  }
  const owner = ownerRef.current;
  const queue = owner.queue;
  React.useEffect(() => () => owner.dispose(), [owner]);
  const snapshot = React.useSyncExternalStore(
    queue.subscribe,
    queue.getSnapshot,
    queue.getSnapshot,
  );
  const actions = React.useMemo(() => Object.freeze({
    beginOperation: queue.beginOperation,
    reportActivity: queue.reportActivity,
    dismissOperation: queue.dismissOperation,
  }), [queue]);

  return (
    <OperationStatusActionsContext.Provider value={actions}>
      <OperationStatusSnapshotContext.Provider value={snapshot}>
        {children}
      </OperationStatusSnapshotContext.Provider>
    </OperationStatusActionsContext.Provider>
  );
}

export function useOperationStatusActions() {
  const value = React.useContext(OperationStatusActionsContext);
  if (!value) throw new Error("Operation status must be used within OperationStatusProvider.");
  return value;
}

export function useOperationStatusSnapshot() {
  const value = React.useContext(OperationStatusSnapshotContext);
  if (!value) throw new Error("Operation status must be used within OperationStatusProvider.");
  return value;
}

export function useOperationStatus() {
  return useOperationStatusActions();
}
