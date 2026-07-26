export function buildCompositionRenderModel({ chart, prepared }) {
  const groups = groupMarks(prepared.marks);
  return {
    kind: "echarts",
    option: {
      title: titleOption(chart),
      aria: { enabled: true, description: chart.description ?? chart.title ?? "" },
      tooltip: { trigger: "item" },
      legend: { show: chart.presentation?.legend?.visible !== false },
      series: groups.map(({ name, marks }) => ({
        name,
        type: "pie",
        radius: chart.typeId === "donut" ? ["42%", "72%"] : ["0%", "72%"],
        avoidLabelOverlap: true,
        label: { show: chart.presentation?.labels?.visible !== false },
        data: marks.map(({ category, value, share }) => ({ name: String(category), value, share })),
      })),
    },
  };
}

function groupMarks(marks) {
  const groups = new Map();
  for (const mark of marks) {
    const key = String(mark.groupKey ?? mark.group ?? "");
    if (!groups.has(key)) groups.set(key, { name: mark.group ?? "Composition", marks: [] });
    groups.get(key).marks.push(mark);
  }
  return [...groups.values()];
}

function titleOption(chart) {
  return { text: chart.title ?? "", left: chart.presentation?.title?.align ?? "left" };
}
