import { isMeaningfulChartDraft } from "./chartDraftSession.js";

export const CHART_DRAFT_EXIT_WARNING =
  "This chart draft exists only in the current application session and cannot be resumed after exit.";
export const BUILD_DRAFT_EXIT_WARNING =
  "Unsaved Build authoring changes cannot be resumed after exit.";

export function installChartDraftUnloadGuard({
  getDraft,
  hasOtherMeaningfulDraft = () => false,
  window: platform,
} = {}) {
  if (typeof getDraft !== "function") {
    throw new TypeError("Chart draft unload guard requires getDraft.");
  }
  if (
    !platform
    || !("onbeforeunload" in platform)
    || typeof platform.addEventListener !== "function"
    || typeof platform.removeEventListener !== "function"
    || !shouldWarn(getDraft, hasOtherMeaningfulDraft)
  ) {
    return () => {};
  }

  const beforeUnload = (event) => {
    const chartDraftActive = isMeaningfulChartDraft(getDraft());
    if (!chartDraftActive && !hasOtherMeaningfulDraft()) return undefined;
    const warning = chartDraftActive
      ? CHART_DRAFT_EXIT_WARNING
      : BUILD_DRAFT_EXIT_WARNING;
    event?.preventDefault?.();
    if (event) event.returnValue = warning;
    return warning;
  };
  platform.addEventListener("beforeunload", beforeUnload);
  return () => platform.removeEventListener("beforeunload", beforeUnload);
}

function shouldWarn(getDraft, hasOtherMeaningfulDraft) {
  return isMeaningfulChartDraft(getDraft()) || hasOtherMeaningfulDraft();
}
