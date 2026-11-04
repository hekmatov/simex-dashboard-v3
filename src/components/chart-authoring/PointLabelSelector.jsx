import React from "react";
import { useModalFocus } from "../common/ModalFocusScope.jsx";
import { trapDialogTabKey } from "../build/BuildMoveDialog.jsx";
import { normalizePointLabelSelection, pointLabelMatcher, setPointLabels } from "../../charting/presentation/pointLabelSelection.js";

export default function PointLabelSelector({ matrix = { rows: [], columns: [] }, value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState();
  const trigger = React.useRef(null);
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  const dialog = useModalFocus({ open, onEscape: close });
  React.useEffect(() => {
    if (!open) return undefined;
    const frame = requestAnimationFrame(() => dialog.current?.querySelector('[data-point-label-cancel]')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, dialog]);
  const points = matrix.rows.flatMap(row => row.points.filter(Boolean));
  const selected = pointLabelMatcher(open ? draft : value);
  const count = points.filter(point => selected(point.key)).length;
  const update = (keys, checked) => setDraft(current => setPointLabels(current, keys, checked));
  const titleId = `point-label-title-${React.useId().replaceAll(":", "")}`;
  return <div className="point-label-selector">
    <button type="button" ref={trigger} disabled={!points.length} aria-haspopup="dialog" aria-expanded={open}
      onClick={() => { setDraft(normalizePointLabelSelection(value)); setOpen(true); }}>Choose labeled points</button>
    <span>{count} of {points.length} points selected</span>
    {open && <div className="point-label-dialog-backdrop dashboard-dialog-backdrop" role="presentation">
      <section ref={dialog} className="point-label-dialog dashboard-dialog dashboard-dialog--wide" role="dialog" aria-modal="true" aria-labelledby={titleId}
        onKeyDown={event => {
          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
          else trapDialogTabKey(event, dialog.current);
        }}>
        <header className="dashboard-dialog__header"><h2 id={titleId}>Choose labeled points</h2></header>
        <div className="dashboard-dialog__body">
          <p>Choose points to label when Show labels is enabled. Selections stay attached when the chart is reordered or filtered.</p>
          <div className="point-label-actions">
            <button type="button" onClick={() => setDraft(undefined)}>All</button>
            <button type="button" onClick={() => setDraft({ mode: "only", keys: [] })}>None</button>
            <span role="status">{count} of {points.length} points selected</span>
          </div>
          <div className="point-label-grid-scroll">
            <table className="point-label-grid" aria-label="Point label selection">
              <thead><tr><th scope="col">Series / X-axis value</th>{matrix.columns.map((column, index) => {
                const keys = matrix.rows.flatMap(row => row.points[index] ? [row.points[index].key] : []);
                return <th scope="col" key={column.key}><label><PointCheckbox keys={keys} selected={selected} label={`Select column: ${column.label}`} onChange={checked => update(keys, checked)} />{column.label}</label></th>;
              })}</tr></thead>
              <tbody>{matrix.rows.map(row => {
                const keys = row.points.filter(Boolean).map(point => point.key);
                return <tr key={row.key}><th scope="row"><label><PointCheckbox keys={keys} selected={selected} label={`Select series: ${row.label}`} onChange={checked => update(keys, checked)} />{row.label}</label></th>
                  {row.points.map((point, index) => <td key={matrix.columns[index].key}>{point ? <label><input type="checkbox"
                    aria-label={`${row.label}, ${matrix.columns[index].label}: ${point.value}`} checked={selected(point.key)}
                    onChange={event => update([point.key], event.target.checked)} /><span>{point.value}</span></label> : <span aria-label="No point">—</span>}</td>)}
                </tr>;
              })}</tbody>
            </table>
          </div>
        </div>
        <footer className="dashboard-dialog__footer dashboard-dialog__actions">
          <button type="button" className="secondary" data-point-label-cancel onClick={close}>Cancel</button>
          <button type="button" onClick={() => { onChange(draft); close(); }}>Apply</button>
        </footer>
      </section>
    </div>}
  </div>;
}

function PointCheckbox({ keys, selected, label, onChange }) {
  const input = React.useRef(null);
  const count = keys.filter(selected).length;
  const mixed = count > 0 && count < keys.length;
  React.useEffect(() => { if (input.current) input.current.indeterminate = mixed; }, [mixed]);
  return <input ref={input} type="checkbox" aria-label={label} aria-checked={mixed ? "mixed" : count > 0} checked={keys.length > 0 && count === keys.length}
    disabled={!keys.length} onChange={event => onChange(event.target.checked)} />;
}
