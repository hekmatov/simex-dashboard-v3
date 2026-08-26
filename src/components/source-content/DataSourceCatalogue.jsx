import React from "react";
import { buildCsvContentDraft } from "../../content-library/sourceEntrySchema.js";
import { parseUploadedCsvFile } from "../chart-authoring/ChartWizardV3.jsx";
import ContentCatalogue from "./ContentCatalogue.jsx";

export default function DataSourceCatalogue({
  dashboard = {}, contentDraftCoordinator, onContentDraftStage,
  onContentDraftCommit, onContentDraftDiscard, onSelect, ...props
}) {
  return (
    <div style={{ boxSizing: "border-box", width: "100%", height: "100%", minWidth: 0, minHeight: 0, overflow: "auto", display: "grid", alignContent: "start", gap: 12 }}>
      <ManagerCsvIntake
        dashboard={dashboard}
        contentDraftCoordinator={contentDraftCoordinator}
        onContentDraftStage={onContentDraftStage}
        onContentDraftCommit={onContentDraftCommit}
        onContentDraftDiscard={onContentDraftDiscard}
        onAdded={onSelect}
      />
      <ContentCatalogue {...props} onSelect={onSelect} label="Data source catalogue" searchLabel="Search data sources" addLabel="Catalogue" kindOptions={["csv", "geojson"]} />
    </div>
  );
}

export function ManagerCsvIntake({
  dashboard = {}, contentDraftCoordinator, onContentDraftStage,
  onContentDraftCommit, onContentDraftDiscard, onAdded,
} = {}) {
  const [open, setOpen] = React.useState(false);
  const [candidate, setCandidate] = React.useState(null);
  const [displayName, setDisplayName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const draftIdRef = React.useRef(null);

  React.useEffect(() => () => {
    if (draftIdRef.current) onContentDraftDiscard?.(draftIdRef.current, "manager-csv-unmount");
    draftIdRef.current = null;
  }, [onContentDraftDiscard]);

  const stageFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (draftIdRef.current) {
        await onContentDraftDiscard?.(draftIdRef.current, "manager-csv-replaced");
        draftIdRef.current = null;
      }
      const parsed = await parseUploadedCsvFile(file, dashboard.dataSources ?? {});
      const name = labelFromFileName(parsed.source.fileName);
      const input = buildCsvContentDraft({ owner: "manager", sourceId: parsed.sourceId, source: parsed.source, profile: parsed.profile, displayName: name });
      const { buildCandidate: _buildCandidate, entry: _entry, source: _source, profile: _profile, ...draft } = input;
      const staged = onContentDraftStage?.(draft);
      draftIdRef.current = staged?.draftId ?? draft.draftId;
      setCandidate({ ...parsed, input });
      setDisplayName(name);
    } catch (caught) {
      setCandidate(null);
      setError(caught?.message ?? "The CSV could not be prepared.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (reason = "manager-csv-cancel") => {
    if (draftIdRef.current) await onContentDraftDiscard?.(draftIdRef.current, reason);
    draftIdRef.current = null;
    setCandidate(null);
    setDisplayName("");
    setError("");
    setOpen(false);
  };

  const add = async () => {
    if (!candidate || !draftIdRef.current || !displayName.trim()) return;
    setBusy(true);
    setError("");
    try {
      const input = buildCsvContentDraft({ owner: "manager", sourceId: candidate.sourceId, source: candidate.source, profile: candidate.profile, displayName });
      contentDraftCoordinator?.updateDraft?.(draftIdRef.current, { payload: input.payload, sourceIds: input.sourceIds });
      const result = await onContentDraftCommit?.(draftIdRef.current, input.buildCandidate);
      draftIdRef.current = null;
      setCandidate(null);
      setOpen(false);
      onAdded?.(result?.itemIds?.[0] ?? candidate.sourceId);
    } catch (caught) {
      draftIdRef.current = null;
      setError(caught?.message ?? "The CSV could not be added to the dashboard.");
    } finally {
      setBusy(false);
    }
  };

  const duplicate = candidate ? matchingCsv(dashboard, candidate.profile.fingerprint) : null;
  return (
    <section aria-label="Add CSV to dashboard" data-draft-owner="manager">
      {!open && <button type="button" className="secondary" onClick={() => setOpen(true)}>Add CSV</button>}
      {open && (
        <div>
          <h3>Add CSV</h3>
          <label><span>CSV file</span><input type="file" accept=".csv,text/csv" disabled={busy} onChange={(event) => void stageFile(event.target.files?.[0] ?? null)} /></label>
          {candidate && (
            <>
              <label><span>Display name</span><input value={displayName} required onChange={(event) => setDisplayName(event.target.value)} /></label>
              <p>{candidate.profile.rowCount} rows · {candidate.profile.columns.length} columns</p>
              <CsvCandidatePreview rows={candidate.rows} columns={candidate.profile.columns.map(({ name }) => name)} />
              {duplicate && <p role="status">Matching content already exists as {duplicate.displayName}. Adding keeps a separate source identity.</p>}
              <button type="button" disabled={busy || !displayName.trim()} onClick={() => void add()}>Add to dashboard</button>
            </>
          )}
          {error && <p role="alert">{error}</p>}
          <button type="button" className="secondary" disabled={busy} onClick={() => void cancel()}>Cancel</button>
        </div>
      )}
    </section>
  );
}

function CsvCandidatePreview({ rows, columns }) {
  return (
    <div className="source-viewer-table-wrap" aria-label="CSV upload preview">
      <table>
        <thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{rows.slice(0, 5).map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{String(row?.[column] ?? "")}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function matchingCsv(dashboard, fingerprint) {
  return Object.entries(dashboard.datasetProfiles ?? {}).flatMap(([sourceId, profile]) => {
    if (profile?.fingerprint !== fingerprint) return [];
    const entry = dashboard.contentLibrary?.sourceEntries?.[sourceId];
    return entry?.ownership === "builder" ? [entry] : [];
  })[0] ?? null;
}

function labelFromFileName(fileName) {
  return String(fileName ?? "Uploaded CSV").replace(/\.csv$/i, "").replace(/[-_]+/g, " ").trim() || "Uploaded CSV";
}
