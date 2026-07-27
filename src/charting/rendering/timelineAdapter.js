export function buildTimelineRenderModel({ chart, prepared }) {
  const swimlane = chart.typeId === "swimlane";
  const activeTime = prepared.meta?.activeTime ?? null;
  const lanes = swimlane
    ? unique(prepared.marks.map(({ lane }) => lane ?? "Unassigned"))
    : ["Events"];
  return {
    kind: "echarts",
    option: {
      title: titleOption(chart),
      aria: { enabled: true, description: chart.description ?? chart.title ?? "" },
      tooltip: { trigger: "item" },
      grid: { containLabel: true, left: 72, right: 28, top: 76, bottom: 52 },
      xAxis: { type: "time" },
      yAxis: { type: "category", data: lanes },
      series: [{
        name: chart.title ?? "",
        type: "custom",
        renderItem: renderInterval,
        encode: { x: [0, 1], y: 2 },
        data: prepared.marks.map((mark) => timelineDataItem(mark, swimlane, activeTime)),
      }],
      dataZoom: chart.interaction?.zoom?.enabled
        ? [
            { type: "inside", xAxisIndex: 0, zoomOnMouseWheel: "ctrl", moveOnMouseWheel: false, moveOnMouseMove: false },
            { type: "slider", xAxisIndex: 0 },
          ]
        : undefined,
    },
  };
}

function renderInterval(_params, api) {
  const start = api.coord([api.value(0), api.value(2)]);
  const end = api.coord([api.value(1), api.value(2)]);
  const height = Math.max(6, api.size([0, 1])[1] * 0.5);
  const width = Math.max(5, end[0] - start[0]);
  const shape = {
    x: start[0],
    y: start[1] - height / 2,
    width,
    height,
  };
  const color = api.visual("color") ?? "#2456a6";
  const active = api.value(5) === 1;
  const estimated = api.value(6) === 1;
  return {
    type: "group",
    children: [
      {
        type: "rect",
        shape,
        style: {
          fill: color,
          opacity: active ? 1 : 0.82,
          ...(active
            ? {
                stroke: "#163d73",
                lineWidth: 3,
                lineDash: estimated ? [5, 3] : undefined,
              }
            : {}),
        },
      },
      {
        type: "text",
        style: {
          text: String(api.value(4) ?? ""),
          x: shape.x + 4,
          y: start[1],
          verticalAlign: "middle",
          fill: "#ffffff",
        },
      },
    ],
  };
}

function titleOption(chart) {
  return { text: chart.title ?? "", left: chart.presentation?.title?.align ?? "left" };
}

function unique(values) {
  return [...new Set(values)];
}

function timelineDataItem(mark, swimlane, activeTime) {
  const active = Boolean(activeTime && isActiveObservation(mark));
  const provenance = active ? provenanceSummary(mark.temporalProvenance) : null;
  const value = [
    mark.start,
    mark.end ?? mark.start,
    swimlane ? mark.lane ?? "Unassigned" : "Events",
    mark.status,
    mark.event,
  ];
  if (activeTime) {
    value.push(active ? 1 : 0, active && provenance.status !== "observed" ? 1 : 0);
  }
  return {
    name: String(mark.event),
    value,
    event: mark.event,
    start: mark.start,
    end: mark.end,
    lane: mark.lane,
    status: mark.status,
    group: mark.group,
    ...(activeTime ? { active } : {}),
    ...(provenance
      ? {
          activeTime: activeTime.canonical,
          temporalStatus: provenance.status,
          provenance,
          itemStyle: cueItemStyle(provenance.status),
          tooltip: { formatter: provenance.label },
        }
      : {}),
  };
}

function isActiveObservation(mark) {
  return mark?.active === true
    && mark.temporalProvenance?.status
    && mark.temporalProvenance.status !== "missing";
}

function provenanceSummary(provenance) {
  const status = provenance?.status ?? "missing";
  const sourceTime = formatEpoch(provenance?.sourceEpochMs);
  const lowerTime = formatEpoch(provenance?.lowerEpochMs);
  const upperTime = formatEpoch(provenance?.upperEpochMs);
  const observedTime = sourceTime ?? formatEpoch(provenance?.activeEpochMs);
  const label = bounded(
    status === "observed"
      ? `Observed ${observedTime}`
      : status === "carried"
        ? `Last measured ${sourceTime}`
        : status === "nearest"
          ? `Nearest measurement ${sourceTime}`
          : status === "interpolated"
            ? `Interpolated between ${lowerTime} and ${upperTime}`
            : "No measurement at this time",
  );
  return {
    status,
    label,
    ...(sourceTime ? { sourceTime } : {}),
    ...(lowerTime ? { lowerTime } : {}),
    ...(upperTime ? { upperTime } : {}),
  };
}

function cueItemStyle(status) {
  return {
    borderColor: "#163d73",
    borderWidth: 3,
    borderType: status === "observed" ? "solid" : "dashed",
  };
}

function formatEpoch(epochMs) {
  if (!Number.isFinite(epochMs)) return null;
  const canonical = new Date(epochMs).toISOString();
  return canonical.endsWith("T00:00:00.000Z") ? canonical.slice(0, 10) : canonical;
}

function bounded(value) {
  return value.length <= 240 ? value : `${value.slice(0, 239)}â€¦`;
}
