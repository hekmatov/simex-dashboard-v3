import React from "react";

import { normalizeDatePosition } from "../../lib/sceneDatePositionMutation.js";

const DEFAULT_DATE_POSITION = Object.freeze({
  xPermille: 680,
  yPermille: 40,
  widthPermille: 280,
});

export function createCompositionDraft(position = DEFAULT_DATE_POSITION) {
  const baseline = normalizeDatePosition(position);
  return {
    baseline,
    value: structuredClone(baseline),
    status: "clean",
    dirty: false,
    error: null,
  };
}

export function reduceCompositionDraft(state, action) {
  switch (action?.type) {
    case "RESET_BASELINE":
      return createCompositionDraft(action.value);
    case "SET_DATE_POSITION": {
      const value = normalizeDatePosition(action.value);
      return {
        ...state,
        value,
        dirty: !samePosition(value, state.baseline),
        status: samePosition(value, state.baseline) ? "clean" : "dirty",
        error: null,
      };
    }
    case "SAVE_REQUESTED":
      if (!state.dirty) return state;
      return { ...state, status: "saving", error: null };
    case "SAVE_SUCCEEDED": {
      const baseline = normalizeDatePosition(action.value ?? state.value);
      return {
        baseline,
        value: structuredClone(baseline),
        status: "clean",
        dirty: false,
        error: null,
      };
    }
    case "SAVE_FAILED":
      return {
        ...state,
        status: "error",
        dirty: true,
        error: {
          code: action.error?.code ?? "SCENE_DATE_POSITION_SAVE_FAILED",
          message: action.error?.message ?? "Audience date position could not be saved.",
          retryable: action.error?.retryable !== false,
        },
      };
    case "CANCEL":
      return createCompositionDraft(state.baseline);
    default:
      throw new Error(`Unknown presentation composition action: ${String(action?.type)}`);
  }
}

export function moveDatePositionByKeyboard(position, event) {
  const step = event?.shiftKey ? 1 : 10;
  const delta = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  }[event?.key];
  if (!delta) return null;
  return normalizeDatePosition({
    ...position,
    xPermille: position.xPermille + delta[0],
    yPermille: position.yPermille + delta[1],
  });
}

export function moveDatePositionByPointer(position, movement, bounds) {
  const width = Math.max(1, Number(bounds?.width));
  const height = Math.max(1, Number(bounds?.height));
  return normalizeDatePosition({
    ...position,
    xPermille: position.xPermille + ((Number(movement?.x) || 0) / width) * 1000,
    yPermille: position.yPermille + ((Number(movement?.y) || 0) / height) * 1000,
  });
}

export default function CompositionControls({ scene, onSaveSceneDatePosition }) {
  const savedPosition = scene?.audience?.datePosition ?? DEFAULT_DATE_POSITION;
  const savedSignature = positionSignature(savedPosition);
  const [draft, dispatch] = React.useReducer(
    reduceCompositionDraft,
    savedPosition,
    createCompositionDraft,
  );
  const dragRef = React.useRef(null);

  React.useEffect(() => {
    dispatch({ type: "RESET_BASELINE", value: savedPosition });
  }, [scene?.id, savedSignature]);

  if (!scene) {
    return (
      <section className="presentation-composition" data-presentation-composition-id="date-position">
        <h2>Audience date position</h2>
        <p>Choose a saved Scene to position its date on the Audience display.</p>
      </section>
    );
  }

  const setPosition = (value) => dispatch({ type: "SET_DATE_POSITION", value });
  const onPointerDown = (event) => {
    const bounds = event.currentTarget.parentElement.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      position: draft.value,
      bounds: { width: bounds.width, height: bounds.height },
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPosition(moveDatePositionByPointer(drag.position, {
      x: event.clientX - drag.x,
      y: event.clientY - drag.y,
    }, drag.bounds));
  };
  const stopDrag = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };
  const onKeyDown = (event) => {
    const next = moveDatePositionByKeyboard(draft.value, event);
    if (!next) return;
    event.preventDefault();
    setPosition(next);
  };
  const save = async () => {
    if (!draft.dirty || draft.status === "saving") return;
    dispatch({ type: "SAVE_REQUESTED" });
    try {
      await onSaveSceneDatePosition?.(scene.id, structuredClone(draft.value));
      dispatch({ type: "SAVE_SUCCEEDED", value: draft.value });
    } catch (error) {
      dispatch({ type: "SAVE_FAILED", error });
    }
  };

  return (
    <section className="presentation-composition" data-presentation-composition-id="date-position">
      <div className="presentation-composition__heading">
        <div>
          <p className="eyebrow">Saved Scene</p>
          <h2>Audience date position</h2>
        </div>
        {draft.dirty && <strong className="presentation-composition__dirty">Unsaved position</strong>}
      </div>
      <p>Drag the date label or use its arrow keys. Hold Shift for one-permille keyboard steps.</p>
      <div className="presentation-date-position-stage" aria-label="Audience date position canvas">
        <button
          type="button"
          className="presentation-date-position-handle"
          data-presentation-control-id="date-position-handle"
          aria-label="Audience date position"
          style={{
            left: `${draft.value.xPermille / 10}%`,
            top: `${draft.value.yPermille / 10}%`,
            width: `${draft.value.widthPermille / 10}%`,
          }}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
        >
          Scene date
        </button>
      </div>
      <div className="presentation-date-position-fields">
        <PositionField controlId="date-position-x" label="Horizontal position" value={draft.value.xPermille} maximum={1000 - draft.value.widthPermille} onChange={(xPermille) => setPosition({ ...draft.value, xPermille })} />
        <PositionField controlId="date-position-y" label="Vertical position" value={draft.value.yPermille} maximum={1000} onChange={(yPermille) => setPosition({ ...draft.value, yPermille })} />
        <PositionField controlId="date-position-width" label="Date width" value={draft.value.widthPermille} minimum={1} maximum={1000 - draft.value.xPermille} onChange={(widthPermille) => setPosition({ ...draft.value, widthPermille })} />
      </div>
      {draft.error && <p className="present-connection-error" role="alert">{draft.error.message}</p>}
      <div className="presentation-composition__actions">
        <button type="button" className="secondary" data-presentation-control-id="date-position-cancel" disabled={!draft.dirty || draft.status === "saving"} onClick={() => dispatch({ type: "CANCEL" })}>Cancel</button>
        <button type="button" data-presentation-control-id="date-position-save" disabled={!draft.dirty || draft.status === "saving" || typeof onSaveSceneDatePosition !== "function"} onClick={save}>{draft.status === "saving" ? "Saving…" : draft.status === "error" ? "Retry save" : "Save date position"}</button>
      </div>
    </section>
  );
}

function PositionField({ controlId, label, value, minimum = 0, maximum, onChange }) {
  return (
    <label className="present-field">
      <span>{label}</span>
      <input data-presentation-control-id={controlId} type="number" min={minimum} max={maximum} step="1" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function samePosition(left, right) {
  return positionSignature(left) === positionSignature(right);
}

function positionSignature(position) {
  const normalized = normalizeDatePosition(position);
  return `${normalized.xPermille}:${normalized.yPermille}:${normalized.widthPermille}`;
}
