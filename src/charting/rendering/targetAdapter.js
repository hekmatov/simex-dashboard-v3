const GAUGE_COLORS = ["#d73027", "#fdae61", "#1a9850", "#2c7bb6"];

export function buildTargetRenderModel({ chart, prepared }) {
  const activeTime = prepared.meta?.activeTime ?? null;
  if (chart.typeId === "gauge" || chart.typeId === "bullet") {
    return prepared.marks.length > 1
      ? targetCollectionModel(chart, prepared.marks, activeTime)
      : singleTargetModel(chart, prepared.marks[0], activeTime);
  }
  return cardModel(chart, prepared.marks, activeTime);
}

function targetCollectionModel(chart, marks, activeTime) {
  try {
    const identities = new Set();
    const items = marks.map((mark, index) => {
      const identity = targetIdentity(mark, index);
      if (identities.has(identity.entityId)) {
        throw new Error(
          `Repeated ${chart.typeId} observations have duplicate collection identity "${identity.label}".`,
        );
      }
      identities.add(identity.entityId);
      return targetCollectionItem(chart, mark, identity, activeTime);
    });
    return {
      kind: "targetCollection",
      items,
      presentation: {
        collection: clone(chart.presentation?.collection ?? null),
      },
    };
  } catch (cause) {
    const message = bounded(
      cause?.message || `Repeated ${chart.typeId} observations cannot be displayed as a collection.`,
    );
    return {
      kind: "error",
      message,
      diagnostics: [{
        severity: "error",
        code: "target-collection-identity-invalid",
        message,
        fieldId: "entity",
        path: ["roles", "entity"],
        relatedFieldIds: ["label", "filters"],
      }],
    };
  }
}

function targetCollectionItem(chart, mark, identity, activeTime) {
  const actual = targetActual(chart, mark);
  const provenance = activeTime && isActiveObservation(mark)
    ? provenanceSummary(mark.temporalProvenance)
    : null;
  const delta = targetDelta(mark);
  const absoluteDelta = finiteMetric(mark.absoluteDelta)
    ?? finiteMetric(mark.absoluteChange)
    ?? finiteMetric(delta?.absolute);
  const percentageDelta = finiteMetric(mark.percentageDelta)
    ?? finiteMetric(mark.percentageChange)
    ?? finiteMetric(delta?.percentage);
  const distanceFromTarget = finiteMetric(mark.distanceFromTarget)
    ?? (
      Number.isFinite(actual) && Number.isFinite(mark.target)
        ? Math.abs(actual - mark.target)
        : undefined
    );
  const miniModel = singleTargetModel(chart, mark, activeTime, true);
  return {
    entityId: identity.entityId,
    label: identity.label,
    value: actual,
    actual,
    target: mark.target ?? null,
    time: mark.time ?? null,
    delta,
    ...(absoluteDelta === undefined ? {} : { absoluteDelta }),
    ...(percentageDelta === undefined ? {} : { percentageDelta }),
    ...(distanceFromTarget === undefined ? {} : { distanceFromTarget }),
    ...(Number.isFinite(mark.riskScore) ? { riskScore: mark.riskScore } : {}),
    ...(provenance
      ? {
          activeTime: activeTime.canonical,
          temporalStatus: provenance.status,
          provenance,
        }
      : {}),
    model: {
      ...miniModel,
      semanticSummary: {
        ...miniModel.semanticSummary,
        items: miniModel.semanticSummary.items.map((item) => ({
          ...item,
          label: identity.label,
        })),
      },
    },
  };
}

function singleTargetModel(chart, mark, activeTime, embedded = false) {
  return chart.typeId === "gauge"
    ? gaugeModel(chart, mark, activeTime, embedded)
    : bulletModel(chart, mark, activeTime, embedded);
}

