import React from "react";

import { usePlayback } from "../playback/PlaybackProvider.jsx";
import { MAX_DISPLAYED_CHARTS, reduceDisplayState } from "../../lib/displayController.js";
import { buildPresentableItemIndex } from "../../static-content/staticPanelCapabilities.js";
import AudienceSnapshotMonitor from "./AudienceSnapshotMonitor.jsx";
import PresentationController, {
  buildPresentationState,
  presentationSourceEligibility,
} from "./PresentationController.jsx";

export default function PresentWorkspace({
  dashboard,
  activePageId,
  onModeRequest,
  onOpenDashboardLook,
  runtime,
  compositionReady = true,
  presentableItemIndex: suppliedPresentableItemIndex,
  accessibilityEnabled,
  themeProjection,
  contentRenderContext,
}) {
  const playback = usePlayback();
  const playbackDispatchRef = React.useRef(playback.dispatch);
  playbackDispatchRef.current = playback.dispatch;
  const playbackViewOwner = `present:${React.useId()}`;
  React.useEffect(() => {
    playbackDispatchRef.current({ type: "openView", owner: playbackViewOwner });
    return () => playbackDispatchRef.current({ type: "closeView", owner: playbackViewOwner });
  }, [playbackViewOwner]);
  const {
    displayState,
    onDisplayAction,
    connectionStatus,
    connectionError,
    hasSession,
    audienceFacts,
    setAudienceFactVisible,
    publish,
    sessionState = {
      lifecycle: "ended",
      connection: "terminated",
      output: "ended",
      playback: "paused",
      blackout: false,
      rejectionReason: null,
    },
  } = runtime;

  const presentableItemIndex = React.useMemo(
    () => suppliedPresentableItemIndex ?? buildPresentableItemIndex(dashboard),
    [dashboard, suppliedPresentableItemIndex],
  );
  const chartGroups = React.useMemo(
    () => configuredChartGroups(dashboard, presentableItemIndex),
    [dashboard, presentableItemIndex],
  );
  const chartsById = React.useMemo(
    () => new Map(chartGroups.flatMap(({ charts }) => charts.map((chart) => [chart.id, chart]))),
    [chartGroups],
  );
  const activePage = (dashboard?.pages ?? []).find(({ id }) => id === activePageId)
    ?? dashboard?.pages?.[0]
    ?? null;
  const reconciledDisplayState = React.useMemo(
    () => reconcilePresentDisplayState(displayState, presentableItemIndex),
    [displayState, presentableItemIndex],
  );
  const displayedChartIds = reconciledDisplayState.displayed_chart_ids;
  const layout = reconciledDisplayState.layout;
  const selectedCharts = displayedChartIds
    .map((chartId) => chartsById.get(chartId))
    .filter(Boolean);
  const atChartCapacity = displayedChartIds.length >= MAX_DISPLAYED_CHARTS;
  const layoutOptions = layoutChoices(displayedChartIds.length);
  const audienceInformation = audienceInformationRows({
    dashboard,
    activeGroup: playback.activeGroup,
    activeScene: playback.activeScene,
    activeEpochMs: playback.activeEpochMs,
  });
  const activeSceneTemporalReview = playback.activeScene?.present?.temporalReview?.status === "degraded"
    ? playback.activeScene.present.temporalReview
    : null;

  const sourceEligibility = React.useMemo(
    () => presentationSourceEligibility(playback.activeScene, { compositionReady }),
    [compositionReady, playback.activeScene],
  );
  const presentationState = React.useMemo(() => buildPresentationState({
    dashboard,
    activePageId: activePage?.id,
    displayedChartIds,
    layout,
    playback,
    presentableItemIndex,
    audienceFacts,
    outputMode: ["active", "holding", "blank"].includes(sessionState.output)
      ? sessionState.output
      : "active",
    blackout: sessionState.blackout,
  }), [
    activePage?.id,
    audienceFacts,
    dashboard,
    displayedChartIds,
    layout,
    playback,
    presentableItemIndex,
    sessionState.blackout,
    sessionState.output,
  ]);

  React.useEffect(() => {
    publish(presentationState, { sourceSelection: sourceEligibility });
  }, [presentationState, publish, sourceEligibility.status]);

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
      data-active-scene-id={playback.activeSceneId ?? ""}
    >
      <section className="present-status-strip" aria-label="Audience display connection">
        <div>
          <strong>{connectionStatusLabel(connectionStatus)}</strong>
          <p>{sceneSummary(activePage, selectedCharts)}</p>
        </div>
        <div className="present-status-actions">
          <button type="button" className="secondary dashboard-look-trigger" onClick={onOpenDashboardLook}>Dashboard look</button>
        </div>
        {connectionError && <p className="present-connection-error" role="status">{connectionError}</p>}
        {activeSceneTemporalReview && (
          <p className="present-connection-error" role="status">
            Scene presentation needs review after a source update. Rendering continues with the saved composition.
          </p>
        )}
      </section>

      <div className="present-workspace-body">
        <aside className="present-context-panel" aria-label="Presentation context">
          <div className="present-context-controls">
            <AudienceSnapshotMonitor
              dashboard={dashboard}
              connectionLabel={connectionStatusLabel(connectionStatus)}
              presentationState={presentationState}
              playing={playback.playing}
              themeProjection={themeProjection}
              contentRenderContext={contentRenderContext}
            />
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
                <article
                  className="present-selected-chart"
                  data-displayed-chart-id={chart.id}
                  key={chart.id}
                >
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
          <fieldset className="present-audience-information">
            <legend>Display on audience</legend>
            <p>Shared information can be hidden without changing its value.</p>
            {audienceInformation.map((fact) => {
              const available = Boolean(fact.value);
              const descriptionId = `present-audience-fact-${fact.key}`;
              return (
                <label
                  className={`present-audience-fact${available ? "" : " is-unavailable"}`}
                  key={fact.key}
                  title={available ? undefined : fact.unavailableReason}
                >
                  <input
                    type="checkbox"
                    aria-label={`Display ${fact.label}`}
                    aria-describedby={descriptionId}
                    checked={audienceFacts[fact.key] === true}
                    disabled={!available}
                    onChange={(event) => setAudienceFactVisible(
                      fact.key,
                      event.target.checked,
                    )}
                  />
                  <span>
                    <strong>{fact.label}</strong>
                    <small id={descriptionId}>
                      {fact.value ?? fact.unavailableReason}
                    </small>
                  </span>
                </label>
              );
            })}
          </fieldset>
          <p className="present-scene-summary">{sceneSummary(activePage, selectedCharts)}</p>
        </aside>

        <section className="present-scene-panel" aria-label="Choose charts for the audience scene">
          {chartGroups.length === 0 ? (
            <section className="present-catalogue-recovery" aria-labelledby="present-catalogue-recovery-title">
              <p className="eyebrow">Presentation catalogue</p>
              <h2 id="present-catalogue-recovery-title">No charts are available to present from this dashboard.</h2>
              <button type="button" onClick={() => onModeRequest?.("build")}>
                Open Build to Add Charts
              </button>
            </section>
          ) : (
            <>
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
                          data-presentable-item-id={chart.id}
                          data-presentable-item-kind={presentableItemIndex.get(chart.id).descriptor.kind}
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
            </>
          )}
        </section>
      </div>

      <section className="present-action-dock" aria-label="Presentation controls">
        <PresentationController
          runtime={{ ...runtime, sessionState }}
          playback={playback}
          presentationState={presentationState}
          sourceEligibility={sourceEligibility}
        />
      </section>
    </main>
  );
}

