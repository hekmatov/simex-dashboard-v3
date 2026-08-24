import React from "react";
import { createRoot } from "react-dom/client";

import ChartView from "../../src/components/charts/ChartView.jsx";
import FreeTextSourceEditor from "../../src/components/static-content/FreeTextSourceEditor.jsx";
import "../../src/styles/tokens.css";
import "../../src/styles.css";
import "../../src/styles/static-content.css";

const root = createRoot(document.querySelector("#root"));

function EditorHarness({ initialSource }) {
  const [source, setSource] = React.useState(initialSource);
  const [validation, setValidation] = React.useState(null);
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <FreeTextSourceEditor
        id="harness-qmd"
        value={source}
        panelId="editor-panel"
        onChange={setSource}
        onValidationChange={setValidation}
      />
      <output data-validation-ok={validation?.ok === true ? "true" : "false"}>
        {validation?.errors?.length ?? 0} blocking errors
      </output>
    </form>
  );
}

function RoutedHarness({ source }) {
  const chart = {
    id: "situation-panel",
    typeId: "freeText",
    title: "Operational situation",
    description: "Shared narrative context.",
    sourceId: "situation-source",
    roles: {},
    transformations: { filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap" },
    presentation: { title: { align: "left" }, background: { transparent: true } },
    interaction: { zoom: { enabled: false } },
  };
  const props = {
    chart,
    rows: undefined,
    sourceState: { status: "loading" },
    datasetProfile: undefined,
    renderContext: { sources: { "situation-source": source } },
    timeContext: { groupId: "must-be-ignored", activeEpochMs: 1 },
  };
  return (
    <div className="harness-routed-views">
      <section data-harness-mode="active"><ChartView {...props} interactionMode="active" /></section>
      <section data-harness-mode="passive"><ChartView {...props} interactionMode="passive" /></section>
    </div>
  );
}

window.mountFreeTextEditor = (initialSource) => {
  root.render(<EditorHarness initialSource={initialSource} />);
};
window.mountRoutedFreeText = (qmd) => {
  root.render(<RoutedHarness source={{
    kind: "staticText",
    sourceVersion: 1,
    revision: 1,
    renderingPolicy: "portable-qmd-v1",
    qmd,
  }} />);
};
window.freeTextHarnessReady = true;