function gaugeModel(chart, mark, activeTime, embedded = false) {
  const ranges = chart.presentation?.targets?.ranges ?? [];
  const rangeMaximum = Math.max(0, ...ranges.map(rangeEnd).filter(Number.isFinite));
  const maximum = Math.max(
    100,
    rangeMaximum,
    finite(mark?.value),
    finite(mark?.target),
  );
  const name = mark?.entity ?? mark?.label ?? chart.title ?? "";
  return {
    kind: "echarts",
    semanticSummary: targetSemanticSummary(chart, mark ? [mark] : [], activeTime, embedded),
    ...(embedded
      ? {}
      : {
          presentation: {
            collection: clone(chart.presentation?.collection ?? null),
          },
        }),
    option: {
      ...(embedded ? {} : { title: titleOption(chart) }),
      aria: { enabled: true, description: chart.description ?? chart.title ?? "" },
      series: mark
        ? [{
          name,
          type: "gauge",
          min: 0,
          max: maximum,
          center: ["50%", embedded ? "58%" : "54%"],
          radius: embedded ? "68%" : "52%",
          axisLine: { lineStyle: { color: gaugeSegments(ranges, maximum) } },
          axisLabel: { show: false },
          axisTick: { show: false },
          splitLine: { distance: -9, length: 8 },
          pointer: { length: "56%", width: 4 },
          detail: {
            valueAnimation: false,
            fontSize: embedded ? 26 : 32,
            offsetCenter: [0, "38%"],
            ...(embedded ? {} : { formatter: formatTargetValue }),
          },
          title: {
            show: !embedded && Boolean(name),
            fontSize: 12,
            offsetCenter: [0, "76%"],
          },
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
        }]
        : [],
    },
  };
}

function bulletModel(chart, mark, activeTime, embedded = false) {
  const label = mark?.entity ?? mark?.label ?? chart.title ?? "Item";
  return {
    kind: "echarts",
    semanticSummary: targetSemanticSummary(chart, mark ? [mark] : [], activeTime, embedded),
    ...(embedded
      ? {}
      : {
          presentation: {
            collection: clone(chart.presentation?.collection ?? null),
          },
        }),
    option: {
      ...(embedded ? {} : { title: titleOption(chart) }),
      aria: { enabled: true, description: chart.description ?? chart.title ?? "" },
      tooltip: { trigger: "axis" },
      ...(embedded
        ? {}
        : { grid: { containLabel: true, left: 72, right: 36, top: 76, bottom: 42 } }),
      xAxis: { type: "value" },
      yAxis: { type: "category", data: mark ? [label] : [] },
      series: [
        {
          name: "Actual",
          type: "bar",
          data: mark
            ? [activeTime && isActiveObservation(mark)
                ? targetDataItem(mark, { value: mark.actual }, activeTime)
                : mark.actual]
            : [],
          z: 2,
        },
        {
          name: "Target",
          type: "scatter",
          symbol: "rect",
          symbolSize: [4, 24],
          data: mark
            ? [{
                value: [mark.target, label],
                time: mark.time,
              }]
            : [],
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

function targetSemanticSummary(chart, marks, activeTime, embedded = false) {
  return {
    collection: embedded ? null : clone(chart.presentation?.collection ?? null),
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

function targetIdentity(mark, index) {
  const entity = identityValue(mark.entity, "entity", index);
  const label = identityValue(mark.label, "label", index);
  if (entity === null && label === null) {
    throw new Error(
      `Repeated target item ${index + 1} requires a stable entity or label identity. Assign an Entity or Label role, or filter to one item.`,
    );
  }
  const displayLabel = identityLabel(entity, label);
  return {
    entityId: `target:${JSON.stringify(String(entity ?? label))}`,
    label: displayLabel,
  };
}

function identityValue(value, role, index) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    const normalized = value.trim().normalize();
    if (normalized === "") {
      throw new Error(
        `Repeated target item ${index + 1} ${role} identity must not be blank.`,
      );
    }
    return normalized;
  }
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new Error(
    `Repeated target item ${index + 1} ${role} identity must be text, a finite number, or a boolean.`,
  );
}

function identityLabel(entity, label) {
  if (entity !== null && label !== null && String(entity) !== String(label)) {
    return `${String(entity)} — ${String(label)}`;
  }
  return String(entity ?? label);
}

function targetActual(chart, mark) {
  return chart.typeId === "bullet" ? mark.actual : mark.value;
}

function targetDelta(mark) {
  if (mark.delta === null || mark.delta === undefined) return null;
  return clone(mark.delta);
}

function finiteMetric(value) {
  return Number.isFinite(value) ? value : undefined;
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

function formatTargetValue(value) {
  if (!Number.isFinite(Number(value))) return String(value ?? "");
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number(value));
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
