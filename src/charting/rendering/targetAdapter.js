const GAUGE_COLORS = ["#d73027", "#fdae61", "#1a9850", "#2c7bb6"];

export function buildTargetRenderModel({ chart, prepared }) {
  const activeTime = prepared.meta?.activeTime ?? null;
  if (chart.typeId === "gauge") return gaugeModel(chart, prepared.marks, activeTime);
  if (chart.typeId === "bullet") return bulletModel(chart, prepared.marks, activeTime);
  return cardModel(chart, prepared.marks, activeTime);
}

function gaugeModel(chart, marks, activeTime) {
  const ranges = chart.presentation?.targets?.ranges ?? [];
  const rangeMaximum = Math.max(0, ...ranges.map(rangeEnd).filter(Number.isFinite));
  const maximum = Math.max(
    100,
    rangeMaximum,
    ...marks.flatMap(({ value, target }) => [finite(value), finite(target)]),
  );
  const layout = gaugeLayout(chart.presentation?.collection, marks.length);
  return {
    kind: "echarts",
    semanticSummary: targetSemanticSummary(chart, marks, activeTime),
    presentation: {
      collection: clone(chart.presentation?.collection ?? null),
    },
    option: {
      title: titleOption(chart),
      aria: { enabled: true, description: chart.description ?? chart.title ?? "" },
      series: marks.map((mark, index) => {
        const name = mark.entity ?? mark.label ?? chart.title ?? "";
        return {
          name,
          type: "gauge",
          min: 0,
          max: maximum,
          center: layout.centers[index],
          radius: layout.radius,
          axisLine: { lineStyle: { color: gaugeSegments(ranges, maximum) } },
          detail: { valueAnimation: true },
          title: { show: Boolean(name) },
          data: [targetDataItem(
            mark,
            {
              value: mark.value,
              name,
              target: mark.target,
              time: mark.time,
            },
            activeTime,
          )],
        };
      }),
    },
  };
}

function gaugeLayout(collection, count) {
  const columns = collection?.columns ?? Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = collection?.rows ?? Math.max(1, Math.ceil(count / columns));
  return {
    centers: Array.from({ length: count }, (_, index) => [
      `${((index % columns + 0.5) / columns) * 100}%`,
      `${((Math.floor(index / columns) + 0.5) / rows) * 100}%`,
    ]),
    radius: `${Math.max(12, Math.min(38, 36 / Math.max(columns, rows)))}%`,
  };
}

function bulletModel(chart, marks, activeTime) {
  const categories = marks.map((mark, index) => mark.entity ?? mark.label ?? `Item ${index + 1}`);
  return {
    kind: "echarts",
    semanticSummary: targetSemanticSummary(chart, marks, activeTime),
    option: {
      title: titleOption(chart),
      aria: { enabled: true, description: chart.description ?? chart.title ?? "" },
      tooltip: { trigger: "axis" },
      grid: { containLabel: true, left: 72, right: 36, top: 76, bottom: 42 },
      xAxis: { type: "value" },
      yAxis: { type: "category", data: categories },
      series: [
        {
          name: "Actual",
          type: "bar",
          data: marks.map((mark) => (
            activeTime && isActiveObservation(mark)
              ? targetDataItem(mark, { value: mark.actual }, activeTime)
              : mark.actual
          )),
          z: 2,
        },
        {
          name: "Target",
          type: "scatter",
          symbol: "rect",
          symbolSize: [4, 24],
          data: marks.map((mark, index) => ({
            value: [mark.target, categories[index]],
            time: mark.time,
          })),
          z: 3,
        },
      ],
    },
  };
}

function cardModel(chart, marks, activeTime) {
  const delta = chart.typeId === "deltaCard" || chart.typeId === "deltaList";
  return {
    kind: "cards",
    items: marks.map((mark, index) => (
      delta
        ? deltaItem(chart, mark, index, activeTime)
        : kpiItem(chart, mark, index, activeTime)
    )),
    presentation: {
      collection: clone(chart.presentation?.collection ?? null),
      labels: clone(chart.presentation?.labels ?? null),
      accessibility: clone(chart.presentation?.accessibility ?? null),
    },
  };
}

