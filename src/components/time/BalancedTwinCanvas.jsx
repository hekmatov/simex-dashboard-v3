import React from "react";

export default function BalancedTwinCanvas({ scene, charts = [], disabled = false, onAction }) {
  const chartsById = new Map(charts.map((chart) => [chart.id, chart]));
  const sceneIds = (scene?.members ?? []).map(({ chartId }) => chartId);
  const presentIds = scene?.present?.chartIds ?? [];
  return (
    <div className="balanced-twin-canvas" aria-label="Scene arrangement boards">
      <ArrangementBoard
        title="Scene View"
        board="scene"
        chartIds={sceneIds}
        chartsById={chartsById}
        members={scene?.members ?? []}
        disabled={disabled}
        onAction={onAction}
      />
      <ArrangementBoard
        title="Present"
        board="present"
        chartIds={presentIds}
        chartsById={chartsById}
        members={scene?.members ?? []}
        disabled={disabled}
        onAction={onAction}
      />
    </div>
  );
}

function ArrangementBoard({ title, board, chartIds, chartsById, members, disabled, onAction }) {
  return (
    <section className="scene-arrangement-board" data-board={board} aria-labelledby={`scene-${board}-board-title`}>
      <header>
        <div>
          <p className="eyebrow">Authored order</p>
          <h3 id={`scene-${board}-board-title`}>{title}</h3>
        </div>
        <span>{chartIds.length} charts</span>
      </header>
      <ol>
        {chartIds.map((chartId, index) => {
          const chart = chartsById.get(chartId);
          const width = members.find((member) => member.chartId === chartId)?.width ?? 1;
          return (
            <li key={chartId} data-chart-id={chartId} style={{ "--scene-width": width }}>
              <button
                type="button"
                className="scene-chart-title"
                disabled={disabled}
                onClick={() => onAction?.({ type: "SELECT_CHART", chartId, board })}
              >
                {chart?.title ?? chart?.label ?? chartId}
              </button>
              <span>{board === "scene" ? `${width} columns` : "Included"}</span>
              <div className="scene-chart-move-actions">
                <button type="button" disabled={disabled || index === 0} onClick={() => onAction?.({ type: "MOVE_CHART", board, chartId, direction: "earlier" })}>Move earlier</button>
                <button type="button" disabled={disabled || index === chartIds.length - 1} onClick={() => onAction?.({ type: "MOVE_CHART", board, chartId, direction: "later" })}>Move later</button>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
