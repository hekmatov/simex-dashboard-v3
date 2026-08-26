import React from "react";
import DependencyList from "./DependencyList.jsx";
import { ManagerMediaIntake } from "./MediaCatalogue.jsx";

export default function MediaDetail({
  item,
  dashboard,
  contentDraftCoordinator,
  onRename,
  onContentDraftStage,
  onContentDraftCommit,
  onContentDraftDiscard,
}) {
  const [displayName, setDisplayName] = React.useState(item.record.displayName);
  const [defaultDescription, setDefaultDescription] = React.useState(item.record.defaultDescription);
  React.useEffect(() => {
    setDisplayName(item.record.displayName);
    setDefaultDescription(item.record.defaultDescription);
  }, [item.id, item.record.defaultDescription, item.record.displayName]);
  return (
    <article className="source-content-detail-card">
      <section aria-labelledby="media-detail-heading">
        <h3 id="media-detail-heading">Media details</h3>
        <dl className="source-content-facts">
          <div><dt>Name</dt><dd>{item.record.displayName}</dd></div>
          <div><dt>Origin</dt><dd>{item.record.origin}</dd></div>
          <div><dt>Health</dt><dd>{item.record.health}</dd></div>
          <div><dt>Revision</dt><dd>{item.record.revision}</dd></div>
          {item.record.dimensions && <div><dt>Dimensions</dt><dd>{item.record.dimensions.width} × {item.record.dimensions.height}</dd></div>}
          {item.record.byteLength && <div><dt>Encoded size</dt><dd>{item.record.byteLength} bytes</dd></div>}
          <div><dt>Portability</dt><dd>{item.record.current.kind === "url" ? "Network required" : "Portable"}</dd></div>
        </dl>
        <p className="source-content-placeholder">Media preview is added with the media management flow.</p>
        {item.record.current.kind === "url" && item.record.origin === "external" && (
          <ManagerMediaIntake
            dashboard={dashboard}
            contentDraftCoordinator={contentDraftCoordinator}
            externalItem={item.record}
            onContentDraftStage={onContentDraftStage}
            onContentDraftCommit={onContentDraftCommit}
            onContentDraftDiscard={onContentDraftDiscard}
          />
        )}
      </section>
      <form className="source-content-rename" onSubmit={(event) => { event.preventDefault(); onRename?.({ displayName, defaultDescription }); }}>
        <label><span>Display name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required /></label>
        <label><span>Default description</span><textarea value={defaultDescription} onChange={(event) => setDefaultDescription(event.target.value)} /></label>
        <button type="submit" className="secondary" disabled={!onRename || (displayName.trim() === item.record.displayName && defaultDescription === item.record.defaultDescription)}>Save metadata</button>
      </form>
      <DependencyList uses={item.uses} activeRetainers={item.activeRetainers} usageKnown={item.usageKnown} />
    </article>
  );
}
