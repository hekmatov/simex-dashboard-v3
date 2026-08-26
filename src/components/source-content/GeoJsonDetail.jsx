import React from "react";

import { validateGeoJson } from "../../lib/geoJsonValidation.js";
import GeoJsonPreview from "./GeoJsonPreview.jsx";

const PROPERTY_PAGE_SIZE = 100;

export default function GeoJsonDetail({ item, source, geoData, summary: suppliedSummary, action = null }) {
  const [propertyQuery, setPropertyQuery] = React.useState("");
  const [propertyLimit, setPropertyLimit] = React.useState(PROPERTY_PAGE_SIZE);
  const validation = React.useMemo(() => suppliedSummary ? null : validateGeoJson(geoData), [geoData, suppliedSummary]);
  const summary = suppliedSummary ?? validation?.summary ?? null;
  if (!summary) return <p role="status">GeoJSON summary is unavailable. Repair this source to restore its preview.</p>;
  const matchingKeys = summary.propertyKeys.filter((key) => key.toLocaleLowerCase().includes(propertyQuery.trim().toLocaleLowerCase()));
  const displayedKeys = matchingKeys.slice(0, propertyLimit);
  const geometry = Object.entries(summary.geometryTypeCounts).map(([type, count]) => `${type} ${count}`).join(", ");
  return (
    <section aria-labelledby="geojson-detail-heading">
      <h3 id="geojson-detail-heading">GeoJSON details</h3>
      <dl className="source-content-facts">
        <div><dt>Name</dt><dd>{item.record.displayName}</dd></div>
        <div><dt>Origin</dt><dd>{item.record.origin}</dd></div>
        <div><dt>Health</dt><dd>{item.record.health}</dd></div>
        <div><dt>Features</dt><dd>{summary.featureCount} {summary.featureCount === 1 ? "feature" : "features"}</dd></div>
        <div><dt>Geometry types</dt><dd>{geometry || "None"}</dd></div>
        <div><dt>Bounding box</dt><dd>{summary.boundingBox?.join(", ") ?? "Not available"}</dd></div>
        <div><dt>Encoded size</dt><dd>{summary.encodedBytes} bytes</dd></div>
        <div><dt>Coordinate positions</dt><dd>{summary.totalPositions}</dd></div>
        <div><dt>Renderable fragments</dt><dd>{summary.renderableFragments}</dd></div>
      </dl>
      {summary.diagnostics?.maxPositionsPerFeature >= 20_000 && (
        <p role="status">One feature contains a high concentration of coordinate positions. This does not block admission.</p>
      )}
      <label>
        <span>Search property keys</span>
        <input value={propertyQuery} onChange={(event) => { setPropertyQuery(event.target.value); setPropertyLimit(PROPERTY_PAGE_SIZE); }} />
      </label>
      <ul className="source-content-property-keys" aria-label="GeoJSON property keys">
        {displayedKeys.map((key) => <li key={key}>{key}</li>)}
      </ul>
      {displayedKeys.length < matchingKeys.length && (
        <button type="button" className="secondary" onClick={() => setPropertyLimit((current) => current + PROPERTY_PAGE_SIZE)}>Show more property keys</button>
      )}
      <GeoJsonPreview sourceId={item.id} geoData={geoData ?? source?.geoJson} summary={summary} />
      {action}
    </section>
  );
}
