import React from "react";
import { commitCsvReplacement, prepareCsvReplacement } from "../../content-library/csvReplacementTransaction.js";
import { commitGeoJsonReplacement, prepareGeoJsonReplacement } from "../../content-library/geoJsonReplacementTransaction.js";
import { parseUploadedCsvFile, parseUploadedGeoJsonFile } from "../chart-authoring/ChartWizardV3.jsx";
import CsvDetail from "./CsvDetail.jsx";
import GeoJsonDetail from "./GeoJsonDetail.jsx";
import ContentActionDialog from "./ContentActionDialog.jsx";
import DependencyList from "./DependencyList.jsx";

export default function DataSourceDetail({
  item,
  dashboard = {},
  contentDraftCoordinator,
  datasetProfile,
  geoData,
  onRename,
  onRenameDraftChange,
  renameBusy = false,
  renameError = "",
  onRequestClose,
  onContentDraftStage,
  onContentDraftCommit,
  onContentDraftDiscard,
  preserveDraftsOnUnmount = false,
}) {
  const [replaceOpen, setReplaceOpen] = React.useState(false);
  const [replacementPlan, setReplacementPlan] = React.useState(null);
  const [replacementLabel, setReplacementLabel] = React.useState("");
  const [replacementBusy, setReplacementBusy] = React.useState(false);
  const [replacementError, setReplacementError] = React.useState("");
  const [replacementStatus, setReplacementStatus] = React.useState("");
  const [importedSourceLabel, setImportedSourceLabel] = React.useState("");
  const [importedRemapTargets, setImportedRemapTargets] = React.useState([]);
  const isGeoJson = item.kind === "geojson";
  const requiresRepair = ["missing", "corrupt", "needs-relink", "needs-review"].includes(item.record.health);
  const relinkSource = item.record.origin === "linked-project" || item.record.health === "needs-relink";
  const repairLabel = relinkSource
    ? "Relink"
    : requiresRepair ? "Repair source" : "Replace file";
  const replacementPlanRef = React.useRef(null);
  const lifecycleRef = React.useRef({ contentDraftCoordinator, onContentDraftDiscard, preserveDraftsOnUnmount });
  lifecycleRef.current = { contentDraftCoordinator, onContentDraftDiscard, preserveDraftsOnUnmount };
  React.useEffect(() => () => {
    if (lifecycleRef.current.preserveDraftsOnUnmount) return;
    const plan = replacementPlanRef.current;
    replacementPlanRef.current = null;
    if (plan?.draft) void discardPreparedCsv(plan, "csv-replacement-unmount", lifecycleRef.current);
  }, []);

  const chooseReplacement = async (file) => {
    if (!file) return;
    setReplacementBusy(true);
    setReplacementError("");
    setImportedSourceLabel("");
    setImportedRemapTargets([]);
    try {
      if (replacementPlanRef.current?.draft) {
        await discardPreparedCsv(replacementPlanRef.current, "csv-replacement-changed", { contentDraftCoordinator, onContentDraftDiscard });
      }
      const plan = isGeoJson
        ? await prepareGeoJsonReplacement({
          dashboard,
          sourceId: item.id,
          file,
          parseCandidate: (candidateFile) => parseUploadedGeoJsonFile(candidateFile, dashboard.dataSources ?? {}),
        })
        : await prepareCsvReplacement({
          dashboard,
          sourceId: item.id,
          file,
          parseCandidate: (candidateFile) => parseUploadedCsvFile(candidateFile, dashboard.dataSources ?? {}),
        });
      if (plan.draft && plan.status !== "blocked") await onContentDraftStage?.(plan.draft);
      replacementPlanRef.current = plan;
      setReplacementPlan(plan);
      setReplacementLabel(file.name || (isGeoJson ? "Replacement GeoJSON" : "Replacement CSV"));
      setReplacementStatus(plan.status);
    } catch (error) {
      replacementPlanRef.current = null;
      setReplacementPlan(null);
      setReplacementLabel("");
      setReplacementStatus("");
      setReplacementError(error?.message ?? `The replacement ${isGeoJson ? "GeoJSON" : "CSV"} could not be prepared.`);
    } finally {
      setReplacementBusy(false);
    }
  };

  const cancelReplacement = async () => {
    if (replacementPlanRef.current?.draft) {
      await discardPreparedCsv(replacementPlanRef.current, "csv-replacement-cancelled", { contentDraftCoordinator, onContentDraftDiscard });
    }
    replacementPlanRef.current = null;
    setReplacementPlan(null);
    setReplacementLabel("");
    setReplacementStatus("");
    setReplacementError("");
    setImportedSourceLabel("");
    setImportedRemapTargets([]);
    setReplaceOpen(false);
  };

  const publish = async (mode) => {
    if (!replacementPlan?.draft) return;
    setReplacementBusy(true);
    setReplacementError("");
    try {
      const result = isGeoJson
        ? await commitGeoJsonReplacement(replacementPlan, {
          mode: mode === "confirm-geojson" ? "replace" : mode,
          confirmWarnings: mode === "confirm-geojson",
          contentDraftCoordinator,
          commitDraft: (draftId, buildCandidate) => onContentDraftCommit?.(draftId, buildCandidate),
        })
        : await commitCsvReplacement(replacementPlan, {
          mode: mode === "confirm-temporal" ? "replace" : mode,
          confirmTemporalReview: mode === "confirm-temporal",
          contentDraftCoordinator,
          commitDraft: (draftId, buildCandidate) => onContentDraftCommit?.(draftId, buildCandidate),
        });
      replacementPlanRef.current = null;
      setReplacementPlan(null);
      if (mode === "import-as-new") {
        setImportedSourceLabel(result.sourceId);
        setImportedRemapTargets(replacementPlan.remapTargets);
        setReplacementStatus("imported");
      } else {
        setReplacementLabel("");
        setReplacementStatus("");
        setReplaceOpen(false);
      }
    } catch (error) {
      setReplacementError(error?.message ?? `The ${isGeoJson ? "GeoJSON" : "CSV"} replacement failed. The previous source remains active.`);
    } finally {
      setReplacementBusy(false);
    }
  };

  return (
    <article className="source-content-detail-card">
      {item.kind === "csv"
        ? <CsvDetail item={item} source={dashboard.dataSources?.[item.id]} datasetProfile={datasetProfile} />
        : <GeoJsonDetail
          item={item}
          source={dashboard.dataSources?.[item.id]}
          geoData={geoData ?? dashboard.loadedData?.[item.id]}
          action={<button type="button" className="secondary" disabled={!contentDraftCoordinator} onClick={() => { setReplacementError(""); setReplaceOpen(true); }}>{repairLabel}</button>}
        />}
      {item.kind === "csv" && <button type="button" className="secondary" disabled={!contentDraftCoordinator} onClick={() => { setReplacementError(""); setReplaceOpen(true); }}>{repairLabel}</button>}
      <RenameSource item={item} onRename={onRename} onDraftChange={onRenameDraftChange} busy={renameBusy} error={renameError} />
      <DependencyList uses={item.uses} activeRetainers={item.activeRetainers} usageKnown={item.usageKnown} />
      <ContentActionDialog
        open={replaceOpen}
        action={isGeoJson ? "replace-geojson" : relinkSource ? "relink-csv" : "replace-csv"}
        itemLabel={item.record.displayName}
        busy={replacementBusy}
        error={replacementError}
        replacementReady={replacementPlan?.status === "ready" || replacementPlan?.status === "requires-temporal-review" || replacementPlan?.status === "requires-confirmation"}
        replacementLabel={replacementLabel}
        replacementStatus={replacementPlan?.status ?? replacementStatus}
        replacementReason={replacementPlan?.reason ?? null}
        replacementWarnings={replacementPlan?.warnings ?? []}
        canImportAsNew={replacementPlan?.canImportAsNew === true}
        remapTargets={replacementPlan?.remapTargets ?? importedRemapTargets}
        impactContexts={replacementPlan?.impactContexts ?? []}
        importedSourceLabel={importedSourceLabel}
        onReplacementFile={(file) => void chooseReplacement(file)}
        onConfirm={() => void publish(replacementPlan?.status === "requires-temporal-review" ? "confirm-temporal" : replacementPlan?.status === "requires-confirmation" ? "confirm-geojson" : "replace")}
        onImportAsNew={() => void publish("import-as-new")}
        onNavigate={(use) => {
          setReplaceOpen(false);
          onRequestClose?.();
          requestAnimationFrame(() => item.uses?.onNavigate?.(use));
        }}
        onCancel={() => void cancelReplacement()}
      />
    </article>
  );
}

function RenameSource({ item, onRename, onDraftChange, busy = false, error = "" }) {
  const [displayName, setDisplayName] = React.useState(item.record.displayName);
  React.useEffect(() => setDisplayName(item.record.displayName), [item.id, item.record.displayName]);
  return (
    <form className="source-content-rename" aria-busy={busy ? "true" : undefined} onSubmit={(event) => { event.preventDefault(); void onRename?.({ displayName }); }}>
      <label><span>Display name</span><input value={displayName} disabled={busy} onChange={(event) => {
        const value = event.target.value;
        setDisplayName(value);
        onDraftChange?.({ displayName: value });
      }} required /></label>
      <button type="submit" className="secondary" disabled={busy || !onRename || displayName.trim() === item.record.displayName}>Save name</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

async function discardPreparedCsv(plan, reason, { contentDraftCoordinator, onContentDraftDiscard } = {}) {
  const draftId = plan?.draft?.draftId;
  if (!draftId) return false;
  const record = contentDraftCoordinator?.getActiveRetainers?.().records?.find(({ ownerId }) => ownerId === draftId);
  if (!record || !new Set(["staged", "error"]).has(record.status)) return false;
  return onContentDraftDiscard?.(draftId, reason) ?? false;
}
