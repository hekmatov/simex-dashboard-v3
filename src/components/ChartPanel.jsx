import React from "react";
import ReactECharts from "echarts-for-react";

import { buildEchartsOption } from "../lib/buildEchartsOption.js";
import { validatePanelConfig } from "../lib/validateConfig.js";

function ChartPanel({
  panel,
  data,
  geoData,
  filterDefinitions,
  filterValues,
  editMode,
  isDragging,
  isDragTarget,
  isSelected,
  multiSelectMode = false,
  isMultiSelected = false,
  onEdit,
  onRemove,
  onStartSection,
  onToggleMultiSelect,
  onFullScreenHold,
  onPointerReorder,
  onPointerDragStateChange,
}) {
  const [fullScreen, setFullScreen] = React.useState(false);
  const pointerDragRef = React.useRef(null);
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
    panel.type === "mapScatter" ? "chart-panel-map" : "",
    editMode ? "chart-panel-editable" : "",
    isDragging ? "chart-panel-dragging" : "",
    isDragTarget ? "chart-panel-drag-target" : "",
    isSelected ? "chart-panel-selected" : "",
    isMultiSelected ? "chart-panel-multi-selected" : "",
    validationError ? "chart-panel-error" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <article
        data-panel-id={panel.id}
        className={articleClassName}
        style={{
          backgroundColor: panel.panelBackgroundColor,
          borderColor: panel.panelBorderColor,
        }}
        onPointerDown={(event) => startPanelPointerDrag(event, panel.id)}
        onPointerMove={movePanelPointerDrag}
        onPointerUp={endPanelPointerDrag}
        onPointerCancel={cancelPanelPointerDrag}
      >
        <PanelActionButtons
          editMode={editMode}
          infoSource={sourceNoteForPanel(panel)}
          onEdit={onEdit}
          onRemove={onRemove}
          onStartSection={onStartSection}
          multiSelectMode={multiSelectMode}
          isMultiSelected={isMultiSelected}
          onToggleMultiSelect={onToggleMultiSelect}
          onFullScreen={() => setFullScreen(true)}
          onFullScreenHold={onFullScreenHold}
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

  function startPanelPointerDrag(event, panelId) {
    const mapBorderDrag = panel.type === "mapScatter" && isNearPanelBorder(event.currentTarget, event, 20);
    if (!editMode || event.button !== 0 || (!mapBorderDrag && (panel.type === "mapScatter" || isInteractiveTarget(event.target)))) {
      return;
    }
    pointerDragRef.current = {
      panelId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function movePanelPointerDrag(event) {
    const drag = pointerDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.dragging && moved > 8) {
      drag.dragging = true;
      onPointerDragStateChange?.(drag.panelId, null);
    }
    if (!drag.dragging) {
      return;
    }
    event.preventDefault();
    const targetPanel = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".chart-panel[data-panel-id]");
    const targetPanelId = targetPanel?.dataset?.panelId;
    onPointerDragStateChange?.(drag.panelId, targetPanelId && targetPanelId !== drag.panelId ? targetPanelId : null);
  }

  function endPanelPointerDrag(event) {
    const drag = pointerDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    if (drag.dragging) {
      event.preventDefault();
      const targetPanel = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".chart-panel[data-panel-id]");
      const targetPanelId = targetPanel?.dataset?.panelId;
      if (targetPanelId && targetPanelId !== drag.panelId) {
        onPointerReorder?.(drag.panelId, targetPanelId);
      }
    }
    onPointerDragStateChange?.(null, null);
    pointerDragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function cancelPanelPointerDrag(event) {
    if (pointerDragRef.current?.pointerId === event.pointerId) {
      onPointerDragStateChange?.(null, null);
      pointerDragRef.current = null;
    }
  }
}

function isInteractiveTarget(target) {
  return Boolean(target?.closest?.("button, input, select, textarea, a, .tile-map-panel"));
}

function isNearPanelBorder(element, event, threshold) {
  const rect = element.getBoundingClientRect();
  return (
    event.clientX - rect.left <= threshold ||
    rect.right - event.clientX <= threshold ||
    event.clientY - rect.top <= threshold ||
    rect.bottom - event.clientY <= threshold
  );
}

const NON_ECHART_TYPES = new Set(["kpi", "table", "deltaList", "image"]);

