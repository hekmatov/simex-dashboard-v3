import React from "react";

import { MATCHING_POLICY_LABELS } from "../../charting/time/temporalMatch.js";
import FloatingUnitOrbit from "../build/UnitOrbit.jsx";
import DisplayedChartGrid from "../display/DisplayedChartGrid.jsx";
import SceneCompositionAuthoringOverlay from "./SceneCompositionAuthoringOverlay.jsx";
import SceneViewCompositionGrid from "./SceneViewCompositionGrid.jsx";
import { buildScenePreviewProjection } from "./scenePreviewTime.js";
import { scenePresentLayoutToDisplayLayout } from "./scenePresentLayout.js";

export default function BalancedTwinCanvas({
  dashboard,
  themeProjection,
  scene,
  charts = [],
  selectedChartId = null,
  activeBoard = "scene",
  disabled = false,
  onAction,
}) {
  const chartsById = new Map(charts.map((chart) => [chart.id, chart]));
  const sceneIds = (scene?.members ?? []).map(({ chartId }) => chartId);
  const presentIds = scene?.present?.chartIds ?? [];
  const selectedMember = scene?.members?.find(({ chartId }) => chartId === selectedChartId);
  const preview = React.useMemo(
    () => buildScenePreviewProjection({ dashboard, scene }),
    [dashboard, scene],
  );
  const displayLayout = mappedPresentLayout(scene);
  const orbitAnchorId = selectedChartId
    ? sceneOrbitAnchorId(activeBoard, selectedChartId)
    : null;
  const timeContextForChart = (chartId) => preview.timeContexts[chartId] ?? null;

  return (
    <div className="balanced-twin-canvas" aria-label="Scene arrangement boards">
      <p className="scene-preview-time" role="status">
        <strong>Scene preview frame</strong>{" "}
        {preview.label ?? "Unavailable"}
        {preview.error ? <span> · {preview.error}</span> : null}
      </p>
      <div className="balanced-twin-canvas__boards">
        <CompositionBoard title="Scene View" board="scene" count={sceneIds.length}>
          <SceneViewCompositionGrid
            dashboard={dashboard}
            scene={scene}
            timeContextForChart={timeContextForChart}
            timeContextAuthority="explicit"
            surface="scene-preview"
            getCellProps={({ chart, member }) => {
              const chartId = chart?.id ?? member.chartId;
              return {
                "data-build-placement-id": sceneOrbitAnchorId("scene", chartId),
                "data-selected": selectedChartId === chartId || undefined,
              };
            }}
            renderCellChrome={({ chart, member, index }) => (
              <SceneCompositionAuthoringOverlay
                board="scene"
                chart={chart}
                member={member}
                index={index}
                orderedIds={sceneIds}
                presentIds={presentIds}
                selectedChartId={selectedChartId}
                disabled={disabled}
                onAction={onAction}
              />
            )}
          />
        </CompositionBoard>
        <CompositionBoard
          title="Present"
          board="present"
          count={presentIds.length}
          controls={(
            <label className="scene-present-layout">
              Present layout
              <select
                value={scene?.present?.layout ?? ""}
                disabled={disabled}
                onChange={(event) => onAction?.({
                  type: "SET_PRESENT_LAYOUT",
                  layout: event.target.value,
                })}
              >
                {layoutOptions(presentIds.length).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          )}
        >
          {displayLayout ? (
            <DisplayedChartGrid
              dashboard={dashboard}
              chartIds={presentIds}
              layout={displayLayout}
              layoutSystem="presentation"
              surface="scene-preview-present"
              timeContextForChart={timeContextForChart}
              timeContextAuthority="explicit"
              getCellProps={(chart) => ({
                "data-build-placement-id": sceneOrbitAnchorId("present", chart.id),
                "data-selected": selectedChartId === chart.id || undefined,
              })}
              renderCellControls={(chart, index) => (
                <SceneCompositionAuthoringOverlay
                  board="present"
                  chart={chart}
                  member={scene?.members?.find(({ chartId }) => chartId === chart.id)}
                  index={index}
                  orderedIds={presentIds}
                  presentIds={presentIds}
                  selectedChartId={selectedChartId}
                  disabled={disabled}
                  onAction={onAction}
                />
              )}
            />
          ) : (
            <p className="scene-present-preview-error" role="status">
              Present needs one to four charts and a layout valid for that chart count.
            </p>
          )}
        </CompositionBoard>
      </div>
      {selectedMember ? (
        <FloatingUnitOrbit
          themeProjection={themeProjection}
          anchorPlacementId={orbitAnchorId}
          chartTitle={chartsById.get(selectedChartId)?.title ?? chartsById.get(selectedChartId)?.label}
          onRequestClose={() => onAction?.({ type: "SELECT_CHART", chartId: null })}
        >
          <SceneUnitOrbitControls
            member={selectedMember}
            scene={scene}
            chart={chartsById.get(selectedChartId)}
            activeBoard={activeBoard}
            disabled={disabled}
            onAction={onAction}
          />
        </FloatingUnitOrbit>
      ) : null}
    </div>
  );
}

function CompositionBoard({ title, board, count, controls, children }) {
  return (
    <section
      className="scene-arrangement-board scene-composition-board"
      data-board={board}
      aria-labelledby={`scene-${board}-board-title`}
    >
      <header>
        <div>
          <p className="eyebrow">Authored order</p>
          <h3 id={`scene-${board}-board-title`}>{title}</h3>
        </div>
        <span>{count} charts</span>
      </header>
      {controls}
      <div className="scene-composition-board__viewport">{children}</div>
    </section>
  );
}

function mappedPresentLayout(scene) {
  const chartIds = scene?.present?.chartIds ?? [];
  try {
    return scenePresentLayoutToDisplayLayout(scene?.present?.layout, chartIds.length);
  } catch {
    return null;
  }
}

function SceneUnitOrbitControls({ member, scene, chart, activeBoard, disabled, onAction }) {
  const inPresent = scene.present?.chartIds?.includes(member.chartId);
  return <aside className="scene-unit-orbit" aria-labelledby="scene-unit-orbit-title"><header><div><p className="eyebrow">Selected unit</p><h3 id="scene-unit-orbit-title">Unit Orbit</h3><p>{chart?.title ?? chart?.label ?? member.chartId}</p></div><button type="button" onClick={() => onAction?.({ type: "SELECT_CHART", chartId: null })}>Done</button></header><fieldset><legend>Width</legend>{[1, 2, 3, 4].map((width) => <label className="choice-control-row" key={width}><input className="choice-control" type="radio" name="scene-unit-width" checked={member.width === width} disabled={disabled} onChange={() => onAction?.({ type: "SET_WIDTH", chartId: member.chartId, width })} />{width}</label>)}</fieldset><label>Matching<select value={member.matching ?? "authored"} disabled={disabled} onChange={(event) => onAction?.({ type: "SET_MATCHING", chartId: member.chartId, matching: event.target.value })}><option value="authored">Use authored default</option>{Object.values(MATCHING_POLICY_LABELS).map((label) => <option key={label}>{label}</option>)}</select></label><label className="choice-control-row"><input className="choice-control" type="checkbox" checked={inPresent} disabled={disabled} onChange={() => onAction?.({ type: "TOGGLE_PRESENT", chartId: member.chartId })} />Include in Present</label><div className="scene-unit-orbit__moves"><button type="button" disabled={disabled} onClick={() => onAction?.({ type: "MOVE_CHART", board: activeBoard, chartId: member.chartId, direction: "first" })}>Move first</button><button type="button" disabled={disabled} onClick={() => onAction?.({ type: "MOVE_CHART", board: activeBoard, chartId: member.chartId, direction: "earlier" })}>Move earlier</button><button type="button" disabled={disabled} onClick={() => onAction?.({ type: "MOVE_CHART", board: activeBoard, chartId: member.chartId, direction: "later" })}>Move later</button><button type="button" disabled={disabled} onClick={() => onAction?.({ type: "MOVE_CHART", board: activeBoard, chartId: member.chartId, direction: "last" })}>Move last</button></div><button type="button" className="danger" disabled={disabled || scene.members.length === 1} onClick={() => onAction?.({ type: "REMOVE_MEMBER", chartId: member.chartId })}>Remove from Scene</button></aside>;
}

function sceneOrbitAnchorId(board, chartId) {
  return `scene-orbit-${board}-${chartId}`;
}

function layoutOptions(count) {
  if (count <= 1) return [{ value: "single", label: "Single focus" }];
  if (count === 2) return [{ value: "vertical-divider", label: "Vertical divider" }, { value: "horizontal-divider", label: "Horizontal divider" }];
  if (count === 3) return [{ value: "large-left", label: "Large left" }, { value: "large-top", label: "Large top" }];
  return [{ value: "grid-2x2", label: "2 × 2" }];
}
