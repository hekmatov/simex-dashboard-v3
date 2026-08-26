import React from "react";

export default function DependencyList({ uses = [], activeRetainers = [], usageKnown = uses.length > 0, onNavigate = null }) {
  return (
    <section className="source-content-dependencies" aria-labelledby="source-content-used-by">
      <h4 id="source-content-used-by">Used by</h4>
      {usageKnown && uses.length === 0 && activeRetainers.length === 0 ? <p>Not currently used.</p> : null}
      {!usageKnown && uses.length === 0 && activeRetainers.length === 0 ? <p>Usage details are added with dependency management.</p> : null}
      {uses.length > 0 && (
        <ul>
          {uses.map((use, index) => (
            <li key={use.id ?? `${use.pageId}-${use.sectionId}-${use.panelId}-${index}`}>
              {typeof onNavigate === "function" ? (
                <button type="button" className="source-content-breadcrumb" onClick={() => onNavigate(use)}>
                  <Breadcrumb use={use} />
                </button>
              ) : <span className="source-content-breadcrumb"><Breadcrumb use={use} /></span>}
            </li>
          ))}
        </ul>
      )}
      {activeRetainers.map((retainer) => <p key={retainer.ownerId}>Active work retains this item: {retainer.kind}.</p>)}
    </section>
  );
}

function Breadcrumb({ use }) {
  return <>{use.pageLabel ?? use.pageId} <span aria-hidden="true">›</span> {use.sectionLabel ?? use.sectionId} <span aria-hidden="true">›</span> {use.panelLabel ?? use.panelId}</>;
}
