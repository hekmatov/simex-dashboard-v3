import React from "react";

import { createOperationStatusQueue } from "../../lib/operationStatusQueue.js";

const OperationStatusContext = React.createContext(null);

export default function OperationStatusProvider({ children, queue: suppliedQueue = null }) {
  const queueRef = React.useRef(null);
  if (queueRef.current === null) {
    queueRef.current = suppliedQueue ?? createOperationStatusQueue();
  }
  const queue = queueRef.current;
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