function audienceInformationRows({
  dashboard,
  activeGroup,
  activeScene,
  activeEpochMs,
}) {
  return [
    {
      key: "dashboard_name",
      label: "Dashboard name",
      value: optionalText(dashboard?.title),
      unavailableReason: "This dashboard has no name.",
    },
    {
      key: "parent_chrono_group",
      label: "Parent Chrono Group",
      value: optionalText(activeGroup?.name),
      unavailableReason: "Choose a Chrono Group to make this available.",
    },
    {
      key: "scene_name",
      label: "Scene name",
      value: optionalText(activeScene?.name ?? activeScene?.title),
      unavailableReason: "No Scene is loaded.",
    },
    {
      key: "scene_date",
      label: "Scene date",
      value: canonicalTime(activeEpochMs),
      unavailableReason: "Choose a Chrono Group with available frames.",
    },
  ];
}

function optionalText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function canonicalTime(epochMs) {
  if (!Number.isFinite(epochMs)) return null;
  const iso = new Date(epochMs).toISOString();
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso;
}

function configuredChartGroups(dashboard, presentableItemIndex) {
  return (dashboard?.pages ?? []).flatMap((page) => (
    (page.sections ?? []).map((section) => {
      const charts = (section.panels ?? [])
        .map((panel) => panel.chart ?? panel)
        .filter((chart) => typeof chart?.id === "string" && chart.id.length > 0)
        .filter((chart) => presentableItemIndex.has(chart.id));
      return {
        id: `${page.id}-${section.id}`,
        label: `${page.label ?? page.title ?? page.id} / ${section.title ?? section.id}`,
        charts,
      };
    }).filter((group) => group.charts.length > 0)
  ));
}

export function projectPresentableItems(itemIds, presentableItemIndex) {
  return itemIds.map(
    (itemId) => structuredClone(presentableItemIndex.get(itemId).descriptor),
  );
}

export function reconcilePresentDisplayState(displayState, presentableItemIndex) {
  const reconciled = reduceDisplayState(displayState, {
    type: "companion_reconcile",
    chart_ids: displayState.displayed_chart_ids.filter(
      (itemId) => presentableItemIndex.has(itemId),
    ),
  }, presentableItemIndex.keys());
  const allowedLayouts = layoutChoices(reconciled.displayed_chart_ids.length);
  if (allowedLayouts.some(({ value }) => value === reconciled.layout)) return reconciled;
  return {
    ...reconciled,
    layout: allowedLayouts[0]?.value ?? "solo",
  };
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
