import React from "react";

export default function DependencyList({ uses = [], activeRetainers = [] }) {
  return (
    <section className="source-content-dependencies" aria-labelledby="source-content-used-by">
      <h4 id="source-content-used-by">Used by</h4>
      {uses.length === 0 && activeRetainers.length === 0 ? <p>Not currently used.</p> : null}
      {uses.length > 0 && (
        <ul>
          {uses.map((use, index) => (
            <li key={use.id ?? `${use.pageId}-${use.sectionId}-${use.panelId}-${index}`}>
              <button type="button" className="source-content-breadcrumb" onClick={() => use.onNavigate?.()}>
                {use.pageLabel ?? use.pageId} <span aria-hidden="true">›</span> {use.sectionLabel ?? use.sectionId} <span aria-hidden="true">›</span> {use.panelLabel ?? use.panelId}
              </button>
            </li>
          ))}
        </ul>
      )}
      {activeRetainers.map((retainer) => <p key={retainer.ownerId}>Active work retains this item: {retainer.kind}.</p>)}
    </section>
  );
}