function kpiItem(chart, mark, index, activeTime) {
  const identity = mark.entity ?? mark.label;
  const provenance = activeTime && isActiveObservation(mark)
    ? provenanceSummary(mark.temporalProvenance)
    : null;
  return {
    key: String(identity ?? `kpi-${index}`),
    label: identity ?? chart.title ?? "KPI",
    value: mark.value,
    target: mark.target ?? null,
    time: mark.time ?? null,
    comparison: null,
    delta: null,
    direction: null,
    favorability: null,
    ...(provenance
      ? {
          activeTime: activeTime.canonical,
          temporalStatus: provenance.status,
          provenance,
        }
      : {}),
  };
}

function deltaItem(chart, mark, index, activeTime) {
  const absolute = mark.delta?.absolute;
  const direction = absolute > 0 ? "increase" : absolute < 0 ? "decrease" : "unchanged";
  const favorableDirection = chart.presentation?.targets?.direction ?? "neutral";
  const provenance = activeTime && isActiveObservation(mark)
    ? provenanceSummary(mark.temporalProvenance)
    : mark.displayedProvenance
      ? provenanceSummary(mark.displayedProvenance)
      : null;
  const comparisonSource = mark.temporalProvenance?.comparison
    ?? mark.comparisonProvenance;
  const comparisonProvenance = comparisonSource
    ? provenanceSummary(comparisonSource)
    : null;
  return {
    key: String(mark.entity ?? `${chart.typeId}-${index}`),
    label: mark.entity ?? chart.title ?? "Change",
    value: mark.displayed,
    target: mark.target ?? null,
    time: mark.displayedTime ?? mark.time ?? null,
    comparison: mark.comparison,
    comparisonTime: mark.comparisonTime ?? null,
    delta: clone(mark.delta ?? { absolute: null, percentage: null }),
    direction,
    favorability: favorability(direction, favorableDirection),
    ...(provenance
      ? {
          ...(activeTime ? { activeTime: activeTime.canonical } : {}),
          temporalStatus: provenance.status,
          provenance,
        }
      : {}),
    ...(comparisonProvenance ? { comparisonProvenance } : {}),
  };
}

function targetSemanticSummary(chart, marks, activeTime) {
  return {
    collection: clone(chart.presentation?.collection ?? null),
    items: marks.map((mark, index) => {
      const provenance = activeTime && isActiveObservation(mark)
        ? provenanceSummary(mark.temporalProvenance)
        : null;
      return {
        label: mark.entity ?? mark.label ?? chart.title ?? `Item ${index + 1}`,
        actual: mark.value ?? mark.actual ?? null,
        target: mark.target ?? null,
        time: mark.time ?? null,
        ...(provenance
          ? {
              activeTime: activeTime.canonical,
              temporalStatus: provenance.status,
              provenance,
            }
          : {}),
      };
    }),
  };
}

function favorability(direction, favorableDirection) {
  if (direction === "unchanged" || favorableDirection === "neutral") return "neutral";
  const favorableMovement = favorableDirection === "increase-is-good" ? "increase" : "decrease";
  return direction === favorableMovement ? "favorable" : "unfavorable";
}

function gaugeSegments(ranges, maximum) {
  if (!ranges.length) return [[1, GAUGE_COLORS[2]]];
  return ranges
    .map((range, index) => [
      Math.min(1, Math.max(0, rangeEnd(range) / maximum)),
      typeof range === "object" && range?.color ? range.color : GAUGE_COLORS[index % GAUGE_COLORS.length],
    ])
    .sort((left, right) => left[0] - right[0]);
}

function rangeEnd(range) {
  return Number(typeof range === "object" && range !== null ? range.max ?? range.to ?? range.value : range);
}

function finite(value) {
  return Number.isFinite(value) ? value : 0;
}

function titleOption(chart) {
  return { text: chart.title ?? "", left: chart.presentation?.title?.align ?? "left" };
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function targetDataItem(mark, data, activeTime) {
  if (!activeTime || !isActiveObservation(mark)) return data;
  const provenance = provenanceSummary(mark.temporalProvenance);
  return {
    ...data,
    active: true,
    activeTime: activeTime.canonical,
    temporalStatus: provenance.status,
    provenance,
    itemStyle: cueItemStyle(provenance.status),
    tooltip: { formatter: provenance.label },
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
    treatment: status === "observed" ? "solid" : "hollow-dashed",
    ...(sourceTime ? { sourceTime } : {}),
    ...(lowerTime ? { lowerTime } : {}),
    ...(upperTime ? { upperTime } : {}),
  };
}

function cueItemStyle(status) {
  return {
    borderColor: "#2456a6",
    borderWidth: 2,
    borderType: status === "observed" ? "solid" : "dashed",
    ...(status === "observed" ? {} : { color: "#ffffff" }),
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
