import React from "react";
import SourceCsvViewerButton from "../source-data/SourceCsvViewerButton.jsx";
import { buildSourceDownloadDescriptor } from "../source-data/sourceViewerProtocol.js";
import { parseSourceCsvText } from "../../source-viewer/SourceCsvViewer.jsx";
import { filterSourceRows } from "../../source-viewer/sourceViewerSort.js";

export default function CsvDetail({ item, source, datasetProfile }) {
  const columns = datasetProfile?.columns ?? [];
  const [query, setQuery] = React.useState("");
  const parsed = React.useMemo(() => {
    if (source?.type !== "uploadedCsv" || typeof source.csvText !== "string") return null;
    try { return parseSourceCsvText(source.csvText); } catch { return null; }
  }, [source]);
  const previewRows = React.useMemo(() => (
    parsed ? filterSourceRows(parsed.rows, parsed.columns, query).slice(0, 100) : []
  ), [parsed, query]);
  const download = buildSourceDownloadDescriptor(item.id, source);
  const downloadHref = download?.text !== null && download?.text !== undefined
    ? `data:${download.mediaType},${encodeURIComponent(download.text)}`
    : download?.path;
  return (
    <section aria-labelledby="csv-detail-heading">
      <h3 id="csv-detail-heading">CSV details</h3>
      <dl className="source-content-facts">
        <div><dt>Name</dt><dd>{item.record.displayName}</dd></div>
        <div><dt>Origin</dt><dd>{item.record.origin}</dd></div>
        <div><dt>Health</dt><dd>{item.record.health}</dd></div>
        <div><dt>Rows</dt><dd>{datasetProfile?.rowCount ?? 0} rows</dd></div>
        <div><dt>Columns</dt><dd>{columns.length}</dd></div>
        {item.record.updateStatus && <div><dt>Update status</dt><dd>{item.record.updateStatus}</dd></div>}
      </dl>
      {columns.length > 0 && <p>Columns: {columns.map(({ name }) => name).join(", ")}</p>}
      <div className="wizard-source-profile-actions">
        <SourceCsvViewerButton sourceId={item.id} source={source} interactionId="wizard.view-source-csv" />
        {downloadHref && <a className="secondary" href={downloadHref} download={download.fileName}>Download CSV</a>}
      </div>
      {parsed && (
        <section aria-label="Searchable CSV preview">
          <label><span>Search preview</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <div className="source-viewer-table-wrap">
            <table>
              <thead><tr>{parsed.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
              <tbody>{previewRows.map((row, rowIndex) => <tr key={rowIndex}>{parsed.columns.map((column) => <td key={column}>{displayValue(row?.[column])}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <p>{previewRows.length} matching rows shown</p>
        </section>
      )}
    </section>
  );
}

function displayValue(value) {
  if (value === null) return "null";
  if (value === undefined) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}
