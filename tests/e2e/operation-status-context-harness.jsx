import React from "react";
import { createRoot } from "react-dom/client";

import OperationStatusProvider, {
  useOperationStatus,
} from "/src/components/app-shell/OperationStatusProvider.jsx";
import { createOperationStatusQueue } from "/src/lib/operationStatusQueue.js";

const queue = createOperationStatusQueue();
window.__statusHarness = {
  actionsRenders: 0,
  snapshotRenders: 0,
};

function ActionsConsumer() {
  const { reportActivity } = useOperationStatus();
  window.__statusHarness.actionsRenders += 1;
  return (
    <button
      type="button"
      onClick={() => reportActivity({
        key: "harness-activity",
        label: "Harness activity",
        message: "Layout updated",
      })}
    >
      Report activity
    </button>
  );
}

function SnapshotObserver() {
  const snapshot = React.useSyncExternalStore(
    queue.subscribe,
    queue.getSnapshot,
    queue.getSnapshot,
  );
  window.__statusHarness.snapshotRenders += 1;
  return <output data-status-count>{snapshot.notices.length}</output>;
}

createRoot(document.getElementById("root")).render(
  <OperationStatusProvider queue={queue}>
    <ActionsConsumer />
    <SnapshotObserver />
  </OperationStatusProvider>,
);
