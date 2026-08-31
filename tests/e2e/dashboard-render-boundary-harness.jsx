import React from "react";
import { createRoot } from "react-dom/client";

import DashboardCanvas from "/src/components/dashboard/DashboardCanvas.jsx";

window.IntersectionObserver = class IntersectionObserver {
  observe() {}
  disconnect() {}
};

window.__dashboardRenderHarness = {
  reads: { "chart-a": 0, "chart-b": 0 },
  sectionReads: { "section-a": 0, "section-b": 0, "section-c": 0 },
};

function countedChart(id, title) {
  const chart = {
    id,
    typeId: "freeText",
    sourceId: `${id}-source`,
    roles: {},
    layout: { size: "medium" },
  };
  Object.defineProperty(chart, "title", {
    enumerable: true,
    get() {
      window.__dashboardRenderHarness.reads[id] += 1;
      return title;
    },
  });
  return chart;
}

function countedSection(id, title, panels) {
  const section = { id, panels };
  Object.defineProperty(section, "title", {
    enumerable: true,
    get() {
      window.__dashboardRenderHarness.sectionReads[id] += 1;
      return title;
    },
  });
  return section;
}

function copySectionWithPanels(section, panels) {
  const copy = Object.create(Object.getPrototypeOf(section));
  Object.defineProperties(copy, Object.getOwnPropertyDescriptors(section));
  Object.defineProperty(copy, "panels", { configurable: true, enumerable: true, value: panels });
  return copy;
}

const placementA = { id: "placement-a", chart: countedChart("chart-a", "Chart A") };
const placementB = { id: "placement-b", chart: countedChart("chart-b", "Chart B") };
const initialDashboard = {
  id: "render-harness",
  pages: [{
    id: "page-a",
    label: "Page A",
    sections: [
      countedSection("section-a", "Section A", [placementA, placementB]),
      countedSection("section-b", "Section B", []),
      countedSection("section-c", "Section C", []),
    ],
  }],
  dataSources: {},
  loadedData: {},
  datasetProfiles: {},
  assets: {},
  globalStyles: {},
};

const handlers = Object.freeze({
  onSelect() {},
  onRemovePanel() {},
  onPanelDragStart() {},
  onPanelDragOver() {},
  onPanelDrop() {},
  onPanelDragEnd() {},
  onRequestPanelMove() {},
  onReorderSection() {},
  onStructureCommand() {},
  onAddPage() {},
  onAddSection() {},
  onAddChart() {},
  onAddStaticContent() {},
});
const contentRenderContext = Object.freeze({});
const geoDataSources = Object.freeze({});

function Harness() {
  const [dashboard, setDashboard] = React.useState(initialDashboard);
  const [selection, setSelection] = React.useState(null);
  const activePage = dashboard.pages[0];
  const buildState = {
    selection,
    disabled: false,
    sectionDrafts: {},
    draggingPanelId: null,
    dragOverPanelId: null,
    ...handlers,
  };
  function moveChartA() {
    setDashboard((current) => {
      const page = current.pages[0];
      const source = page.sections[0];
      const destination = page.sections[1];
      return {
        ...current,
        pages: [{
          ...page,
          sections: [
            copySectionWithPanels(source, source.panels.filter(({ id }) => id !== "placement-a")),
            copySectionWithPanels(destination, [placementA]),
            page.sections[2],
          ],
        }],
      };
    });
  }
  function reorderSections() {
    setDashboard((current) => {
      const page = current.pages[0];
      return { ...current, pages: [{ ...page, sections: [page.sections[1], page.sections[0], page.sections[2]] }] };
    });
  }
  return (
    <>
      <div>
        <button type="button" onClick={() => setSelection({ kind: "chart", pageId: "page-a", sectionId: "section-a", placementId: "placement-a" })}>
          Select chart A
        </button>
        <button type="button" onClick={moveChartA}>Move chart A</button>
        <button type="button" onClick={reorderSections}>Reorder sections</button>
      </div>
      <DashboardCanvas
        activePage={activePage}
        dashboard={dashboard}
        contentRenderContext={contentRenderContext}
        surface="build"
        buildState={buildState}
        displayState={null}
        geoDataSources={geoDataSources}
      />
    </>
  );
}

createRoot(document.getElementById("root")).render(<Harness />);
