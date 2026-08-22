import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const loaded = await nextLoad(url, { ...context, format: "module" });
    return { format: "module", source: loaded.source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
`)}`, import.meta.url);

const { default: ConfirmDialog } = await import(
  "../src/components/common/ConfirmDialog.jsx"
);
const { default: ChartConversionDialog } = await import(
  "../src/components/chart-authoring/ChartConversionDialog.jsx"
);
const { default: ChartWizardV3 } = await import(
  "../src/components/chart-authoring/ChartWizardV3.jsx"
);

test("modal containers remain programmatically focusable and confirmations mark the safe action", () => {
  const confirmation = renderToStaticMarkup(React.createElement(
    ConfirmDialog,
    {
      open: true,
      title: "Discard chart?",
      cancelLabel: "Continue editing",
    },
  ));
  const conversion = renderToStaticMarkup(React.createElement(
    ChartConversionDialog,
    {
      conversion: {
        plan: {
          kind: "compatible",
          sourceTypeId: "line",
          targetTypeId: "area",
          preservedRoles: {},
          removedSettings: [],
          requiredRoles: [],
        },
      },
    },
  ));
  const wizard = renderToStaticMarkup(React.createElement(ChartWizardV3, {
    open: true,
    dataSources: {},
    loadedData: {},
    chronoGroups: [],
    existingCharts: [],
  }));

  assert.match(confirmation, /role="dialog"[^>]*tabindex="-1"/);
  assert.match(
    confirmation,
    /data-modal-initial-focus="true"[^>]*>Continue editing<\/button>/,
  );
  assert.match(conversion, /role="dialog"[^>]*tabindex="-1"/);
  assert.match(wizard, /role="dialog"[^>]*tabindex="-1"/);
  assert.match(
    wizard,
    /data-modal-initial-focus="true"[^>]*aria-current="step"/,
  );
});
