import React from "react";

import {
  FOOTPRINT_ROW_HEIGHTS,
  resolveChartFootprint,
} from "../chartPanelLayout.js";

const WIDTHS = Object.freeze([1, 2, 3, 4]);

export default function ChartFootprintPicker({
  subject = "Chart",
  idPrefix = "chart",
  value,
  disabled = false,
  showTextLabels = true,
  maxRows = 2,
  rowHeights: availableRowHeights = FOOTPRINT_ROW_HEIGHTS,
  onChange,
}) {
  const rowHeights = availableRowHeights.filter((rows) => rows <= maxRows);
  const current = normalizeFootprint(value, rowHeights);
  const subjectLabel = String(subject || "Chart");
  const titleId = `${idPrefix}-footprint-title`;
  const widthId = `${idPrefix}-footprint-width`;
  const rowHeightId = `${idPrefix}-footprint-row-height`;
  const rowHeightLabel = describeRowHeight(current.rows);
  const previewHeight = `${Math.round(current.rows * 100)}%`;

  const update = (updates) => onChange?.({ ...current, ...updates });

  return (
    <section className="chart-footprint-control" aria-labelledby={titleId}>
      <div className="chart-footprint-heading">
        <div>
          <span
            id={showTextLabels ? undefined : titleId}
            className={showTextLabels ? "eyebrow" : "dashboard-dialog__eyebrow"}
          >
            {subjectLabel} size
          </span>
          {showTextLabels && <h3 id={titleId}>Footprint</h3>}
        </div>
        {showTextLabels && <span className="chart-footprint-limit">4 × 2 guide</span>}
      </div>
      <div className="chart-footprint-picker">
        <div className="chart-footprint-inputs">
          <label className="chart-footprint-input" htmlFor={widthId}>
            <span>Width</span>
            <select
              id={widthId}
              value={current.columns}
              disabled={disabled}
              onChange={(event) => update({ columns: Number(event.target.value) })}
            >
              {WIDTHS.map((columns) => (
                <option key={columns} value={columns}>
                  {columns} {columns === 1 ? "column" : "columns"}
                </option>
              ))}
            </select>
          </label>
          <label className="chart-footprint-input" htmlFor={rowHeightId}>
            <span>Row height</span>
            <select
              id={rowHeightId}
              value={String(current.rows)}
              disabled={disabled}
              onChange={(event) => update({ rows: Number(event.target.value) })}
            >
              {rowHeights.map((rows) => (
                <option key={rows} value={rows}>
                  {describeRowHeight(rows)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          className="chart-footprint-preview"
          data-footprint-preview="true"
          role="img"
          aria-label={`${subjectLabel} size: ${current.columns} columns by ${rowHeightLabel}`}
          style={{
            "--footprint-preview-columns": current.columns,
            "--footprint-preview-width": `${current.columns * 25}%`,
            "--footprint-preview-height": previewHeight,
            "--footprint-preview-visual-height": `${current.rows * 50}%`,
          }}
        >
          <span className="chart-footprint-preview__selection" aria-hidden="true" />
        </div>
      </div>
      {showTextLabels && (
        <p className="chart-footprint-status">
          Current footprint: {current.columns} columns × {rowHeightLabel}.
        </p>
      )}
    </section>
  );
}

export function describeRowHeight(rows) {
  return `${rows * 100}% of a row`;
}

function normalizeFootprint(value, rowHeights) {
  const footprint = resolveChartFootprint({
    width: value?.columns,
    height: value?.rows,
  });
  return rowHeights.includes(footprint.rows)
    ? footprint
    : { ...footprint, rows: 1 };
}
