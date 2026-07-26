export function buildTimelineRenderModel({ chart, prepared }) {
  const swimlane = chart.typeId === "swimlane";
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
        data: prepared.marks.map((mark) => ({
          name: String(mark.event),
          value: [
            mark.start,
            mark.end ?? mark.start,
            swimlane ? mark.lane ?? "Unassigned" : "Events",
            mark.status,
          ],
          event: mark.event,
          start: mark.start,
          end: mark.end,
          lane: mark.lane,
          status: mark.status,
          group: mark.group,
        })),
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

function renderInterval(params, api) {
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
  return {
    type: "group",
    children: [
      { type: "rect", shape, style: api.style() },
      {
        type: "text",
        style: {
          text: params.name,
          x: shape.x + 4,
          y: start[1],
          verticalAlign: "middle",
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
