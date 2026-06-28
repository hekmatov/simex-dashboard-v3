import * as echarts from "echarts";

const DEFAULT_TEXT_COLOR = "#08224A";
const DEFAULT_GRID = {
  left: 58,
  right: 36,
  top: 86,
  bottom: 58,
};
const COLOR_SCHEMES = {
  manual: ["#043BCB", "#00A676", "#4496D1", "#2456A6", "#007C89", "#08224A", "#7FDEC1", "#8F1D2C"],
  pdpc: ["#043BCB", "#00A676", "#4496D1", "#2456A6", "#007C89", "#08224A", "#7FDEC1", "#8F1D2C"],
  redGreen5: ["#8F1D2C", "#E16B5A", "#F3D37A", "#7FDEC1", "#00A676"],
  blueYellow5: ["#08224A", "#043BCB", "#4496D1", "#F3D37A", "#C98700"],
  cool: ["#08224A", "#2456A6", "#4496D1", "#007C89", "#7FDEC1"],
  warm: ["#8F1D2C", "#C98700", "#F3D37A", "#E16B5A", "#08224A"],
};

export function buildEchartsOption(panel, data, geoData, renderContext = {}) {
  const scale = renderContext.scale ?? 1;
  if (panel.type === "gauge") {
    return buildGaugeOption(panel, data, scale);
  }

  if (panel.type === "mapScatter") {
    return buildMapOption(panel, data, geoData, scale);
  }

  const isHorizontal = panel.type === "horizontalBar" || panel.type === "horizontalStackedBar";
  const xAxisIsDate = panel.xAxisMode === "date" || isDateLikeField(panel.x);
  const useDateAxis = xAxisIsDate && !isHorizontal;
  const sortedData = sortRowsForAxis(data, panel.x, useDateAxis);
  const labels = uniqueValues(sortedData.map((row) => row[panel.x]));
  const colors = panelColors(panel);
  const series = buildSeries(panel, sortedData, labels, colors, useDateAxis, scale);
  const hasSecondAxis = series.some((item) => item.yAxisIndex === 1);

  const valueAxis = {
    type: "value",
    min: panel.yScale === "auto" ? undefined : 0,
    axisLabel: { color: DEFAULT_TEXT_COLOR, fontSize: fontSize(panel, "axis", 12, scale) },
    nameTextStyle: { color: DEFAULT_TEXT_COLOR, fontSize: fontSize(panel, "axis", 12, scale) },
    splitLine: { lineStyle: { color: "rgba(8, 34, 74, 0.08)" } },
  };
  const categoryAxis = {
    type: useDateAxis ? "time" : "category",
    data: useDateAxis ? undefined : isHorizontal ? [...labels].reverse() : labels,
    axisLabel: {
      color: DEFAULT_TEXT_COLOR,
      fontSize: fontSize(panel, "axis", 12, scale),
      interval: useDateAxis ? undefined : 0,
      hideOverlap: useDateAxis ? undefined : false,
    },
    axisTick: { alignWithLabel: true },
  };

  return {
    color: colors,
    title: chartTitle(panel, scale),
    tooltip: {
      trigger: "axis",
      valueFormatter: formatTooltipValue,
    },
    legend: {
      show: panel.legend ?? true,
      top: scaled(34, scale),
      right: 0,
      type: "scroll",
      textStyle: { color: DEFAULT_TEXT_COLOR, fontSize: fontSize(panel, "legend", 12, scale) },
    },
    grid: scaledGrid(scale),
    xAxis: isHorizontal ? valueAxis : categoryAxis,
    yAxis: isHorizontal
      ? categoryAxis
      : hasSecondAxis
        ? [valueAxis, { ...valueAxis, name: panel.secondaryAxisTitle ?? "", splitLine: { show: false } }]
        : valueAxis,
    series: series.map((item) => ({
      ...item,
      data: isHorizontal ? [...item.data].reverse() : item.data,
      markLine: referenceLineConfig(panel.referenceLines),
    })),
  };
}

