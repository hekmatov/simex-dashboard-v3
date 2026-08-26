import React from "react";

export default function CsvDetail({ item, datasetProfile }) {
  const columns = datasetProfile?.columns ?? [];
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
      <p className="source-content-placeholder">Table preview and download are added with the CSV management flow.</p>
    </section>
  );
}
