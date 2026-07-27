import React from "react";
import { createRoot } from "react-dom/client";

import ChartConversionDialog from "../../src/components/chart-authoring/ChartConversionDialog.jsx";
import ChartWizardV3 from "../../src/components/chart-authoring/ChartWizardV3.jsx";
import ConfirmDialog from "../../src/components/common/ConfirmDialog.jsx";
import ModalFocusScope from "../../src/components/common/ModalFocusScope.jsx";

const activeDocumentKeydownListeners = new Set();
let documentKeydownAdds = 0;
let documentKeydownRemoves = 0;
let backgroundActivations = 0;
const nativeAddEventListener = EventTarget.prototype.addEventListener;
const nativeRemoveEventListener = EventTarget.prototype.removeEventListener;

EventTarget.prototype.addEventListener = function addHarnessListener(
  type,
  listener,
  options,
) {
  if (type === "keydown" && this === document) {
    documentKeydownAdds += 1;
    activeDocumentKeydownListeners.add(listener);
  }
  return nativeAddEventListener.call(this, type, listener, options);
};

EventTarget.prototype.removeEventListener = function removeHarnessListener(
  type,
  listener,
  options,
) {
  if (type === "keydown" && this === document) {
    documentKeydownRemoves += 1;
    activeDocumentKeydownListeners.delete(listener);
  }
  return nativeRemoveEventListener.call(this, type, listener, options);
};

window.__modalFocusHarness = {
  snapshot() {
    return {
      activeDocumentKeydownListeners: activeDocumentKeydownListeners.size,
      backgroundActivations,
      documentKeydownAdds,
      documentKeydownRemoves,
    };
  },
};

const conversion = {
  plan: {
    kind: "compatible",
    sourceTypeId: "line",
    targetTypeId: "area",
    preservedRoles: {
      measurements: [{ field: "capacity", axis: "primary" }],
      observation: {
        field: "observed",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    removedSettings: [],
    requiredRoles: [],
  },
  roleFields: [],
  roleAssignments: {},
  playback: {
    selectable: true,
    options: [{
      roleId: "observation",
      label: "Observation time",
    }],
    selection: {
      mode: "role",
      roleId: "observation",
    },
  },
  timeSyncConsequence: {
    kind: "preserve",
    targetLabel: "Observation time",
  },
};

function Harness() {
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [conversionOpen, setConversionOpen] = React.useState(false);
  const [emptyOpen, setEmptyOpen] = React.useState(false);

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "button",
      {
        id: "open-wizard",
        type: "button",
        onClick: () => setWizardOpen(true),
      },
      "Open chart wizard",
    ),
    React.createElement(
      "button",
      {
        id: "open-reset",
        type: "button",
        onClick: () => setResetOpen(true),
      },
      "Reset edits",
    ),
    React.createElement(
      "button",
      {
        id: "open-conversion",
        type: "button",
        onClick: () => setConversionOpen(true),
      },
      "Open conversion",
    ),
    React.createElement(
      "button",
      {
        id: "background-action",
        type: "button",
        onClick: () => {
          backgroundActivations += 1;
        },
      },
      "Background action",
    ),
    React.createElement(
      "button",
      {
        id: "open-empty",
        type: "button",
        onClick: () => setEmptyOpen(true),
      },
      "Open empty dialog",
    ),
    React.createElement(ChartWizardV3, {
      open: wizardOpen,
      dataSources: {},
      loadedData: {},
      timeSyncGroups: [],
      existingCharts: [],
      onClose: () => setWizardOpen(false),
      onCreate() {},
    }),
    React.createElement(ConfirmDialog, {
      open: resetOpen,
      title: "Reset edits?",
      message: "Your unsaved changes will be lost.",
      confirmLabel: "Reset",
      cancelLabel: "Keep editing",
      onConfirm: () => setResetOpen(false),
      onCancel: () => setResetOpen(false),
    }),
    React.createElement(ChartConversionDialog, {
      conversion: conversionOpen ? conversion : null,
      columns: [
        { name: "observed", type: "temporal" },
        { name: "capacity", type: "numeric" },
      ],
      onRoleAssignment() {},
      onPlaybackSelection() {},
      onConfirm: () => setConversionOpen(false),
      onCancel: () => setConversionOpen(false),
    }),
    emptyOpen
      ? React.createElement(
          ModalFocusScope,
          {
            as: "div",
            open: emptyOpen,
            className: "empty-modal",
            role: "dialog",
            "aria-modal": "true",
            "aria-label": "Empty modal",
            onEscape: () => setEmptyOpen(false),
          },
          React.createElement("p", null, "Nothing to choose."),
        )
      : null,
  );
}

createRoot(document.getElementById("root")).render(
  React.createElement(Harness),
);