function buildSeries(panel, data, labels, colors, useDateAxis, scale) {
  if (panel.seriesFrom) {
    return buildSeriesFromLongData(panel, data, labels, colors, useDateAxis, scale);
  }

  return (panel.series ?? []).map((item, index) => {
    const color = seriesColor(panel, item, colors, index);
    return {
      name: item.name,
      type: seriesType(panel.type, item.type),
      yAxisIndex: item.yAxisIndex,
      data: useDateAxis
        ? data.map((row) => [row[panel.x], toNumber(row?.[item.y])])
        : labels.map((label) => {
            const row = data.find((candidate) => candidate[panel.x] === label);
            return toNumber(row?.[item.y]);
          }),
      itemStyle: { color },
      lineStyle: {
        color,
        width: scaled(item.lineWidth ?? 3, scale),
        type: item.lineStyle ?? "solid",
      },
      areaStyle: panel.type === "area" ? { opacity: 0.18 } : undefined,
      smooth: item.smooth ?? false,
      stack: isStackedPanel(panel.type) ? "total" : undefined,
    };
  });
}

function buildSeriesFromLongData(panel, data, labels, colors, useDateAxis, scale) {
  const nameField = panel.seriesFrom.nameField;
  const valueField = panel.seriesFrom.valueField;
  const names = uniqueValues(data.map((row) => row[nameField]));

  return names.map((name, index) => ({
    name,
    type: panel.type === "line" || panel.type === "area" ? "line" : "bar",
    data: useDateAxis
      ? data
          .filter((row) => String(row[nameField]) === String(name))
          .map((row) => [row[panel.x], toNumber(row[valueField])])
      : labels.map((label) =>
          data
            .filter((row) => row[panel.x] === label && String(row[nameField]) === String(name))
            .reduce((sum, row) => sum + toNumber(row[valueField]), 0),
        ),
    itemStyle: { color: colors[index % colors.length] },
    lineStyle: { color: colors[index % colors.length], width: scaled(3, scale) },
    areaStyle: panel.type === "area" ? { opacity: 0.18 } : undefined,
    stack: isStackedPanel(panel.type) ? "total" : undefined,
  }));
}

function buildGaugeOption(panel, data, scale) {
  const row = data[0] ?? {};
  const value = toNumber(row[panel.valueField]);
  const color = row[panel.colorField] ?? panel.color ?? panelColors(panel)[0];

  return {
    title: chartTitle(panel, scale),
    series: [
      {
        type: "gauge",
        min: 0,
        max: panel.max ?? 100,
        radius: "90%",
        progress: { show: true, width: scaled(16, scale), itemStyle: { color } },
        axisLine: { lineStyle: { width: scaled(16, scale), color: [[1, "#DDEAF5"]] } },
        axisTick: { show: false },
        splitLine: { length: scaled(10, scale), lineStyle: { color: DEFAULT_TEXT_COLOR } },
        axisLabel: { color: DEFAULT_TEXT_COLOR, fontSize: fontSize(panel, "gaugeAxis", 12, scale) },
        pointer: { itemStyle: { color } },
        detail: {
          valueAnimation: true,
          formatter: "{value}%",
          color: DEFAULT_TEXT_COLOR,
          fontSize: fontSize(panel, "gaugeValue", 28, scale),
          offsetCenter: [0, "62%"],
        },
        title: {
          color: DEFAULT_TEXT_COLOR,
          fontSize: fontSize(panel, "gaugeLabel", 13, scale),
          offsetCenter: [0, "86%"],
        },
        data: [{ value, name: row[panel.labelField] ?? panel.title }],
      },
    ],
  };
}

