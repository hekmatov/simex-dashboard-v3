import React from "react";

const CHART_TYPES = [
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "horizontalBar", label: "Horizontal bar" },
  { value: "groupedBar", label: "Grouped bar" },
  { value: "stackedBar", label: "Stacked bar" },
  { value: "mixed", label: "Mixed bar/line" },
  { value: "gauge", label: "Gauge" },
  { value: "mapScatter", label: "Map" },
  { value: "table", label: "Table" },
  { value: "deltaList", label: "Delta list" },
  { value: "kpi", label: "KPI cards" },
];

const COLOR_SCHEMES = [
  { value: "manual", label: "Manual series colors" },
  { value: "pdpc", label: "PDPC mixed" },
  { value: "redGreen5", label: "Likert red to green" },
  { value: "blueYellow5", label: "Likert blue to yellow" },
  { value: "cool", label: "Cool blues/teals" },
  { value: "warm", label: "Warm alert" },
];

const AXIS_PANEL_TYPES = new Set([
  "bar",
  "line",
  "area",
  "horizontalBar",
  "groupedBar",
  "stackedBar",
  "mixed",
]);
const SERIES_PANEL_TYPES = new Set([
  "bar",
  "line",
  "area",
  "horizontalBar",
  "groupedBar",
  "stackedBar",
  "mixed",
]);

