import React from "react";
import CsvDetail from "./CsvDetail.jsx";
import DependencyList from "./DependencyList.jsx";

export default function DataSourceDetail({ item, datasetProfile, onRename }) {
  return (
    <article className="source-content-detail-card">
      {item.kind === "csv" ? <CsvDetail item={item} datasetProfile={datasetProfile} /> : <GeoJsonShell item={item} />}
      <RenameSource item={item} onRename={onRename} />
      <DependencyList uses={item.uses} activeRetainers={item.activeRetainers} usageKnown={item.usageKnown} />
    </article>
  );
}

function GeoJsonShell({ item }) {
  return (
    <section aria-labelledby="geojson-detail-heading">
      <h3 id="geojson-detail-heading">GeoJSON details</h3>
      <dl className="source-content-facts">
        <div><dt>Name</dt><dd>{item.record.displayName}</dd></div>
        <div><dt>Origin</dt><dd>{item.record.origin}</dd></div>
        <div><dt>Health</dt><dd>{item.record.health}</dd></div>
      </dl>
      <p className="source-content-placeholder">The canonical GeoJSON summary and map preview are added with the GeoJSON management flow.</p>
    </section>
  );
}

function RenameSource({ item, onRename }) {
  const [displayName, setDisplayName] = React.useState(item.record.displayName);
  React.useEffect(() => setDisplayName(item.record.displayName), [item.id, item.record.displayName]);
  return (
    <form className="source-content-rename" onSubmit={(event) => { event.preventDefault(); onRename?.({ displayName }); }}>
      <label><span>Display name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required /></label>
      <button type="submit" className="secondary" disabled={!onRename || displayName.trim() === item.record.displayName}>Save name</button>
    </form>
  );
}
