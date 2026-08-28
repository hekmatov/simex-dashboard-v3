import React from "react";

import { createOperationStatusQueue } from "../../lib/operationStatusQueue.js";

const OperationStatusContext = React.createContext(null);

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
  const value = React.useMemo(() => Object.freeze({
    beginOperation: queue.beginOperation,
    dismissOperation: queue.dismissOperation,
    snapshot,
  }), [queue, snapshot]);

  return (
    <OperationStatusContext.Provider value={value}>
      {children}
    </OperationStatusContext.Provider>
  );
}

export function useOperationStatus() {
  const value = React.useContext(OperationStatusContext);
  if (!value) throw new Error("Operation status must be used within OperationStatusProvider.");
  return value;
}
