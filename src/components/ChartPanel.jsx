import React from "react";
import ReactECharts from "echarts-for-react";

import { buildEchartsOption } from "../lib/buildEchartsOption.js";
import { validatePanelConfig } from "../lib/validateConfig.js";

export default function ChartPanel({
  panel,
  data,
  geoData,
  filterDefinitions,
  filterValues,
  editMode,
  isDragging,
  isDragTarget,
  onEdit,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) {
  const [fullScreen, setFullScreen] = React.useState(false);
  const filteredData = applyPanelFilters(
    data ?? [],
    panel,
    panel.filters ?? [],
    filterDefinitions,
    filterValues,
  );
  const validationError = validatePanelConfig(panel, filteredData, geoData);

  const articleClassName = [
    "chart-panel",
    `chart-size-${normalizePanelSize(panel.size)}`,
    editMode ? "chart-panel-editable" : "",
    isDragging ? "chart-panel-dragging" : "",
    isDragTarget ? "chart-panel-drag-target" : "",
    validationError ? "chart-panel-error" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <article
        className={articleClassName}
        draggable={editMode}
        onDragStart={editMode ? onDragStart : undefined}
        onDragOver={editMode ? onDragOver : undefined}
        onDrop={editMode ? onDrop : undefined}
        onDragEnd={editMode ? onDragEnd : undefined}
      >
        <PanelActionButtons
          editMode={editMode}
          onEdit={onEdit}
          onRemove={onRemove}
          onFullScreen={() => setFullScreen(true)}
        />
        {validationError ? (
          <>
            <h3>{panel.title}</h3>
            <p>{validationError}</p>
          </>
        ) : (
          <PanelBody panel={panel} data={filteredData} geoData={geoData} />
        )}
      </article>

      {fullScreen && (
        <div className="fullscreen-backdrop" role="dialog" aria-modal="true">
          <article className="fullscreen-panel">
            <button
              type="button"
              className="fullscreen-close-button"
              onClick={() => setFullScreen(false)}
              aria-label="Close fullscreen chart"
            >
              Close
            </button>
            {validationError ? (
              <section className="chart-panel-error fullscreen-error">
                <h3>{panel.title}</h3>
                <p>{validationError}</p>
              </section>
            ) : (
              <PanelBody panel={panel} data={filteredData} geoData={geoData} fullScreen />
            )}
          </article>
        </div>
      )}
    </>
  );
}

const NON_ECHART_TYPES = new Set(["kpi", "table", "deltaList"]);

function PanelActionButtons({ editMode, onEdit, onRemove, onFullScreen }) {
  return (
    <div className="chart-action-buttons">
      <button
        type="button"
        className="chart-icon-button"
        onClick={onFullScreen}
        aria-label="Fullscreen chart"
        title="Fullscreen"
      >
        ⛶
      </button>
      {editMode && (
        <>
          <button type="button" className="chart-edit-button" onClick={onEdit}>
            Edit
          </button>
          <button
            type="button"
            className="chart-remove-button"
            onClick={() => {
              if (window.confirm("Remove this panel?")) {
                onRemove();
              }
            }}
          >
            Remove
          </button>
        </>
      )}
    </div>
  );
}

function PanelBody({ panel, data, geoData, fullScreen = false }) {
  const containerRef = React.useRef(null);
  const chartRef = React.useRef(null);
  const dimensions = useElementDimensions(containerRef);
  const renderContext = chartRenderContext(panel, fullScreen, dimensions);

  React.useEffect(() => {
    chartRef.current?.getEchartsInstance?.().resize();
  }, [dimensions.width, dimensions.height, fullScreen, panel.size]);

  if (panel.type === "kpi") {
    return <KpiPanel panel={panel} data={data} />;
  }
  if (panel.type === "table") {
    return <TablePanel panel={panel} data={data} />;
  }
  if (panel.type === "deltaList") {
    return <DeltaListPanel panel={panel} data={data} />;
  }
  if (!NON_ECHART_TYPES.has(panel.type)) {
    const isMapPanel = panel.type === "mapScatter";
    return (
      <div
        ref={containerRef}
        className={fullScreen ? "chart-canvas chart-canvas-fullscreen" : "chart-canvas"}
      >
        <ReactECharts
          ref={chartRef}
          option={buildEchartsOption(panel, data, geoData, renderContext)}
          className="chart-canvas-inner"
          style={{ height: "100%", width: "100%" }}
          notMerge
        />
        {isMapPanel && <MapAttribution />}
      </div>
    );
  }
  return null;
}

function MapAttribution() {
  return (
    <div className="map-attribution" aria-label="Map attribution">
      <a href="https://leafletjs.com/" target="_blank" rel="noreferrer">Leaflet</a>
      <span>|</span>
      <span>©</span>
      <a href="https://openstreetmap.org/" target="_blank" rel="noreferrer">OpenStreetMap</a>
      <span>contributors, Province boundaries: PDOK/Kadaster</span>
    </div>
  );
}

function useElementDimensions(ref) {
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return undefined;
    }

    function measure() {
      const rect = element.getBoundingClientRect();
      setDimensions({ width: Math.round(rect.width), height: Math.round(rect.height) });
    }

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(element);
    window.addEventListener("resize", measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref]);

  return dimensions;
}