function PanelActionButtons({
  editMode,
  infoSource,
  multiSelectMode,
  isMultiSelected,
  onEdit,
  onRemove,
  onStartSection,
  onToggleMultiSelect,
  onFullScreen,
  onFullScreenHold,
}) {
  const holdTimerRef = React.useRef(null);
  const holdTriggeredRef = React.useRef(false);

  function startFullScreenPress(event) {
    holdTriggeredRef.current = false;
    window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = window.setTimeout(() => {
      holdTriggeredRef.current = true;
      onFullScreenHold?.();
    }, 650);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function endFullScreenPress() {
    window.clearTimeout(holdTimerRef.current);
  }

  function clickFullScreen(event) {
    if (holdTriggeredRef.current) {
      event.preventDefault();
      return;
    }
    onFullScreen();
  }

  return (
    <div className="chart-action-buttons">
      <button
        type="button"
        className="chart-icon-button chart-fullscreen-button"
        onPointerDown={startFullScreenPress}
        onPointerUp={endFullScreenPress}
        onPointerCancel={endFullScreenPress}
        onPointerLeave={endFullScreenPress}
        onClick={clickFullScreen}
        aria-label="Fullscreen chart"
        title="Click for fullscreen. Hold for multi-fullscreen selection."
      >
        <span className="fullscreen-icon" aria-hidden="true" />
      </button>
      <span className="chart-info-control">
        <button
          type="button"
          className="chart-icon-button chart-info-button"
          aria-label="Chart information source"
        >
          i
        </button>
        <span className="chart-info-tooltip" role="tooltip">
          {infoSource}
        </span>
      </span>
      {multiSelectMode && (
        <button type="button" className="chart-edit-button" onClick={onToggleMultiSelect}>
          {isMultiSelected ? "Selected" : "Select"}
        </button>
      )}
      {editMode && (
        <>
          <button type="button" className="chart-edit-button" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="chart-edit-button" onClick={onStartSection}>
            Start section
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

export function PanelBody({ panel, data, geoData, fullScreen = false, multiFullScreen = false }) {
  const containerRef = React.useRef(null);
  const chartRef = React.useRef(null);
  const dimensions = useElementDimensions(containerRef);
  const renderContext = chartRenderContext(panel, fullScreen, dimensions, multiFullScreen);

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
  if (panel.type === "image") {
    return (
      <div
        ref={containerRef}
        className={multiFullScreen ? "chart-canvas chart-canvas-multi" : fullScreen ? "chart-canvas chart-canvas-fullscreen" : "chart-canvas"}
        style={{ backgroundColor: panel.chartAreaColor, borderColor: panel.chartAreaBorderColor }}
      >
        <ImagePanel panel={panel} fullScreen={fullScreen && !multiFullScreen} />
      </div>
    );
  }
  if (panel.type === "mapScatter") {
    return (
      <div
        ref={containerRef}
        className={multiFullScreen ? "chart-canvas chart-canvas-multi" : fullScreen ? "chart-canvas chart-canvas-fullscreen" : "chart-canvas"}
        style={{ backgroundColor: panel.chartAreaColor, borderColor: panel.chartAreaBorderColor }}
      >
        <TileMapPanel panel={panel} data={data} geoData={geoData} dimensions={dimensions} />
      </div>
    );
  }
  if (!NON_ECHART_TYPES.has(panel.type)) {
    return (
      <div
        ref={containerRef}
        className={multiFullScreen ? "chart-canvas chart-canvas-multi" : fullScreen ? "chart-canvas chart-canvas-fullscreen" : "chart-canvas"}
        style={{ backgroundColor: panel.chartAreaColor, borderColor: panel.chartAreaBorderColor }}
      >
        <ReactECharts
          ref={chartRef}
          option={buildEchartsOption(panel, data, geoData, renderContext)}
          className="chart-canvas-inner"
          style={{ height: "100%", width: "100%" }}
          opts={{ renderer: panel.type === "gauge" ? "svg" : "canvas" }}
          notMerge
        />
      </div>
    );
  }
  return null;
}

function TileMapPanel({ panel, data, geoData, dimensions }) {
  const mapRef = React.useRef(null);
  const [targetZoom, setTargetZoom] = React.useState(panel.tileZoom ?? 7);
  const [renderZoom, setRenderZoom] = React.useState(panel.tileZoom ?? 7);
  const [center, setCenter] = React.useState({
    lat: panel.tileCenterLat ?? 52.12,
    lon: panel.tileCenterLon ?? 5.28,
  });
  const dragState = React.useRef(null);
  const width = Math.max(dimensions.width || 520, 320);
  const height = Math.max(dimensions.height || 380, 260);
  const zoom = renderZoom;
  const tileZoom = Math.floor(zoom);
  const tileScale = 2 ** (zoom - tileZoom);
  const centerPixel = lonLatToGlobalPixel(center.lon, center.lat, zoom);
  const origin = {
    x: centerPixel.x - width / 2,
    y: centerPixel.y - height / 2,
  };
  const tiles = visibleTiles(origin, width, height, zoom, tileZoom, tileScale);
  const values = data.map((row) => Number(row[panel.valueField] ?? 0));
  const maxValue = Math.max(...values, 1);
  const boundaryOffsetX = 0;
  const boundaryOffsetY = 0;

  React.useEffect(() => {
    let frameId;
    function animateZoom() {
      setRenderZoom((current) => {
        const delta = targetZoom - current;
        if (Math.abs(delta) < 0.006) {
          return targetZoom;
        }
        frameId = window.requestAnimationFrame(animateZoom);
        return current + delta * 0.24;
      });
    }
    frameId = window.requestAnimationFrame(animateZoom);
    return () => window.cancelAnimationFrame(frameId);
  }, [targetZoom]);

  React.useEffect(() => {
    const element = mapRef.current;
    if (!element) {
      return undefined;
    }
    function handleNativeWheel(event) {
      event.preventDefault();
      event.stopPropagation();
      setTargetZoom((current) => clamp(current + (event.deltaY < 0 ? 0.35 : -0.35), 5, 10));
    }
    element.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleNativeWheel);
  }, []);

  function project(lon, lat) {
    const pixel = lonLatToGlobalPixel(lon, lat, zoom);
    return {
      x: pixel.x - origin.x,
      y: pixel.y - origin.y,
    };
  }

  function zoomBy(delta) {
    setTargetZoom((current) => clamp(current + delta, 5, 10));
  }

  function resetMapView() {
    const defaultZoom = panel.tileZoom ?? 7;
    setTargetZoom(defaultZoom);
    setRenderZoom(defaultZoom);
    setCenter({
      lat: panel.tileCenterLat ?? 52.12,
      lon: panel.tileCenterLon ?? 5.28,
    });
  }

  function stopMapControlEvent(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleWheel(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handlePointerDown(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCenterPixel: centerPixel,
    };
  }

  function handlePointerMove(event) {
    event.preventDefault();
    event.stopPropagation();
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const nextPixel = {
      x: drag.startCenterPixel.x - (event.clientX - drag.startX),
      y: drag.startCenterPixel.y - (event.clientY - drag.startY),
    };
    setCenter(globalPixelToLonLat(nextPixel.x, nextPixel.y, zoom));
  }

  function endDrag(event) {
    event.preventDefault();
    event.stopPropagation();
    if (dragState.current?.pointerId === event.pointerId) {
      dragState.current = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  }

  return (
    <div
      ref={mapRef}
      className="tile-map-panel"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={handleWheel}
      onDragStart={(event) => event.preventDefault()}
      style={{ "--map-width": `${width}px`, "--map-height": `${height}px` }}
    >
      <div className="tile-map-tiles" aria-hidden="true">
        {tiles.map((tile) => (
          <img
            key={`${tile.z}-${tile.x}-${tile.y}`}
            src={`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`}
            alt=""
            draggable="false"
            style={{
              left: `${tile.left}px`,
              top: `${tile.top}px`,
              width: `${tile.size}px`,
              height: `${tile.size}px`,
            }}
          />
        ))}
      </div>
      <div className="tile-map-title">{panel.title}</div>
      <svg
        className="tile-map-overlay"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={panel.title}
      >
        <g className="tile-map-boundaries" transform={`translate(${boundaryOffsetX} ${boundaryOffsetY})`}>
          {geoJsonPaths(geoData, project).map((path, index) => (
            <path key={`${panel.id}-boundary-${index}`} d={path} />
          ))}
        </g>
        <g className="tile-map-points">
          {data.map((row) => {
            const point = project(Number(row[panel.lonField]), Number(row[panel.latField]));
            const value = Number(row[panel.valueField] ?? 0);
            const radius = (10 + (value / maxValue) * 24) * (panel.pointScale ?? 1);
            return (
              <g key={`${panel.id}-${row[panel.nameField]}`} className="tile-map-point">
                <circle cx={point.x} cy={point.y} r={radius} />
                <title>{`${row[panel.nameField]}: ${formatValue(value)}`}</title>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="tile-map-controls" aria-label="Map controls">
        <button type="button" onPointerDown={stopMapControlEvent} onClick={(event) => { stopMapControlEvent(event); zoomBy(0.5); }}>
          +
        </button>
        <button type="button" onPointerDown={stopMapControlEvent} onClick={(event) => { stopMapControlEvent(event); zoomBy(-0.5); }}>
          -
        </button>
        <button type="button" title="Reset map view" onPointerDown={stopMapControlEvent} onClick={(event) => { stopMapControlEvent(event); resetMapView(); }}>
          R
        </button>
      </div>
      <div className="tile-map-credit">OpenStreetMap</div>
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

function areChartPanelPropsEqual(previous, next) {
  return (
    previous.panel === next.panel &&
    previous.data === next.data &&
    previous.geoData === next.geoData &&
    previous.filterDefinitions === next.filterDefinitions &&
    previous.filterValues === next.filterValues &&
    previous.editMode === next.editMode &&
    previous.isDragging === next.isDragging &&
    previous.isDragTarget === next.isDragTarget &&
    previous.isSelected === next.isSelected &&
    previous.multiSelectMode === next.multiSelectMode &&
    previous.isMultiSelected === next.isMultiSelected
  );
}

export default React.memo(ChartPanel, areChartPanelPropsEqual);

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

function ImagePanel({ panel, fullScreen = false }) {
  const zoom = Number(panel.imageZoom ?? 1);
  const positionX = Number(panel.imagePositionX ?? 50);
  const positionY = Number(panel.imagePositionY ?? 50);
  return (
    <div className={fullScreen ? "image-panel-content image-panel-fullscreen" : "image-panel-content"}>
      <h3>{panel.title}</h3>
      {panel.imageSrc ? (
        <div className="image-panel-frame">
          <img
            src={panel.imageSrc}
            alt={panel.imageAlt ?? panel.title ?? "Dashboard image"}
            style={{
              objectFit: panel.imageFit ?? "contain",
              objectPosition: `${positionX}% ${positionY}%`,
              transform: `scale(${zoom})`,
              transformOrigin: `${positionX}% ${positionY}%`,
            }}
          />
        </div>
      ) : (
        <p>No image uploaded yet.</p>
      )}
    </div>
  );
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

function lonLatToGlobalPixel(lon, lat, zoom) {
  const tileSize = 256;
  const scale = tileSize * 2 ** zoom;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lon + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function globalPixelToLonLat(x, y, zoom) {
  const tileSize = 256;
  const scale = tileSize * 2 ** zoom;
  const lon = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lon, lat };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function visibleTiles(origin, width, height, zoom, tileZoom = Math.floor(zoom), tileScale = 1) {
  const tileSize = 256;
  const scaledTileSize = tileSize * tileScale;
  const tileOrigin = {
    x: origin.x / tileScale,
    y: origin.y / tileScale,
  };
  const maxTile = 2 ** tileZoom;
  const minX = Math.floor(tileOrigin.x / tileSize);
  const maxX = Math.floor((tileOrigin.x + width / tileScale) / tileSize);
  const minY = Math.floor(tileOrigin.y / tileSize);
  const maxY = Math.floor((tileOrigin.y + height / tileScale) / tileSize);
  const tiles = [];

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      if (y < 0 || y >= maxTile) {
        continue;
      }
      const wrappedX = ((x % maxTile) + maxTile) % maxTile;
      tiles.push({
        x: wrappedX,
        y,
        z: tileZoom,
        left: (x * tileSize - tileOrigin.x) * tileScale,
        top: (y * tileSize - tileOrigin.y) * tileScale,
        size: scaledTileSize,
      });
    }
  }

  return tiles;
}


function geoJsonPaths(geoData, project) {
  if (!geoData?.features) {
    return [];
  }

  return geoData.features.flatMap((feature) => geometryPaths(feature.geometry, project));
}

function geometryPaths(geometry, project) {
  if (!geometry) {
    return [];
  }
  if (geometry.type === "Polygon") {
    return [polygonPath(geometry.coordinates, project)];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((polygon) => polygonPath(polygon, project));
  }
  return [];
}

function polygonPath(rings, project) {
  return rings
    .map((ring) =>
      `${ring
        .map(([lon, lat], index) => {
          const point = project(Number(lon), Number(lat));
          return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
        })
        .join(" ")} Z`,
    )
    .join(" ");
}

function normalizePanelSize(size) {
  return size === "standard" || !size ? "normal" : size;
}

function sourceNoteForPanel(panel) {
  return panel.infoSource || `Source: ${panel.dataSource ?? "dashboard configuration"}`;
}

function chartRenderContext(panel, fullScreen, dimensions, multiFullScreen = false) {
  const panelSize = normalizePanelSize(panel.size);
  const fallbackHeight = fullScreen ? 760 : panelSize === "tall" || panelSize === "large" ? 744 : 380;
  const fallbackWidth = fullScreen ? 1180 : panelSize === "half" ? 320 : panelSize === "wide" || panelSize === "large" ? 1040 : 520;
  const height = dimensions.height || fallbackHeight;
  const width = dimensions.width || fallbackWidth;
  const heightScale = height / 380;
  const widthScale = width / 520;
  const contextScale = multiFullScreen
    ? Math.max(0.95, Math.min(1.7, 1 + (heightScale - 1) * 0.32 + (widthScale - 1) * 0.12))
    : fullScreen
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





