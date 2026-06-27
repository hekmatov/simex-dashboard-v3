import React from "react";

const CHART_TYPES = [
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "horizontalBar", label: "Horizontal bar" },
];

export default function ChartSettingsPanel({ chart, onChange, onClose }) {
  function updateSeries(index, updates) {
    onChange({
      series: chart.series.map((series, seriesIndex) =>
        seriesIndex === index ? { ...series, ...updates } : series,
      ),
    });
  }

  return (
    <aside className="settings-panel" aria-label="Chart settings">
      <div className="settings-panel-header">
        <div>
          <p className="eyebrow">Chart settings</p>
          <h2>{chart.title}</h2>
        </div>
        <button type="button" className="secondary" onClick={onClose}>
          Close
        </button>
      </div>

      <label>
        Title
        <input
          value={chart.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </label>

      <label>
        Chart type
        <select
          value={chart.type}
          onChange={(event) => onChange({ type: event.target.value })}
        >
          {CHART_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Size
        <select
          value={chart.size ?? "standard"}
          onChange={(event) => onChange({ size: event.target.value })}
        >
          <option value="standard">Standard</option>
          <option value="wide">Wide</option>
        </select>
      </label>

      <label>
        Axis scale
        <select
          value={chart.yScale ?? "zero"}
          onChange={(event) => onChange({ yScale: event.target.value })}
        >
          <option value="zero">Start at zero</option>
          <option value="auto">Automatic</option>
        </select>
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={chart.legend ?? true}
          onChange={(event) => onChange({ legend: event.target.checked })}
        />
        Show legend
      </label>

      <section className="settings-series-list">
        <h3>Series</h3>
        {chart.series.map((series, index) => (
          <div className="settings-series" key={`${chart.id}-${series.y}`}>
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
              Color
              <input
                type="color"
                value={series.color}
                onChange={(event) =>
                  updateSeries(index, { color: event.target.value })
                }
              />
            </label>
          </div>
        ))}
      </section>
    </aside>
  );
}