function buildMapOption(panel, data, geoData, scale) {
  const mapName = panel.mapName ?? "dashboard-map";
  if (geoData) {
    echarts.registerMap(mapName, normalizeGeoJson(geoData));
  }
  const colors = panelColors(panel);
  const values = data.map((row) => toNumber(row[panel.valueField]));
  const maxValue = Math.max(...values, 1);
  const pointScale = panel.pointScale ?? 1;

  return {
    title: chartTitle(panel, scale),
    tooltip: {
      trigger: "item",
      formatter: (params) => {
        if (Array.isArray(params.value)) {
          return `${params.name}<br/>${formatTooltipValue(params.value[2])}`;
        }
        return params.name;
      },
    },
    geo: {
      map: mapName,
      roam: true,
      layoutCenter: ["50%", "56%"],
      layoutSize: "92%",
      itemStyle: {
        color: "#EEF5F9",
        borderColor: "#6F8DA3",
        borderWidth: scaled(1.2, scale),
      },
      emphasis: {
        label: { show: true, color: DEFAULT_TEXT_COLOR, fontSize: fontSize(panel, "mapLabel", 12, scale) },
        itemStyle: { color: "#D5E6F5", borderColor: "#2456A6" },
      },
    },
    visualMap: {
      min: 0,
      max: maxValue,
      left: 0,
      bottom: scaled(22, scale),
      text: ["High", "Low"],
      calculable: true,
      textStyle: { color: DEFAULT_TEXT_COLOR, fontSize: fontSize(panel, "legend", 12, scale) },
      inRange: { color: [colors[0], colors[colors.length - 1]] },
    },
    series: [
      {
        name: panel.title,
        type: "scatter",
        coordinateSystem: "geo",
        symbolSize: (value) => (10 + (toNumber(value[2]) / maxValue) * 34) * pointScale * scale,
        itemStyle: {
          color: (params) => caseMapColor(toNumber(params.value?.[2]), maxValue),
          opacity: 0.72,
          borderColor: "#F8FBFF",
          borderWidth: scaled(2, scale),
        },
        data: data.map((row) => ({
          name: row[panel.nameField],
          value: [
            toNumber(row[panel.lonField]),
            toNumber(row[panel.latField]),
            toNumber(row[panel.valueField]),
          ],
        })),
      },
    ],
  };
}

function caseMapColor(value, maxValue) {
  const intensity = maxValue ? value / maxValue : 0;
  if (intensity >= 0.7) {
    return "#043BCB";
  }
  if (intensity >= 0.4) {
    return "#2456A6";
  }
  return "#007C89";
}

function normalizeGeoJson(geoData) {
  if (!geoData?.features) {
    return geoData;
  }

  return {
    ...geoData,
    features: geoData.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        name: feature.properties?.name ?? feature.properties?.statnaam,
      },
    })),
  };
}

function chartTitle(panel, scale = 1) {
  return {
    text: panel.title,
    left: 0,
    textStyle: {
      color: DEFAULT_TEXT_COLOR,
      fontSize: fontSize(panel, "title", 17, scale),
      fontWeight: 700,
    },
  };
}

function seriesType(panelType, itemType) {
  if (itemType) {
    return itemType;
  }
  if (["bar", "groupedBar", "stackedBar", "horizontalBar", "horizontalStackedBar"].includes(panelType)) {
    return "bar";
  }
  if (panelType === "area") {
    return "line";
  }
  return panelType === "mixed" ? "line" : panelType;
}

function isStackedPanel(panelType) {
  return panelType === "stackedBar" || panelType === "horizontalStackedBar";
}

function isDateLikeField(field) {
  const normalized = String(field ?? "").toLowerCase();
  return normalized.includes("date") || normalized.includes("snapshot");
}

function referenceLineConfig(referenceLines) {
  if (!referenceLines?.length) {
    return undefined;
  }
  return {
    symbol: "none",
    data: referenceLines.map((line) => ({ yAxis: line.y, name: line.label })),
    lineStyle: { type: "dashed", color: "rgba(8, 34, 74, 0.55)" },
  };
}


function fontSize(panel, key, baseSize, scale) {
  const customSize = Number(panel.fontSizes?.[key]);
  const resolvedBase = Number.isFinite(customSize) ? customSize : baseSize;
  return scaled(resolvedBase, scale);
}
function scaled(value, scale) {
  return Math.round(value * scale);
}

function scaledGrid(scale) {
  return {
    left: scaled(DEFAULT_GRID.left, scale),
    right: scaled(DEFAULT_GRID.right, Math.min(scale, 1.25)),
    top: scaled(DEFAULT_GRID.top, scale),
    bottom: scaled(DEFAULT_GRID.bottom, scale),
  };
}

function panelColors(panel) {
  const base = COLOR_SCHEMES[panel.colorScheme ?? "manual"] ?? COLOR_SCHEMES.manual;
  return panel.reverseColorScheme ? [...base].reverse() : base;
}

function seriesColor(panel, item, colors, index) {
  if ((panel.colorScheme ?? "manual") === "manual" && item.color) {
    return item.color;
  }
  return colors[index % colors.length];
}

function uniqueValues(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null))];
}

function sortRowsForAxis(data, xField, useDateAxis) {
  if (!useDateAxis) {
    return data;
  }
  return [...data].sort((a, b) => new Date(a[xField]).getTime() - new Date(b[xField]).getTime());
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatTooltipValue(value) {
  return typeof value === "number" ? value.toLocaleString() : value;
}
