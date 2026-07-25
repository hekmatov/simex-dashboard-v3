import React from "react";

import { PanelBody } from "./ChartPanel.jsx";

export default function FullscreenDisplay({
  dashboard,
  displayState,
  globalPanelColors,
  onDisplayAction,
}) {
  const panelIds = displayState.displayed_chart_ids;
  const panels = panelIds
    .map((panelId) => findPanel(dashboard, panelId))
    .filter(Boolean);
  if (panels.length === 0) {
    return null;
  }

  const layoutOptions = multiLayoutOptions(panels.length);
  const resolvedLayout = layoutOptions.some(
    (option) => option.value === displayState.layout,
  )
    ? displayState.layout
    : layoutOptions[0].value;

  return (
    <div
      className="fullscreen-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Displayed charts"
    >
      <article className={`multi-fullscreen-panel multi-fullscreen-${resolvedLayout}`}>
        <div className="multi-fullscreen-controls">
          <div className="multi-fullscreen-title">
            <strong>Displayed charts</strong>
          </div>
          {layoutOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={resolvedLayout === option.value ? "active" : "secondary"}
              onClick={() =>
                onDisplayAction({
                  type: "layout_changed",
                  layout: option.value,
                })
              }
              aria-label={`Use ${option.label.toLowerCase()} layout`}
              title={option.label}
            >
              {option.icon}
            </button>
          ))}
          <button
            type="button"
            className="secondary"
            onClick={() => onDisplayAction({ type: "manual_close_all" })}
            aria-label="Close all displayed charts"
          >
            Close all
          </button>
        </div>
        <div
          className={`multi-fullscreen-grid multi-count-${panels.length} layout-${resolvedLayout}`}
        >
          {panels.map((panel, index) => (
            <section
              className={`multi-fullscreen-cell multi-cell-${index + 1}`}
              key={panel.id}
              data-displayed-chart-id={panel.id}
            >
              <div className="multi-cell-controls">
                <strong>{index + 1}</strong>
                {panels.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="secondary"
                      disabled={index === 0}
                      onClick={() =>
                        onDisplayAction({
                          type: "manual_reorder",
                          chart_ids: moveItem(panelIds, index, index - 1),
                        })
                      }
                      aria-label={`Move ${panel.id} previous`}
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={index === panels.length - 1}
                      onClick={() =>
                        onDisplayAction({
                          type: "manual_reorder",
                          chart_ids: moveItem(panelIds, index, index + 1),
                        })
                      }
                      aria-label={`Move ${panel.id} next`}
                    >
                      Next
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    onDisplayAction({
                      type: "manual_close",
                      chart_id: panel.id,
                    })
                  }
                  aria-label={`Close ${panel.id}`}
                >
                  Close
                </button>
              </div>
              <PanelBody
                panel={panel}
                globalPanelColors={globalPanelColors}
                data={dashboard.loadedData[panel.dataSource] ?? []}
                geoData={dashboard.loadedData[panel.geoSource]}
                loadedData={dashboard.loadedData}
                fullScreen
                multiFullScreen={panels.length > 1}
              />
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}

function findPanel(dashboard, panelId) {
  for (const page of dashboard.pages ?? []) {
    for (const section of page.sections ?? []) {
      const panel = (section.panels ?? []).find(
        (candidate) => candidate.id === panelId,
      );
      if (panel) {
        return panel;
      }
    }
  }
  return null;
}

function moveItem(items, fromIndex, toIndex) {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return nextItems;
}

function multiLayoutOptions(count) {
  if (count === 1) {
    return [{ value: "solo", label: "Single chart", icon: "1" }];
  }
  if (count === 2) {
    return [
      { value: "sideBySide", label: "Side by side", icon: "||" },
      { value: "overUnder", label: "Over-under", icon: "=" },
    ];
  }
  if (count === 3) {
    return [
      { value: "topFocus", label: "One on top", icon: "T" },
      { value: "bottomFocus", label: "One on bottom", icon: "B" },
      { value: "leftFocus", label: "One on left", icon: "L" },
      { value: "rightFocus", label: "One on right", icon: "R" },
    ];
  }
  return [{ value: "grid2x2", label: "2 by 2", icon: "2x2" }];
}
