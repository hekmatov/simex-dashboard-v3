import React from "react";

const CELLS = Object.freeze([
  Object.freeze({ columns: 1, rows: 1 }),
  Object.freeze({ columns: 2, rows: 1 }),
  Object.freeze({ columns: 3, rows: 1 }),
  Object.freeze({ columns: 4, rows: 1 }),
  Object.freeze({ columns: 1, rows: 2 }),
  Object.freeze({ columns: 2, rows: 2 }),
  Object.freeze({ columns: 3, rows: 2 }),
  Object.freeze({ columns: 4, rows: 2 }),
]);

export default function ChartFootprintPicker({
  value,
  disabled = false,
  onChange,
}) {
  const current = normalizeCell(value);
  const [preview, setPreview] = React.useState(null);
  const gridRef = React.useRef(null);
  const shown = preview ?? current;

  const focusCell = (next) => {
    gridRef.current
      ?.querySelector(`[data-columns="${next.columns}"][data-rows="${next.rows}"]`)
      ?.focus();
  };
  const previewCell = (cell) => setPreview(cell);
  const clearPreview = (event) => {
    if (event?.relatedTarget && gridRef.current?.contains(event.relatedTarget)) return;
    setPreview(null);
  };

  return (
    <section className="chart-footprint-control" aria-labelledby="chart-footprint-title">
      <div className="chart-footprint-heading">
        <div>
          <span className="eyebrow">Chart size</span>
          <h3 id="chart-footprint-title">Footprint</h3>
        </div>
        <span className="chart-footprint-limit">4-column grid</span>
      </div>
      <div className="chart-footprint-picker">
        <span className="chart-footprint-corner" aria-hidden="true">Width →<br />Height ↓</span>
        <div className="chart-footprint-column-cues" aria-hidden="true">
          <span>1 col</span><span>2 cols</span><span>3 cols</span><span>4 cols</span>
        </div>
        <div className="chart-footprint-row-cues" aria-hidden="true">
          <span>1 row</span><span>2 rows</span>
        </div>
        <div
          ref={gridRef}
          className="chart-footprint-grid"
          role="grid"
          aria-label={`Chart size: ${current.columns} columns by ${current.rows} rows`}
          data-previewing={preview ? "true" : "false"}
          onMouseLeave={() => setPreview(null)}
          onBlur={clearPreview}
        >
          {CELLS.map((cell) => {
            const selected = sameCell(cell, current);
            const included = cell.columns <= shown.columns && cell.rows <= shown.rows;
            return (
              <button
                key={`${cell.columns}x${cell.rows}`}
                type="button"
                role="gridcell"
                className="chart-footprint-cell"
                data-columns={cell.columns}
                data-rows={cell.rows}
                data-included={included ? "true" : "false"}
                aria-label={`Set chart size to ${cell.columns} column${cell.columns === 1 ? "" : "s"} by ${cell.rows} row${cell.rows === 1 ? "" : "s"}`}
                aria-pressed={selected}
                tabIndex={selected ? 0 : -1}
                disabled={disabled}
                onMouseEnter={() => previewCell(cell)}
                onFocus={() => previewCell(cell)}
                onClick={() => {
                  if (!selected) onChange?.(cell);
                  setPreview(null);
                }}
                onKeyDown={(event) => {
                  const next = nextFootprintCell(cell, event.key);
                  if (sameCell(next, cell)) return;
                  event.preventDefault();
                  setPreview(next);
                  focusCell(next);
                }}
              >
                <span aria-hidden="true">{selected ? "✓" : ""}</span>
                <span>{cell.columns} × {cell.rows}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="chart-footprint-status" aria-live="polite">
        {preview
          ? `Preview: ${preview.columns} columns × ${preview.rows} rows. Click, Enter, or Space to apply.`
          : `Current footprint: ${current.columns} columns × ${current.rows} rows.`}
      </p>
    </section>
  );
}

export function nextFootprintCell(value, key) {
  const current = normalizeCell(value);
  if (key === "ArrowLeft") return { ...current, columns: Math.max(1, current.columns - 1) };
  if (key === "ArrowRight") return { ...current, columns: Math.min(4, current.columns + 1) };
  if (key === "ArrowUp") return { ...current, rows: Math.max(1, current.rows - 1) };
  if (key === "ArrowDown") return { ...current, rows: Math.min(2, current.rows + 1) };
  return current;
}

function normalizeCell(value) {
  return {
    columns: Number.isInteger(value?.columns) ? Math.min(4, Math.max(1, value.columns)) : 2,
    rows: Number.isInteger(value?.rows) ? Math.min(2, Math.max(1, value.rows)) : 1,
  };
}

function sameCell(left, right) {
  return left.columns === right.columns && left.rows === right.rows;
}
