import React from "react";
import ColorField from "../ColorField.jsx";
import ControlTooltip from "../common/ControlTooltip.js";
import { captureSeriesColors, spreadCategoryGradient } from "../../charting/presentation/categorySeriesPresentation.js";

const ORDER_DRAG_TYPE = "application/x-simex-presentation-order";
const LEGEND_HELP = "Hiding a legend entry leaves its plotted data visible. Clear a name to restore the generated label.";

export default function CategorySeriesPresentationFields({ field, chart, onChange }) {
  const ordering = field.control === "presentationOrder";
  const legend = field.control === "legendEntries";
  const configuredKeys = ordering ? field.value ?? [] : Object.keys(field.value ?? {});
  const available = new Map((field.descriptors ?? []).map(entry => [entry.key, entry]));
  const keys = [...new Set([...configuredKeys, ...available.keys()])];
  const rows = keys.map(key => available.get(key) ?? { key, defaultLabel: field.value?.[key]?.label || "Unavailable configured entry", unavailable: true });
  const updateEntry = (key, patch) => {
    const next = new Map(Object.entries(field.value ?? {}));
    const entry = Object.fromEntries(Object.entries({ ...(next.get(key) ?? {}), ...patch }).filter(([, value]) => value !== undefined));
    if (Object.keys(entry).length) next.set(key, entry); else next.delete(key);
    onChange(field.path, next.size ? Object.fromEntries(next) : undefined);
  };
  const moveTo = (index, target) => {
    if (index < 0 || target < 0 || target >= keys.length || index === target) return;
    const order = [...keys];
    const [key] = order.splice(index, 1);
    order.splice(target, 0, key);
    if (field.orderKind === "series") {
      const series = chart.presentation?.series ?? {};
      const overrides = captureSeriesColors(field.descriptors, series);
      onChange(["presentation", "series"], { ...series, ...(Object.keys(overrides).length ? { overrides } : {}), order });
    } else onChange(field.path, order);
  };
  const drop = (event, index) => {
    if (!Array.from(event.dataTransfer.types).includes(ORDER_DRAG_TYPE)) return;
    event.preventDefault(); event.stopPropagation();
    try {
      const payload = JSON.parse(event.dataTransfer.getData(ORDER_DRAG_TYPE));
      if (payload.fieldId === field.id && typeof payload.key === "string") moveTo(keys.indexOf(payload.key), index);
    } catch { /* Ignore unrelated or malformed drag payloads. */ }
  };
  const heading = legend ? "Legend Entry" : field.label;
  const help = legend ? LEGEND_HELP : ordering ? "Drag rows to reorder, or use the up and down arrows. Reset restores source order." : field.helpTooltip;
  return <fieldset className={`chart-authoring-field chart-presentation-members${ordering ? " chart-presentation-members--order" : ""}`} data-field-id={field.id}>
    <legend><span className="chart-presentation-members__heading">
      {help ? <ControlTooltip explain reason={help} className="chart-color-heading-help"><span tabIndex={0}>{heading}<span aria-hidden="true"> ⓘ</span></span></ControlTooltip> : heading}
      {ordering && <button type="button" className="secondary" aria-label={`Reset ${field.orderKind === "series" ? "series" : "category"} order`} onClick={() => onChange(field.path, undefined)}>Reset</button>}
    </span></legend>
    {field.control === "categoryColors" && <small>Individual bar colors take priority over named series and the palette.</small>}
    {field.control === "seriesColorsByIdentity" && <small>Overrides the palette. Individual bar colors take priority.</small>}
    <ol className="chart-presentation-members__list">
      {rows.map((entry, index) => <li key={entry.key} className={legend ? "chart-presentation-members__legend-row" : undefined} data-presentation-key={entry.key} data-presentation-unavailable={entry.unavailable ? "true" : undefined}>
        {ordering ? <div className="chart-presentation-members__order-row" draggable data-order-key={entry.key} title={`Drag ${entry.defaultLabel} to reorder`}
          onDragStart={event => { event.stopPropagation(); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData(ORDER_DRAG_TYPE, JSON.stringify({ fieldId: field.id, key: entry.key })); }}
          onDragOver={event => { if (Array.from(event.dataTransfer.types).includes(ORDER_DRAG_TYPE)) { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = "move"; } }}
          onDrop={event => drop(event, index)}>
          <span className="chart-presentation-members__grip" aria-hidden="true">⠿</span>
          <span className="chart-presentation-members__source-label">{entry.defaultLabel}{entry.unavailable ? " (unavailable in current data)" : ""}</span>
          <div className="chart-presentation-members__moves">
            <button type="button" className="secondary" disabled={index === 0} aria-label={`Move ${entry.defaultLabel} up`} title={`Move ${entry.defaultLabel} up`} onClick={() => moveTo(index, index - 1)}>↑</button>
            <button type="button" className="secondary" disabled={index === rows.length - 1} aria-label={`Move ${entry.defaultLabel} down`} title={`Move ${entry.defaultLabel} down`} onClick={() => moveTo(index, index + 1)}>↓</button>
          </div>
        </div> : legend ? <>
          <span className="chart-presentation-members__entry-number" aria-hidden="true">{index + 1}.</span>
          <input type="checkbox" aria-label={`Show in legend: ${entry.defaultLabel}`} title={`Show in legend: ${entry.defaultLabel}`} checked={field.value?.[entry.key]?.visible !== false} onChange={event => updateEntry(entry.key, { visible: event.target.checked ? undefined : false })} />
          <label className="chart-presentation-members__legend-name"><span className="chart-presentation-members__source-label">{entry.defaultLabel}{entry.unavailable ? " (unavailable in current data)" : ""}</span><input aria-label={`Legend name: ${entry.defaultLabel}`} value={field.value?.[entry.key]?.label ?? ""} placeholder={entry.defaultLabel} onChange={event => updateEntry(entry.key, { label: event.target.value || undefined })} /></label>
        </> : <>
          <span className="chart-presentation-members__source-label">{entry.defaultLabel}{entry.unavailable ? " (unavailable in current data)" : ""}</span>
          <ColorField id={`${field.id}-${index}`} label={`${field.control === "categoryColors" ? "Bar color" : "Series override"}: ${entry.defaultLabel}`} labelHidden
            value={field.value?.[entry.key]?.color ?? chart.presentation?.series?.colors?.[(field.control === "categoryColors" ? 0 : entry.sourceIndex ?? index) % (chart.presentation?.series?.colors?.length || 1)] ?? "#043BCB"}
            onChange={color => updateEntry(entry.key, { color })}
            onSelectGradient={field.control === "categoryColors" && !entry.unavailable ? stops => onChange(field.path, spreadCategoryGradient(field.descriptors, stops, { order: chart.presentation?.axes?.x?.categoryOrder, overrides: field.value })) : undefined}
            allowDefault defaultFirst defaultActive={!field.value?.[entry.key]?.color} onDefault={() => updateEntry(entry.key, { color: undefined })} />
        </>}
      </li>)}
    </ol>
    {field.control === "categoryColors" && <button type="button" className="secondary" disabled={!configuredKeys.length} onClick={() => onChange(field.path, undefined)}>Reset bar colors</button>}
  </fieldset>;
}
