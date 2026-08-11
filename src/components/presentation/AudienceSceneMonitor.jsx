import React from "react";

export default function AudienceSceneMonitor({
  connectionLabel,
  sceneTitle,
  showSceneTitle,
  charts,
  layout,
  blackout,
}) {
  return (
    <section className="audience-scene-monitor" aria-label="Audience scene monitor">
      <div className="audience-monitor-heading">
        <span>Audience monitor</span>
        <strong>{connectionLabel}</strong>
      </div>
      <div
        className={`audience-monitor-stage layout-${layout}`}
        data-chart-count={charts.length}
        data-show-title={showSceneTitle && Boolean(sceneTitle) ? "true" : "false"}
      >
        {showSceneTitle && sceneTitle && (
          <p className="audience-monitor-title">{sceneTitle}</p>
        )}
        <div className="audience-monitor-grid">
          {charts.length === 0 ? (
            <p className="audience-monitor-holding">Holding scene</p>
          ) : charts.map((chart, index) => (
            <div className={`audience-monitor-tile audience-monitor-tile-${index + 1}`} key={chart.id}>
              <span>{index + 1}</span>
              <strong>{chart.title ?? chart.id}</strong>
            </div>
          ))}
        </div>
        {blackout && <div className="audience-monitor-blackout">Blackout</div>}
      </div>
    </section>
  );
}
