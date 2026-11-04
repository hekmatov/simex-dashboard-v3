import React from "react";
import ColorField from "../ColorField.jsx";
import { captureSeriesColors, spreadCategoryGradient } from "../../charting/presentation/categorySeriesPresentation.js";

export default function CategorySeriesPresentationFields({ field, chart, onChange }) {
  const configuredKeys = field.control === "presentationOrder" ? field.value ?? [] : Object.keys(field.value ?? {});
  const available = new Map((field.descriptors ?? []).map(entry => [entry.key, entry]));
  const keys = [...new Set([...configuredKeys, ...available.keys()])];
  const rows = keys.map(key => available.get(key) ?? { key, defaultLabel: field.value?.[key]?.label || "Unavailable configured entry", unavailable: true });
  const updateEntry = (key, patch) => {
    const next = new Map(Object.entries(field.value ?? {}));
    const entry = Object.fromEntries(Object.entries({ ...(next.get(key) ?? {}), ...patch }).filter(([, value]) => value !== undefined));
    if (Object.keys(entry).length) next.set(key, entry); else next.delete(key);
    onChange(field.path, next.size ? Object.fromEntries(next) : undefined);
  };
  const move = (index, offset) => {
    const order = [...keys];
    const [key] = order.splice(index, 1);
    order.splice(index + offset, 0, key);
    if (field.orderKind === "series") {
      const series = chart.presentation?.series ?? {};
      const overrides = captureSeriesColors(field.descriptors, series);
      onChange(["presentation", "series"], { ...series, ...(Object.keys(overrides).length ? { overrides } : {}), order });
    } else onChange(field.path, order);
  };
  return (
    <fieldset className="chart-authoring-field chart-presentation-members" data-field-id={field.id}>
      <legend>{field.label}</legend>
      {field.control === "legendEntries" && <p>Hiding a legend entry leaves its plotted data visible. Clear a name to restore the generated label.</p>}
      {field.control === "categoryColors" && <p>Choose individual bar colors, or apply a gradient across the current category order. Colors stay with their categories when reordered.</p>}
      {field.control === "seriesColorsByIdentity" && <p>These colors stay with each series when its order changes. Reset a color to use the palette.</p>}
      <ol className="chart-presentation-members__list">
        {rows.map((entry, index) => <li key={entry.key} data-presentation-key={entry.key} data-presentation-unavailable={entry.unavailable ? "true" : undefined}>
          <span>{entry.defaultLabel}{entry.unavailable ? " (unavailable in current data)" : ""}</span>
          {field.control === "presentationOrder" ? <div className="chart-presentation-members__moves">
            <button type="button" className="secondary" disabled={index === 0} aria-label={`Move ${entry.defaultLabel} up`} onClick={() => move(index, -1)}>Move up</button>
            <button type="button" className="secondary" disabled={index === rows.length - 1} aria-label={`Move ${entry.defaultLabel} down`} onClick={() => move(index, 1)}>Move down</button>
          </div> : field.control === "legendEntries" ? <div className="chart-presentation-members__entry">
            <label>Legend name: {entry.defaultLabel}<input value={field.value?.[entry.key]?.label ?? ""} placeholder={entry.defaultLabel} onChange={event => updateEntry(entry.key, { label: event.target.value || undefined })} /></label>
            <label className="chart-authoring-inline-toggle"><input type="checkbox" checked={field.value?.[entry.key]?.visible !== false} onChange={event => updateEntry(entry.key, { visible: event.target.checked ? undefined : false })} />Show in legend: {entry.defaultLabel}</label>
          </div> : <ColorField
            id={`${field.id}-${index}`} label={`${field.control === "categoryColors" ? "Bar" : "Series"} color: ${entry.defaultLabel}`}
            value={field.value?.[entry.key]?.color ?? chart.presentation?.series?.colors?.[(field.control === "categoryColors" ? 0 : entry.sourceIndex ?? index) % (chart.presentation?.series?.colors?.length || 1)] ?? "#043BCB"}
            onChange={color => updateEntry(entry.key, { color })}
            onSelectGradient={field.control === "categoryColors" && !entry.unavailable ? stops => onChange(field.path,
              spreadCategoryGradient(field.descriptors, stops, { order: chart.presentation?.axes?.x?.categoryOrder, overrides: field.value })) : undefined}
            allowDefault defaultActive={!field.value?.[entry.key]?.color}
            onDefault={() => updateEntry(entry.key, { color: undefined })}
          />}
        </li>)}
      </ol>
      {field.control === "presentationOrder" && <button type="button" className="secondary" onClick={() => onChange(field.path, undefined)}>Reset to source order</button>}
      {field.control === "categoryColors" && <button type="button" className="secondary" disabled={!configuredKeys.length} onClick={() => onChange(field.path, undefined)}>Reset bar colors</button>}
    </fieldset>
  );
}
