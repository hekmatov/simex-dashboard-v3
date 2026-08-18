import React from "react";

import { usePlayback } from "../playback/PlaybackProvider.jsx";
import { MAX_DISPLAYED_CHARTS } from "../../lib/displayController.js";
import AudienceSnapshotMonitor from "./AudienceSnapshotMonitor.jsx";

export default function PresentWorkspace({
  dashboard,
  activePageId,
  onActivePageChange,
  onOpenDashboardLook,
  runtime,
  accessibilityEnabled,
}) {
  const playback = usePlayback();
  const {
    displayState,
    onDisplayAction,
    connectionStatus,
    connectionError,
    hasSession,
    showSceneTitle,
    setShowSceneTitle,
    blackout,
    setBlackout,
    publish,
    open,
    end,
  } = runtime;

  const chartGroups = React.useMemo(
    () => configuredChartGroups(dashboard),
    [dashboard],
  );
  const chartsById = React.useMemo(
    () => new Map(chartGroups.flatMap(({ charts }) => charts.map((chart) => [chart.id, chart]))),
    [chartGroups],
  );
  const activePage = (dashboard?.pages ?? []).find(({ id }) => id === activePageId)
    ?? dashboard?.pages?.[0]
    ?? null;
  const displayedChartIds = displayState.displayed_chart_ids;
  const layout = displayState.layout;
  const selectedCharts = displayedChartIds
    .map((chartId) => chartsById.get(chartId))
    .filter(Boolean);
  const atChartCapacity = displayedChartIds.length >= MAX_DISPLAYED_CHARTS;
  const layoutOptions = layoutChoices(displayedChartIds.length);
  const hasClock = playback.activeGroupId !== null && playback.clock.length > 0;
  const atFirstTime = !hasClock || playback.activeIndex <= 0;
  const atLastTime = !hasClock || playback.activeIndex >= playback.clock.length - 1;

  const presentationState = React.useMemo(() => ({
    active_page_id: activePage?.id ?? "dashboard",
    displayed_chart_ids: displayedChartIds,
    layout,
    time: playback.activeGroupId !== null && Number.isFinite(playback.activeEpochMs)
      ? {
          group_id: playback.activeGroupId,
          active_epoch_ms: playback.activeEpochMs,
        }
      : null,
    show_scene_title: showSceneTitle,
    blackout,
  }), [
    activePage?.id,
    blackout,
    displayedChartIds,
    playback.activeEpochMs,
    playback.activeGroupId,
    layout,
    showSceneTitle,
  ]);

  React.useEffect(() => {
    publish(presentationState);
  }, [presentationState, publish]);

  function openDisplay() {
    open(presentationState);
  }

  function toggleChart(chartId) {
    if (displayedChartIds.includes(chartId)) {
      onDisplayAction?.({ type: "manual_close", chart_id: chartId });
      return;
    }
    if (atChartCapacity) return;
    onDisplayAction?.({ type: "manual_open", chart_id: chartId });
  }

  function reorderChart(index, direction) {
    const destination = index + direction;
    if (destination < 0 || destination >= displayedChartIds.length) return;
    const nextChartIds = [...displayedChartIds];
    [nextChartIds[index], nextChartIds[destination]] = [
      nextChartIds[destination],
      nextChartIds[index],
    ];
    onDisplayAction?.({ type: "manual_reorder", chart_ids: nextChartIds });
  }

  return (
    <main
      className="present-workspace"
      data-accessibility-enabled={accessibilityEnabled === true ? "true" : "false"}
    >
      <section className="present-status-strip" aria-label="Audience display connection">
        <div>
          <strong>{connectionStatusLabel(connectionStatus)}</strong>
          <p>{sceneSummary(activePage, selectedCharts)}</p>
        </div>
        <div className="present-status-actions">
          <button type="button" className="secondary dashboard-look-trigger" onClick={onOpenDashboardLook}>Dashboard look</button>
          <button type="button" onClick={openDisplay}>
            {hasSession ? "Reopen audience display" : "Open audience display"}
          </button>
        </div>
        {connectionError && <p className="present-connection-error" role="status">{connectionError}</p>}
      </section>

      <div className="present-workspace-body">
        <aside className="present-context-panel" aria-label="Presentation context">
          <div className="present-context-controls">
            <AudienceSnapshotMonitor
              dashboard={dashboard}
              connectionLabel={connectionStatusLabel(connectionStatus)}
              presentationState={presentationState}
              playing={playback.playing}
            />
            <label className="present-field">
              <span>Current page</span>
              <select
                aria-label="Current page"
                value={activePage?.id ?? ""}
                onChange={(event) => onActivePageChange?.(event.target.value)}
              >
                {(dashboard?.pages ?? []).map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.label ?? page.title ?? page.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="present-title-toggle">
              <input
                type="checkbox"
                checked={showSceneTitle}
                onChange={(event) => setShowSceneTitle(event.target.checked)}
              />
              <span>Show scene title</span>
            </label>

            <p className="present-scene-summary">{sceneSummary(activePage, selectedCharts)}</p>
          </div>
          <section className="present-displayed-panel" aria-labelledby="displayed-charts-heading">
            <div className="present-panel-heading">
              <div>
                <p className="eyebrow">Audience scene</p>
                <h1 id="displayed-charts-heading">Displayed charts</h1>
              </div>
              <label className="present-field present-layout-field">
                <span>Scene layout</span>
                <select
                  aria-label="Scene layout"
                  value={layout}
                  onChange={(event) => onDisplayAction?.({
                    type: "layout_changed",
                    layout: event.target.value,
                  })}
                >
                  {layoutOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="present-selected-charts" aria-label="Displayed chart order">
              {selectedCharts.length === 0 ? (
                <p className="present-holding-scene">Holding scene — no charts selected.</p>
              ) : selectedCharts.map((chart, index) => (
                <article className="present-selected-chart" key={chart.id}>
                  <span className="present-chart-order">{index + 1}</span>
                  <strong>{chart.title ?? chart.id}</strong>
                  <div className="present-chart-actions">
                    <button
                      type="button"
                      className="secondary"
                      aria-label={`Move ${chart.title ?? chart.id} up`}
                      disabled={index === 0}
                      onClick={() => reorderChart(index, -1)}
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      aria-label={`Move ${chart.title ?? chart.id} down`}
                      disabled={index === selectedCharts.length - 1}
                      onClick={() => reorderChart(index, 1)}
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => toggleChart(chart.id)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>

        <section className="present-scene-panel" aria-label="Choose charts for the audience scene">
          <p id="present-chart-limit-status" className="present-chart-limit-status" aria-live="polite">
            {atChartCapacity
              ? `${MAX_DISPLAYED_CHARTS} of ${MAX_DISPLAYED_CHARTS} charts selected. Remove a displayed chart before selecting another.`
              : `Choose up to ${MAX_DISPLAYED_CHARTS} charts. ${displayedChartIds.length} of ${MAX_DISPLAYED_CHARTS} selected.`}
          </p>
          <div className="present-chart-groups">
            {chartGroups.map((group) => (
              <fieldset className="present-chart-group" key={group.id}>
                <legend>{group.label}</legend>
                {group.charts.map((chart) => {
                  const selected = displayedChartIds.includes(chart.id);
                  const unavailable = atChartCapacity && !selected;
                  return (
                    <label
                      className={`present-chart-choice${unavailable ? " is-unavailable" : ""}`}
                      key={chart.id}
                    >
                      <input
                        type="checkbox"
                        aria-describedby="present-chart-limit-status"
                        checked={selected}
                        disabled={unavailable}
                        onChange={() => toggleChart(chart.id)}
                      />
                      <span>{chart.title ?? chart.id}</span>
                    </label>
                  );
                })}
              </fieldset>
            ))}
          </div>
        </section>
      </div>

      <section className="present-action-dock" aria-label="Presentation controls">
        <div className="present-time-controls">
          <label className="present-field">
            <span>Synchronized time</span>
            <select
              aria-label="Synchronized time"
              value={playback.activeGroupId ?? ""}
              disabled={playback.groups.length === 0}
              onChange={(event) => playback.dispatch({
                type: "setGroup",
                groupId: event.target.value || null,
              })}
            >
              {playback.groups.length === 0 ? (
                <option value="">No synchronized time available</option>
              ) : playback.groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="secondary"
            disabled={atFirstTime}
            onClick={() => playback.dispatch({
              type: "previous",
              clockLength: playback.clock.length,
            })}
          >
            Previous time
          </button>
          <label className="present-field present-time-slider">
            <span>Presentation time</span>
            <input
              type="range"
              aria-label="Presentation time"
              min="0"
              max={Math.max(0, playback.clock.length - 1)}
              step="1"
              value={playback.activeIndex}
              disabled={!hasClock}
              onChange={(event) => playback.dispatch({
                type: "seek",
                index: Number(event.target.value),
                clockLength: playback.clock.length,
              })}
            />
          </label>
          <button
            type="button"
            className="secondary"
            disabled={atLastTime}
            onClick={() => playback.dispatch({
              type: "next",
              clockLength: playback.clock.length,
            })}
          >
            Next time
          </button>
        </div>
        <div className="present-session-actions">
          <button
            type="button"
            className="secondary"
            disabled={blackout}
            onClick={() => setBlackout(true)}
          >
            Blackout
          </button>
          <button
            type="button"
            className="secondary"
            disabled={!blackout}
            onClick={() => setBlackout(false)}
          >
            Restore
          </button>
          <button type="button" className="secondary" onClick={end}>
            End presentation
          </button>
        </div>
      </section>
    </main>
  );
}

function configuredChartGroups(dashboard) {
  return (dashboard?.pages ?? []).flatMap((page) => (
    (page.sections ?? []).map((section) => {
      const charts = (section.panels ?? [])
        .map((panel) => panel.chart ?? panel)
        .filter((chart) => typeof chart?.id === "string" && chart.id.length > 0);
      return {
        id: `${page.id}-${section.id}`,
        label: `${page.label ?? page.title ?? page.id} / ${section.title ?? section.id}`,
        charts,
      };
    }).filter((group) => group.charts.length > 0)
  ));
}

function layoutChoices(count) {
  if (count === 1) return [{ value: "solo", label: "Single chart" }];
  if (count === 2) {
    return [
      { value: "sideBySide", label: "Side by side" },
      { value: "overUnder", label: "Over-under" },
    ];
  }
  if (count === 3) {
    return [
      { value: "topFocus", label: "One on top" },
      { value: "bottomFocus", label: "One on bottom" },
      { value: "leftFocus", label: "One on left" },
      { value: "rightFocus", label: "One on right" },
    ];
  }
  if (count === 4) return [{ value: "grid2x2", label: "2 by 2" }];
  return [{ value: "solo", label: "Holding scene" }];
}

function connectionStatusLabel(status) {
  if (status === "connected") return "Audience display connected";
  if (status === "opening") return "Opening audience display";
  if (status === "disconnected") return "Audience display disconnected";
  if (status === "blocked") return "Audience display unavailable";
  if (status === "ended") return "Audience display ended";
  if (status === "error") return "Audience display unavailable";
  return "Audience display not open";
}

function sceneSummary(activePage, selectedCharts) {
  const pageLabel = activePage?.label ?? activePage?.title ?? activePage?.id ?? "Current page";
  if (selectedCharts.length === 0) return `${pageLabel}: holding scene`;
  return `${pageLabel}: ${selectedCharts.length} chart${selectedCharts.length === 1 ? "" : "s"} selected`;
}
