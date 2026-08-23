import React from "react";

import { MATCHING_POLICY_LABELS } from "../../charting/time/temporalMatch.js";

export default function BalancedTwinCanvas({ scene, charts = [], selectedChartId = null, activeBoard = "scene", disabled = false, onAction }) {
  const chartsById = new Map(charts.map((chart) => [chart.id, chart]));
  const sceneIds = (scene?.members ?? []).map(({ chartId }) => chartId);
  const presentIds = scene?.present?.chartIds ?? [];
  const selectedMember = scene?.members?.find(({ chartId }) => chartId === selectedChartId);
  return (
    <div className="balanced-twin-canvas" aria-label="Scene arrangement boards">
      <div className="balanced-twin-canvas__boards">
        <ArrangementBoard title="Scene View" board="scene" chartIds={sceneIds} presentIds={presentIds} chartsById={chartsById} members={scene?.members ?? []} selectedChartId={selectedChartId} disabled={disabled} onAction={onAction} />
        <ArrangementBoard title="Present" board="present" chartIds={presentIds} presentIds={presentIds} chartsById={chartsById} members={scene?.members ?? []} selectedChartId={selectedChartId} layout={scene?.present?.layout} disabled={disabled} onAction={onAction} />
      </div>
      {selectedMember && <UnitOrbit member={selectedMember} scene={scene} chart={chartsById.get(selectedChartId)} activeBoard={activeBoard} disabled={disabled} onAction={onAction} />}
    </div>
  );
}

function ArrangementBoard({ title, board, chartIds, presentIds, chartsById, members, selectedChartId, layout, disabled, onAction }) {
  const move = (chartId, targetIndex) => onAction?.({ type: "MOVE_CHART", board, chartId, targetIndex });
  return (
    <section className="scene-arrangement-board" data-board={board} aria-labelledby={`scene-${board}-board-title`}>
      <header><div><p className="eyebrow">Authored order</p><h3 id={`scene-${board}-board-title`}>{title}</h3></div><span>{chartIds.length} charts</span></header>
      {board === "present" && <label className="scene-present-layout">Present layout<select value={layout ?? ""} disabled={disabled} onChange={(event) => onAction?.({ type: "SET_PRESENT_LAYOUT", layout: event.target.value })}>{layoutOptions(chartIds.length).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}
      <ol>
        <InsertionTarget board={board} targetIndex={0} selectedChartId={selectedChartId} disabled={disabled} onMove={move} />
        {chartIds.map((chartId, index) => {
          const chart = chartsById.get(chartId);
          const width = members.find((member) => member.chartId === chartId)?.width ?? 1;
          const inPresent = presentIds.includes(chartId);
          return <React.Fragment key={chartId}><li data-chart-id={chartId} data-selected={selectedChartId === chartId || undefined} style={{ "--scene-width": width }} draggable={!disabled} onDragStart={(event) => event.dataTransfer?.setData("text/plain", chartId)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => move(event.dataTransfer?.getData("text/plain"), index)}><button type="button" className="scene-chart-title" disabled={disabled} onClick={() => onAction?.({ type: "SELECT_CHART", chartId, board })} onKeyDown={(event) => keyboardMove(event, { board, chartId, onAction })}>{chart?.title ?? chart?.label ?? chartId}</button><span>{board === "scene" ? `${width} columns` : "Included"}</span>{board === "scene" && <button type="button" className="scene-present-corner-action" disabled={disabled || (!inPresent && presentIds.length >= 4)} onClick={() => onAction?.({ type: "TOGGLE_PRESENT", chartId })}>{inPresent ? "Remove from Present" : "Add to Present"}</button>}</li><InsertionTarget board={board} targetIndex={index + 1} selectedChartId={selectedChartId} disabled={disabled} onMove={move} /></React.Fragment>;
        })}
      </ol>
    </section>
  );
}

function InsertionTarget({ board, targetIndex, selectedChartId, disabled, onMove }) {
  return <li className="scene-insertion-target" data-active={Boolean(selectedChartId)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onMove(event.dataTransfer?.getData("text/plain"), Math.max(0, targetIndex - 1))}><button type="button" aria-label={`Drop here in ${board} position ${targetIndex + 1}`} disabled={disabled || !selectedChartId} onClick={() => onMove(selectedChartId, Math.max(0, targetIndex - 1))}>Drop here</button></li>;
}

function UnitOrbit({ member, scene, chart, activeBoard, disabled, onAction }) {
  const inPresent = scene.present?.chartIds?.includes(member.chartId);
  return <aside className="scene-unit-orbit" aria-labelledby="scene-unit-orbit-title"><header><div><p className="eyebrow">Selected unit</p><h3 id="scene-unit-orbit-title">Unit Orbit</h3><p>{chart?.title ?? chart?.label ?? member.chartId}</p></div><button type="button" onClick={() => onAction?.({ type: "SELECT_CHART", chartId: null })}>Done</button></header><fieldset><legend>Width</legend>{[1, 2, 3, 4].map((width) => <label className="choice-control-row" key={width}><input className="choice-control" type="radio" name="scene-unit-width" checked={member.width === width} disabled={disabled} onChange={() => onAction?.({ type: "SET_WIDTH", chartId: member.chartId, width })} />{width}</label>)}</fieldset><label>Matching<select value={member.matching ?? "authored"} disabled={disabled} onChange={(event) => onAction?.({ type: "SET_MATCHING", chartId: member.chartId, matching: event.target.value })}><option value="authored">Use authored default</option>{Object.values(MATCHING_POLICY_LABELS).map((label) => <option key={label}>{label}</option>)}</select></label><label className="choice-control-row"><input className="choice-control" type="checkbox" checked={inPresent} disabled={disabled} onChange={() => onAction?.({ type: "TOGGLE_PRESENT", chartId: member.chartId })} />Include in Present</label><div className="scene-unit-orbit__moves"><button type="button" disabled={disabled} onClick={() => onAction?.({ type: "MOVE_CHART", board: activeBoard, chartId: member.chartId, direction: "first" })}>Move first</button><button type="button" disabled={disabled} onClick={() => onAction?.({ type: "MOVE_CHART", board: activeBoard, chartId: member.chartId, direction: "earlier" })}>Move earlier</button><button type="button" disabled={disabled} onClick={() => onAction?.({ type: "MOVE_CHART", board: activeBoard, chartId: member.chartId, direction: "later" })}>Move later</button><button type="button" disabled={disabled} onClick={() => onAction?.({ type: "MOVE_CHART", board: activeBoard, chartId: member.chartId, direction: "last" })}>Move last</button></div><button type="button" className="danger" disabled={disabled || scene.members.length === 1} onClick={() => onAction?.({ type: "REMOVE_MEMBER", chartId: member.chartId })}>Remove from Scene</button></aside>;
}

function keyboardMove(event, { board, chartId, onAction }) {
  if (!event.altKey) return;
  const direction = { ArrowUp: "earlier", ArrowLeft: "earlier", ArrowDown: "later", ArrowRight: "later", Home: "first", End: "last" }[event.key];
  if (!direction) return;
  event.preventDefault();
  onAction?.({ type: "MOVE_CHART", board, chartId, direction });
}

function layoutOptions(count) {
  if (count <= 1) return [{ value: "single", label: "Single focus" }];
  if (count === 2) return [{ value: "vertical-divider", label: "Vertical divider" }, { value: "horizontal-divider", label: "Horizontal divider" }];
  if (count === 3) return [{ value: "large-left", label: "Large left" }, { value: "large-top", label: "Large top" }];
  return [{ value: "grid-2x2", label: "2 × 2" }];
}
