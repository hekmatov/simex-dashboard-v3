import React from "react";
import ContentActionDialog from "./ContentActionDialog.jsx";

export default function DependencyList({ uses = [], activeRetainers = [], usageKnown = uses.length > 0, onNavigate = null, deletion = null, onDelete = null }) {
  const resolvedRetainers = activeRetainers.length > 0 ? activeRetainers : uses.activeRetainers ?? activeRetainers;
  const resolvedDeletion = deletion ?? uses.deletion ?? null;
  const resolvedNavigate = onNavigate ?? uses.onNavigate ?? null;
  const resolvedDelete = onDelete ?? uses.onDelete ?? null;
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState("");
  const blocked = resolvedDeletion?.status === "blocked";
  const ready = resolvedDeletion?.status === "ready";
  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try { await resolvedDelete?.(resolvedDeletion); setDialogOpen(false); }
    catch (error) { setDeleteError(error?.message ?? "The item could not be deleted."); }
    finally { setDeleting(false); }
  };
  return (
    <section className="source-content-dependencies" aria-labelledby="source-content-used-by">
      <h4 id="source-content-used-by">Used by</h4>
      {usageKnown && uses.length === 0 && resolvedRetainers.length === 0 ? <p>Not currently used.</p> : null}
      {!usageKnown && uses.length === 0 && resolvedRetainers.length === 0 ? <p>Usage details are added with dependency management.</p> : null}
      {uses.length > 0 && (
        <ul>
          {uses.map((use, index) => (
            <li key={use.id ?? `${use.pageId}-${use.sectionId}-${use.panelId}-${index}`}>
              {typeof resolvedNavigate === "function" ? (
                <button type="button" className="source-content-breadcrumb" onClick={() => resolvedNavigate(use)}>
                  <Breadcrumb use={use} />
                </button>
              ) : <span className="source-content-breadcrumb"><Breadcrumb use={use} /></span>}
            </li>
          ))}
        </ul>
      )}
      {resolvedRetainers.map((retainer) => <p key={retainer.ownerId}>Active work retains this item: {retainer.kind}.</p>)}
      {blocked && <div className="source-content-delete-action"><button type="button" className="danger" disabled>Delete</button><p>Remove or replace the direct use before deleting. Finish or discard active work that retains this item.</p></div>}
      {ready && <div className="source-content-delete-action">
        <button type="button" className="danger" onClick={() => setDialogOpen(true)} disabled={typeof resolvedDelete !== "function"}>Delete</button>
        <ContentActionDialog open={dialogOpen} action="delete" itemLabel={resolvedDeletion.itemLabel} busy={deleting} error={deleteError} onConfirm={confirmDelete} onCancel={() => { setDialogOpen(false); setDeleteError(""); }} />
      </div>}
    </section>
  );
}

function Breadcrumb({ use }) {
  return <>{use.pageLabel ?? use.pageId} <span aria-hidden="true">›</span> {use.sectionLabel ?? use.sectionId} <span aria-hidden="true">›</span> {use.panelLabel ?? use.panelId}</>;
}
