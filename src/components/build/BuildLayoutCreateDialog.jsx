import React from "react";

import { trapDialogTabKey } from "./BuildMoveDialog.jsx";

export function validBuildLayoutCreationName(value) {
  return String(value ?? "").trim().length > 0;
}

export default function BuildLayoutCreateDialog({ open = false, kind = "page", invoker = null, onSubmit, onCancel }) {
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState("");
  const inputRef = React.useRef(null);
  const dialogRef = React.useRef(null);
  const titleKind = kind === "section" ? "Section" : "Page";

  React.useEffect(() => {
    if (!open) return undefined;
    setName("");
    setError("");
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => requestAnimationFrame(() => invoker?.focus?.());
  }, [invoker, open]);

  if (!open) return null;
  const submit = (event) => {
    event.preventDefault();
    const value = name.trim();
    if (!validBuildLayoutCreationName(value)) {
      setError(`Enter a ${titleKind} name.`);
      return;
    }
    onSubmit?.(value);
  };
  return (
    <div className="build-move-dialog-backdrop dashboard-dialog-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="build-move-dialog dashboard-dialog dashboard-dialog--utility dashboard-dialog--compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="build-layout-create-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel?.();
            return;
          }
          trapDialogTabKey(event, dialogRef.current);
        }}
      >
        <form className="dashboard-dialog__form" onSubmit={submit} noValidate>
          <header className="dashboard-dialog__header">
            <h2 id="build-layout-create-title">Create {titleKind}</h2>
          </header>
          <div className="dashboard-dialog__body">
            <label>
              {titleKind} name
              <input
                ref={inputRef}
                aria-label={`${titleKind} name`}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "build-layout-create-error" : undefined}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) setError("");
                }}
              />
            </label>
            {error && <p id="build-layout-create-error" role="alert">{error}</p>}
          </div>
          <div className="dialog-actions dashboard-dialog__footer dashboard-dialog__actions">
            <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
            <button type="submit">Create {kind}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
