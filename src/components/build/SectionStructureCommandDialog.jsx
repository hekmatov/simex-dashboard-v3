import React from "react";

import { previewBuildStructureConsequences } from "./buildLayoutDraft.js";

export default function SectionStructureCommandDialog({ command, dashboard, pageId, section, onCancel, onConfirm }) {
  const page = dashboard.pages.find(({ id }) => id === pageId);
  const destinations = dashboard.pages.filter(({ id, landing }) => id !== pageId && !landing);
  const mergeTargets = (page?.sections ?? []).filter(({ id }) => id !== section.id);
  const [destinationId, setDestinationId] = React.useState(destinations[0]?.id ?? "");
  const [placement, setPlacement] = React.useState("first");
  const [mergeTargetId, setMergeTargetId] = React.useState(mergeTargets[0]?.id ?? "");
  const [disposition, setDisposition] = React.useState("delete-charts");
  const [acknowledged, setAcknowledged] = React.useState(false);
  const proof = previewBuildStructureConsequences(dashboard, { pageId, sectionId: section.id, kind: `${command}-section`, disposition });
  const requiresAcknowledgement = command === "remove" || (command === "move" && proof.scenes.length > 0);

  function submit(event) {
    event.preventDefault();
    if (command === "move") {
      const [kind, afterSectionId] = placement.split(":");
      onConfirm({ type: "move-section", pageId, sectionId: section.id, targetPageId: destinationId, placement: kind === "first" ? { first: true } : { afterSectionId } });
    }
    if (command === "merge") onConfirm({ type: "merge-section", pageId, sectionId: section.id, targetSectionId: mergeTargetId });
    if (command === "remove") onConfirm({ type: "remove-section", pageId, sectionId: section.id, disposition });
  }

  const targetPage = destinations.find(({ id }) => id === destinationId);
  return (
    <aside className="section-structure-command-dialog dashboard-dialog dashboard-dialog--utility dashboard-dialog--standard" role="dialog" aria-modal="false" aria-label={`${command} ${section.title}`}>
      <form onSubmit={submit}>
        <header className="dashboard-dialog__header"><div><span className="eyebrow">Section command</span><h3>{command === "move" ? "Move to Page" : command === "merge" ? "Merge Section" : "Remove Section"}</h3></div><button type="button" className="secondary" onClick={onCancel}>Close</button></header>
        {command === "move" && <>
          <label>Destination Page<select value={destinationId} onChange={(event) => { setDestinationId(event.target.value); setPlacement("first"); }}>{destinations.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label ?? candidate.title}</option>)}</select></label>
          <label>Placement<select value={placement} onChange={(event) => setPlacement(event.target.value)}><option value="first">First Section</option>{(targetPage?.sections ?? []).map((candidate) => <option key={candidate.id} value={`after:${candidate.id}`}>After {candidate.title}</option>)}</select></label>
        </>}
        {command === "merge" && <label>Merge into<select value={mergeTargetId} onChange={(event) => setMergeTargetId(event.target.value)}>{mergeTargets.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}</select></label>}
        {command === "remove" && <label>Content disposition<select value={disposition} onChange={(event) => setDisposition(event.target.value)}><option value="delete-charts">Delete placed charts</option><option value="merge-above" disabled={page.sections[0]?.id === section.id}>Merge into Section above</option><option value="merge-below" disabled={page.sections.at(-1)?.id === section.id}>Merge into Section below</option></select></label>}
        <section className="structure-named-proof" aria-label="Named consequences"><strong>Affected charts</strong><p>{proof.charts.join(", ") || "None"}</p><strong>Chrono Groups</strong><p>{proof.chronoGroups.join(", ") || "None"}</p><strong>Scenes</strong><p>{proof.scenes.join(", ") || "None"}</p><p>{proof.summary}</p></section>
        {requiresAcknowledgement && <label className="structure-confirm-check"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />I understand these named consequences.</label>}
        <footer className="dashboard-dialog__footer dashboard-dialog__actions"><button type="submit" disabled={(requiresAcknowledgement && !acknowledged) || (command === "move" && !destinationId) || (command === "merge" && !mergeTargetId)}>Confirm</button><button type="button" className="secondary" onClick={onCancel}>Cancel</button></footer>
      </form>
    </aside>
  );
}