function KpiPanel({ panel, data }) {
  const rows = panel.items ?? Object.entries(data[0] ?? {}).map(([label, value]) => ({ label, value }));
  return (
    <div className="kpi-panel-content">
      <h3>{panel.title}</h3>
      <div className="kpi-grid">
        {rows.map((item) => (
          <div className="kpi-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function TablePanel({ panel, data }) {
  const columns = panel.columns ?? Object.keys(data[0] ?? {});
  return (
    <div className="table-panel-content">
      <h3>{panel.title}</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={`${panel.id}-${rowIndex}`}>
                {columns.map((column) => (
                  <td key={column}>{formatValue(row[column])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeltaListPanel({ panel, data }) {
  const fields = panel.fields ?? {};
  const sortedRows = [...data].sort((a, b) => {
    const direction = panel.sortDirection === "asc" ? 1 : -1;
    const field = panel.sortBy ?? fields.value;
    return direction * (Number(a[field] ?? 0) - Number(b[field] ?? 0));
  });
  const rows = sortedRows.slice(0, panel.rowLimit ?? 12);

  return (
    <div className="delta-panel-content">
      <h3>{panel.title}</h3>
      <div className="delta-grid">
        {rows.map((row, index) => {
          const rawValue = Number(row[fields.value] ?? 0);
          const displayValue = `${rawValue >= 0 && panel.valuePrefix ? panel.valuePrefix : ""}${formatValue(rawValue)}`;
          return (
            <div className="delta-card" key={`${panel.id}-${index}`}>
              <span>{row[fields.title]}</span>
              <strong className={rawValue >= 0 ? "delta-positive" : "delta-negative"}>
                {displayValue}
              </strong>
              {fields.detail && <small>{formatValue(row[fields.detail])}</small>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function applyPanelFilters(data, panel, filters, filterDefinitions, filterValues) {
  if (!Array.isArray(data)) {
    return data;
  }

  const dateScopedRows = applyPanelDateSelection(data, panel);

  return filters.reduce((rows, filter) => {
    if (filter.equals !== undefined) {
      return rows.filter((row) => String(row[filter.column]) === String(filter.equals));
    }
    if (Array.isArray(filter.in)) {
      const allowed = new Set(filter.in.map(String));
      return rows.filter((row) => allowed.has(String(row[filter.column])));
    }
    if (!filter.filterId) {
      return rows;
    }

    const definition = filterDefinitions.find((item) => item.id === filter.filterId);
    const value = filterValues[filter.filterId];
    if (!definition || value === undefined || value === null) {
      return rows;
    }

    const filterColumn = filter.column ?? definition.column;
    if (definition.type === "dateRange" || isDateLikeColumn(filterColumn)) {
      return rows;
    }

    return rows.filter((row) => String(row[filterColumn]) === String(value));
  }, dateScopedRows);
}

function applyPanelDateSelection(data, panel) {
  const selection = panel.dateSelection;
  if (!selection?.column) {
    return data;
  }

  if (selection.mode === "range") {
    const start = String(selection.start ?? "");
    const end = String(selection.end ?? "");
    if (!start || !end) {
      return data;
    }
    return data.filter((row) => {
      const value = String(row[selection.column] ?? "");
      return compareDateishValues(value, start) >= 0 && compareDateishValues(value, end) <= 0;
    });
  }

  if (Array.isArray(selection.values)) {
    const allowed = new Set(selection.values.map(String));
    return data.filter((row) => allowed.has(String(row[selection.column])));
  }

  return data;
}

function isDateLikeColumn(column) {
  const normalized = String(column ?? "").toLowerCase();
  return normalized.includes("date") || normalized.includes("snapshot");
}

function compareDateishValues(a, b) {
  const dateA = Date.parse(a);
  const dateB = Date.parse(b);
  if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) {
    return dateA - dateB;
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

function formatValue(value) {
  if (typeof value === "number") {
    return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  return value ?? "";
}

function normalizePanelSize(size) {
  return size === "standard" || !size ? "normal" : size;
}

function chartRenderContext(panel, fullScreen, dimensions) {
  const panelSize = normalizePanelSize(panel.size);
  const fallbackHeight = fullScreen ? 760 : panelSize === "tall" || panelSize === "large" ? 744 : 380;
  const fallbackWidth = fullScreen ? 1180 : panelSize === "half" ? 320 : panelSize === "wide" || panelSize === "large" ? 1040 : 520;
  const height = dimensions.height || fallbackHeight;
  const width = dimensions.width || fallbackWidth;
  const heightScale = height / 380;
  const widthScale = width / 520;
  const contextScale = fullScreen
    ? Math.max(1.8, Math.min(2.65, 1 + (heightScale - 1) * 0.62 + (widthScale - 1) * 0.22))
    : Math.max(0.94, Math.min(1.65, 1 + (heightScale - 1) * 0.36 + (widthScale - 1) * 0.12));

  return {
    fullScreen,
    height,
    width,
    heightScale,
    widthScale,
    panelSize,
    scale: contextScale,
  };
}
