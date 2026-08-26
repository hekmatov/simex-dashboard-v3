import React from "react";
import { commitCsvReplacement, prepareCsvReplacement } from "../../content-library/csvReplacementTransaction.js";
import { parseUploadedCsvFile } from "../chart-authoring/ChartWizardV3.jsx";
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
  onRequestClose,
  onContentDraftStage,
  onContentDraftCommit,
  onContentDraftDiscard,
}) {
  const [replaceOpen, setReplaceOpen] = React.useState(false);
  const [replacementPlan, setReplacementPlan] = React.useState(null);
  const [replacementLabel, setReplacementLabel] = React.useState("");
  const [replacementBusy, setReplacementBusy] = React.useState(false);
  const [replacementError, setReplacementError] = React.useState("");
  const [replacementStatus, setReplacementStatus] = React.useState("");
  const [importedSourceLabel, setImportedSourceLabel] = React.useState("");
  const [importedRemapTargets, setImportedRemapTargets] = React.useState([]);
  const replacementPlanRef = React.useRef(null);
  const lifecycleRef = React.useRef({ contentDraftCoordinator, onContentDraftDiscard });
  lifecycleRef.current = { contentDraftCoordinator, onContentDraftDiscard };
  React.useEffect(() => () => {
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
      const plan = await prepareCsvReplacement({
        dashboard,
        sourceId: item.id,
        file,
        parseCandidate: (candidateFile) => parseUploadedCsvFile(candidateFile, dashboard.dataSources ?? {}),
      });
      if (plan.draft) await onContentDraftStage?.(plan.draft);
      replacementPlanRef.current = plan;
      setReplacementPlan(plan);
      setReplacementLabel(file.name || "Replacement CSV");
      setReplacementStatus(plan.status);
    } catch (error) {
      replacementPlanRef.current = null;
      setReplacementPlan(null);
      setReplacementLabel("");
      setReplacementStatus("");
      setReplacementError(error?.message ?? "The replacement CSV could not be prepared.");
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
      const result = await commitCsvReplacement(replacementPlan, {
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
      replacementPlanRef.current = null;
      setReplacementPlan(null);
      setReplacementError(error?.message ?? "The CSV replacement failed. The previous source remains active.");
    } finally {
      setReplacementBusy(false);
    }
  };

  return (
    <article className="source-content-detail-card">
      {item.kind === "csv"
        ? <CsvDetail item={item} source={dashboard.dataSources?.[item.id]} datasetProfile={datasetProfile} />
        : <GeoJsonDetail item={item} source={dashboard.dataSources?.[item.id]} geoData={geoData ?? dashboard.loadedData?.[item.id]} />}
      {item.kind === "csv" && <button type="button" className="secondary" disabled={!contentDraftCoordinator} onClick={() => { setReplacementError(""); setReplaceOpen(true); }}>{item.record.origin === "linked-project" ? "Relink" : "Replace file"}</button>}
      <RenameSource item={item} onRename={onRename} />
      <DependencyList uses={item.uses} activeRetainers={item.activeRetainers} usageKnown={item.usageKnown} />
      <ContentActionDialog
        open={replaceOpen}
        action="replace-csv"
        itemLabel={item.record.displayName}
        busy={replacementBusy}
        error={replacementError}
        replacementReady={replacementPlan?.status === "ready" || replacementPlan?.status === "requires-temporal-review"}
        replacementLabel={replacementLabel}
        replacementStatus={replacementPlan?.status ?? replacementStatus}
        replacementReason={replacementPlan?.reason ?? null}
        canImportAsNew={replacementPlan?.canImportAsNew === true}
        remapTargets={replacementPlan?.remapTargets ?? importedRemapTargets}
        impactContexts={replacementPlan?.impactContexts ?? []}
        importedSourceLabel={importedSourceLabel}
        onReplacementFile={(file) => void chooseReplacement(file)}
        onConfirm={() => void publish(replacementPlan?.status === "requires-temporal-review" ? "confirm-temporal" : "replace")}
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

async function discardPreparedCsv(plan, reason, { contentDraftCoordinator, onContentDraftDiscard } = {}) {
  const draftId = plan?.draft?.draftId;
  if (!draftId) return false;
  const record = contentDraftCoordinator?.getActiveRetainers?.().records?.find(({ ownerId }) => ownerId === draftId);
  if (!record || record.status !== "staged") return false;
  return onContentDraftDiscard?.(draftId, reason) ?? false;
}