export default function ChartSettingsPanel({
  panel,
  dataSources,
  dataColumns,
  dataRows = [],
  onChange,
  onClose,
  onRemove,
}) {
  const editableSeries = panel.series ?? [];
  const inferredDateColumn = inferDateColumn(dataColumns, panel);
  const dateOptions = collectDateOptions(dataRows, inferredDateColumn);
  const selectedDates = selectedDateValues(panel, inferredDateColumn, dateOptions);

  function updateSeries(index, updates) {
    onChange({
      series: editableSeries.map((series, seriesIndex) =>
        seriesIndex === index ? { ...series, ...updates } : series,
      ),
    });
  }

  function updateSeriesFrom(updates) {
    onChange({
      seriesFrom: {
        ...(panel.seriesFrom ?? {}),
        ...updates,
      },
    });
  }

  function updateFields(updates) {
    onChange({
      fields: {
        ...(panel.fields ?? {}),
        ...updates,
      },
    });
  }

  return (
    <aside className="settings-panel" aria-label="Panel settings">
      <div className="settings-panel-header">
        <div>
          <p className="eyebrow">Panel settings</p>
          <h2>{panel.title}</h2>
        </div>
        <button type="button" className="secondary" onClick={onClose}>
          Close
        </button>
      </div>

      <section className="settings-section">
        <h3>Basics</h3>
        <label>
          Title
          <input
            value={panel.title}
            onChange={(event) => onChange({ title: event.target.value })}
          />
        </label>

        <label>
          Data source
          <select
            value={panel.dataSource ?? ""}
            onChange={(event) =>
              onChange({ dataSource: event.target.value, dateSelection: undefined })
            }
          >
            <option value="">No data source</option>
            {Object.keys(dataSources ?? {}).map((sourceId) => (
              <option key={sourceId} value={sourceId}>
                {sourceId}
              </option>
            ))}
          </select>
        </label>

        <label>
          Panel type
          <select
            value={panel.type}
            onChange={(event) => onChange({ type: event.target.value })}
          >
            {CHART_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <DateSelectionControl
          column={inferredDateColumn}
          options={dateOptions}
          selectedValues={selectedDates}
          onChange={(values) =>
            onChange({
              dateSelection: inferredDateColumn
                ? { column: inferredDateColumn, values }
                : undefined,
            })
          }
        />

        <label>
          Size
          <select
            value={normalizePanelSize(panel.size)}
            onChange={(event) => onChange({ size: event.target.value })}
          >
            <option value="half">Half, 0.5 x 1</option>
            <option value="normal">Normal, 1 x 1</option>
            <option value="wide">Wide, 2 x 1</option>
            <option value="tall">Tall, 1 x 2</option>
            <option value="large">Large, 2 x 2</option>
          </select>
        </label>
      </section>

      {AXIS_PANEL_TYPES.has(panel.type) && (
        <section className="settings-section">
          <h3>Axis</h3>
          <label>
            X axis column
            <select
              value={panel.x ?? ""}
              onChange={(event) => onChange({ x: event.target.value })}
            >
              <ColumnOptions columns={dataColumns} />
            </select>
          </label>
          <label>
            X axis type
            <select
              value={panel.xAxisMode ?? "category"}
              onChange={(event) => onChange({ xAxisMode: event.target.value })}
            >
              <option value="category">Category labels</option>
              <option value="date">Date/time axis</option>
            </select>
          </label>
          <label>
            Y axis scale
            <select
              value={panel.yScale ?? "zero"}
              onChange={(event) => onChange({ yScale: event.target.value })}
            >
              <option value="zero">Start at zero</option>
              <option value="auto">Automatic</option>
            </select>
          </label>
        </section>
      )}

      {supportsColorScheme(panel.type) && (
        <section className="settings-section">
          <h3>Color</h3>
          <label>
            Color scheme
            <select
              value={panel.colorScheme ?? "manual"}
              onChange={(event) => onChange({ colorScheme: event.target.value })}
            >
              {COLOR_SCHEMES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={panel.reverseColorScheme ?? false}
              onChange={(event) => onChange({ reverseColorScheme: event.target.checked })}
            />
            Reverse scheme
          </label>
          <ColorSchemePreview scheme={panel.colorScheme} reverse={panel.reverseColorScheme} />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={panel.legend ?? true}
              onChange={(event) => onChange({ legend: event.target.checked })}
            />
            Show legend
          </label>
        </section>
      )}

      {SERIES_PANEL_TYPES.has(panel.type) && editableSeries.length > 0 && (
        <section className="settings-section settings-series-list">
          <h3>Series</h3>
          {editableSeries.map((series, index) => (
            <div className="settings-series" key={`${panel.id}-${series.y}-${index}`}>
              <label>
                Name
                <input
                  value={series.name}
                  onChange={(event) =>
                    updateSeries(index, { name: event.target.value })
                  }
                />
              </label>
              <label>
                Value column
                <select
                  value={series.y ?? ""}
                  onChange={(event) => updateSeries(index, { y: event.target.value })}
                >
                  <ColumnOptions columns={dataColumns} />
                </select>
              </label>
              <label>
                Color
                <input
                  type="color"
                  value={series.color ?? "#043BCB"}
                  onChange={(event) =>
                    updateSeries(index, { color: event.target.value })
                  }
                />
              </label>
              {isLineLike(panel.type, series.type) && (
                <label>
                  Line width
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={series.lineWidth ?? 3}
                    onChange={(event) =>
                      updateSeries(index, { lineWidth: Number(event.target.value) })
                    }
                  />
                </label>
              )}
            </div>
          ))}
        </section>
      )}

      {SERIES_PANEL_TYPES.has(panel.type) && panel.seriesFrom && (
        <section className="settings-section">
          <h3>Grouped/stacked data</h3>
          <label>
            Series name column
            <select
              value={panel.seriesFrom.nameField ?? ""}
              onChange={(event) => updateSeriesFrom({ nameField: event.target.value })}
            >
              <ColumnOptions columns={dataColumns} />
            </select>
          </label>
          <label>
            Value column
            <select
              value={panel.seriesFrom.valueField ?? ""}
              onChange={(event) => updateSeriesFrom({ valueField: event.target.value })}
            >
              <ColumnOptions columns={dataColumns} />
            </select>
          </label>
        </section>
      )}

      {panel.type === "gauge" && (
        <section className="settings-section">
          <h3>Gauge</h3>
          <label>
            Value column
            <select
              value={panel.valueField ?? ""}
              onChange={(event) => onChange({ valueField: event.target.value })}
            >
              <ColumnOptions columns={dataColumns} />
            </select>
          </label>
          <label>
            Label column
            <select
              value={panel.labelField ?? ""}
              onChange={(event) => onChange({ labelField: event.target.value })}
            >
              <ColumnOptions columns={dataColumns} />
            </select>
          </label>
          <label>
            Maximum
            <input
              type="number"
              value={panel.max ?? 100}
              onChange={(event) => onChange({ max: Number(event.target.value) })}
            />
          </label>
        </section>
      )}

      {panel.type === "mapScatter" && (
        <section className="settings-section">
          <h3>Map</h3>
          <label>
            Province/name column
            <select
              value={panel.nameField ?? ""}
              onChange={(event) => onChange({ nameField: event.target.value })}
            >
              <ColumnOptions columns={dataColumns} />
            </select>
          </label>
          <label>
            Value column
            <select
              value={panel.valueField ?? ""}
              onChange={(event) => onChange({ valueField: event.target.value })}
            >
              <ColumnOptions columns={dataColumns} />
            </select>
          </label>
          <label>
            Point scale
            <input
              type="number"
              min="0.25"
              max="3"
              step="0.25"
              value={panel.pointScale ?? 1}
              onChange={(event) => onChange({ pointScale: Number(event.target.value) })}
            />
          </label>
        </section>
      )}

      {panel.type === "table" && (
        <section className="settings-section">
          <h3>Table</h3>
          <label>
            Columns
            <input
              value={(panel.columns ?? []).join(", ")}
              onChange={(event) =>
                onChange({
                  columns: event.target.value
                    .split(",")
                    .map((column) => column.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
        </section>
      )}

      {panel.type === "deltaList" && (
        <section className="settings-section">
          <h3>Delta list</h3>
          <label>
            Title field
            <select
              value={panel.fields?.title ?? ""}
              onChange={(event) => updateFields({ title: event.target.value })}
            >
              <ColumnOptions columns={dataColumns} />
            </select>
          </label>
          <label>
            Value field
            <select
              value={panel.fields?.value ?? ""}
              onChange={(event) => updateFields({ value: event.target.value })}
            >
              <ColumnOptions columns={dataColumns} />
            </select>
          </label>
          <label>
            Rows shown
            <input
              type="number"
              min="1"
              max="50"
              value={panel.rowLimit ?? 12}
              onChange={(event) => onChange({ rowLimit: Number(event.target.value) })}
            />
          </label>
        </section>
      )}

      <section className="settings-section settings-danger-zone">
        <h3>Panel</h3>
        <button
          type="button"
          className="danger"
          onClick={() => {
            if (window.confirm("Remove this panel?")) {
              onRemove();
            }
          }}
        >
          Remove panel
        </button>
      </section>
    </aside>
  );
}

function DateSelectionControl({ column, options, selectedValues, onChange }) {
  if (!column || options.length === 0) {
    return (
      <div className="date-checklist-control">
        <span className="settings-field-label">Date range</span>
        <p className="settings-note">No date-like column was found for this data source.</p>
      </div>
    );
  }

  const selectedSet = new Set(selectedValues.map(String));

  function toggleDate(option, checked) {
    const next = new Set(selectedSet);
    if (checked) {
      next.add(String(option));
    } else {
      next.delete(String(option));
    }
    onChange(options.filter((candidate) => next.has(String(candidate))));
  }

  return (
    <div className="date-checklist-control">
      <div className="date-checklist-header">
        <span className="settings-field-label">Date range</span>
        <small>{column}</small>
      </div>
      <div className="date-checklist-actions">
        <button type="button" className="secondary" onClick={() => onChange(options)}>
          Select all
        </button>
        <button type="button" className="secondary" onClick={() => onChange([])}>
          Deselect all
        </button>
      </div>
      <div className="date-checklist" role="group" aria-label="Available dates">
        {options.map((option) => (
          <label className="date-checkbox-row" key={option}>
            <input
              type="checkbox"
              checked={selectedSet.has(String(option))}
              onChange={(event) => toggleDate(option, event.target.checked)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ColumnOptions({ columns }) {
  return (
    <>
      <option value="">Choose column</option>
      {columns.map((column) => (
        <option key={column} value={column}>
          {column}
        </option>
      ))}
    </>
  );
}

function ColorSchemePreview({ scheme = "manual", reverse = false }) {
  const colors = previewColors(scheme, reverse);
  return (
    <div className="color-scheme-preview" aria-label="Color scheme preview">
      {colors.map((color) => (
        <span key={color} style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}

function previewColors(scheme, reverse) {
  const schemes = {
    manual: ["#043BCB", "#00A676", "#4496D1", "#8F1D2C", "#7FDEC1"],
    pdpc: ["#043BCB", "#00A676", "#4496D1", "#2456A6", "#007C89"],
    redGreen5: ["#8F1D2C", "#E16B5A", "#F3D37A", "#7FDEC1", "#00A676"],
    blueYellow5: ["#08224A", "#043BCB", "#4496D1", "#F3D37A", "#C98700"],
    cool: ["#08224A", "#2456A6", "#4496D1", "#007C89", "#7FDEC1"],
    warm: ["#8F1D2C", "#C98700", "#F3D37A", "#E16B5A", "#08224A"],
  };
  const colors = schemes[scheme] ?? schemes.manual;
  return reverse ? [...colors].reverse() : colors;
}

function collectDateOptions(rows, column) {
  if (!column || !Array.isArray(rows)) {
    return [];
  }
  const values = rows
    .map((row) => row?.[column])
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(String);
  return [...new Set(values)].sort(compareDateishValues);
}

function selectedDateValues(panel, column, options) {
  const saved = panel.dateSelection;
  if (saved?.column === column && Array.isArray(saved.values)) {
    return saved.values.map(String);
  }
  return options;
}

function inferDateColumn(columns, panel) {
  if (!Array.isArray(columns) || columns.length === 0) {
    return "";
  }

  const savedColumn = panel.dateSelection?.column;
  if (savedColumn && columns.includes(savedColumn)) {
    return savedColumn;
  }

  const preferred = [panel.x, "date", "Date", "date_value", "date_label", "Snapshot", "Snapshot label"];
  const exact = preferred.find((candidate) => candidate && columns.includes(candidate));
  if (exact && isDateLikeColumn(exact)) {
    return exact;
  }

  return columns.find(isDateLikeColumn) ?? "";
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

function supportsColorScheme(type) {
  return type !== "kpi" && type !== "table" && type !== "deltaList";
}

function isLineLike(panelType, seriesType) {
  return panelType === "line" || panelType === "area" || seriesType === "line";
}

function normalizePanelSize(size) {
  return size === "standard" || !size ? "normal" : size;
}
