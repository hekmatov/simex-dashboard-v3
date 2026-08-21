import React from "react";

import {
  getTimeContentEmptyState,
  selectTimeContentSections,
} from "./timeContentState.js";

export default function TimeContentLibrary({ state, onAction }) {
  const dispatch = typeof onAction === "function" ? onAction : () => {};
  const sections = selectTimeContentSections(state);
  const emptyState = getTimeContentEmptyState(state, sections);

  return (
    <section className="time-content-library" aria-labelledby="time-content-title">
      <header className="time-content-library__header">
        <div>
          <p className="eyebrow">Temporal authoring</p>
          <h2 id="time-content-title">Time Content</h2>
          <p>Browse saved Time Groups and Scenes. Repairs return to the setting that owns the problem.</p>
        </div>
        <div className="time-content-library__create-actions" aria-label="Create Time Content">
          <button
            type="button"
            onClick={() => dispatch({ type: "REQUEST_INTENT", item: { type: "group" }, intent: "create" })}
          >
            Create Time Group
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "REQUEST_INTENT", item: { type: "scene" }, intent: "create" })}
          >
            Create Scene
          </button>
        </div>
      </header>

      <div className="time-content-library__browse" role="search">
        <label htmlFor="time-content-query">Search Time Content</label>
        <input
          id="time-content-query"
          type="search"
          value={state.query}
          onChange={(event) => dispatch({ type: "SET_QUERY", query: event.target.value })}
        />
        <label htmlFor="time-content-filter">Type</label>
        <select
          id="time-content-filter"
          value={state.filter}
          onChange={(event) => dispatch({ type: "SET_FILTER", filter: event.target.value })}
        >
          <option value="all">All</option>
          <option value="groups">Time Groups</option>
          <option value="scenes">Scenes</option>
        </select>
      </div>

      {state.authoredContentChanged ? (
        <p className="time-content-library__session-notice" role="status">
          Authored content changed. The running session remains unchanged; reload it explicitly when ready.
        </p>
      ) : null}

      {state.error ? (
        <div className="time-content-library__error" role="alert">
          <p>{state.error.message}</p>
          {state.operation?.status === "failed" ? (
            <button type="button" onClick={() => dispatch({ type: "RETRY_OPERATION" })}>
              Retry operation
            </button>
          ) : null}
        </div>
      ) : null}

      {state.conflict ? <DraftConflict conflict={state.conflict} dispatch={dispatch} /> : null}

      {emptyState ? (
        <p className="time-content-library__empty" data-empty-kind={emptyState.kind} role="status">
          {emptyState.message}
        </p>
      ) : (
        <div className="time-content-library__sections">
          <ContentSection
            title="Ready"
            items={sections.ready}
            dispatch={dispatch}
          />
          <ContentSection
            title="Needs attention"
            items={sections.needsAttention}
            dispatch={dispatch}
            needsAttention
          />
        </div>
      )}
    </section>
  );
}

function ContentSection({ title, items, dispatch, needsAttention = false }) {
  const sectionId = `time-content-${needsAttention ? "needs-attention" : "ready"}`;
  return (
    <section aria-labelledby={sectionId} data-grouping={needsAttention ? "needs-attention" : "ready"}>
      <h3 id={sectionId}>{title}</h3>
      {items.length === 0 ? (
        <p>No {title.toLocaleLowerCase()} items in this view.</p>
      ) : (
        <ul className="time-content-library__cards">
          {items.map((item) => (
            <li key={`${item.type}-${item.id}`}>
              <TimeContentCard item={item} dispatch={dispatch} needsAttention={needsAttention} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TimeContentCard({ item, dispatch, needsAttention }) {
  const itemType = item.type === "scene" ? "Scene" : "Time Group";
  const firstFinding = item.needsAttention?.[0] ?? null;
  const request = (intent, reason = null) => dispatch({
    type: "REQUEST_INTENT",
    item,
    intent,
    reason,
  });
  return (
    <article className="time-content-card" data-status={needsAttention ? "needs-attention" : "ready"}>
      <header>
        <p>{itemType}</p>
        <h4>{item.name}</h4>
        <p>{needsAttention ? "Needs attention" : "Ready"}</p>
      </header>
      {firstFinding ? (
        <div className="time-content-card__finding">
          <p>{firstFinding.message ?? firstFinding.code}</p>
          <button
            type="button"
            onClick={() => request("repair", firstFinding.stage ?? firstFinding.reason ?? firstFinding.code)}
          >
            Repair
          </button>
        </div>
      ) : null}
      <div className="time-content-card__actions" aria-label={`${item.name} actions`}>
        <button type="button" onClick={() => request("edit")}>Edit</button>
        <button type="button" onClick={() => request("duplicate")}>Duplicate</button>
        <button type="button" onClick={() => request("remove")}>Remove</button>
      </div>
    </article>
  );
}

function DraftConflict({ conflict, dispatch }) {
  return (
    <section className="time-content-library__conflict" role="dialog" aria-modal="true" aria-labelledby="time-content-conflict-title">
      <h3 id="time-content-conflict-title">Save this draft before continuing?</h3>
      <p>The current temporal draft is independent from the next authoring surface.</p>
      {conflict.status === "failed" ? (
        <p role="alert">The draft could not be saved. Retry, discard it, or stay here.</p>
      ) : null}
      <div>
        <button type="button" disabled={conflict.status === "saving"} onClick={() => dispatch({ type: "RESOLVE_CONFLICT", choice: "save" })}>
          Save draft
        </button>
        <button type="button" onClick={() => dispatch({ type: "RESOLVE_CONFLICT", choice: "discard" })}>
          Discard draft
        </button>
        <button type="button" onClick={() => dispatch({ type: "RESOLVE_CONFLICT", choice: "stay" })}>
          Stay
        </button>
      </div>
    </section>
  );
}
