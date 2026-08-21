import { isMeaningfulChartDraft } from "./chartDraftSession.js";

export const CHART_DRAFT_EXIT_WARNING =
  "This chart draft exists only in the current application session and cannot be resumed after exit.";

export function installChartDraftUnloadGuard({ getDraft, window: platform } = {}) {
  if (typeof getDraft !== "function") {
    throw new TypeError("Chart draft unload guard requires getDraft.");
  }
  if (
    !platform
    || !("onbeforeunload" in platform)
    || typeof platform.addEventListener !== "function"
    || typeof platform.removeEventListener !== "function"
    || !isMeaningfulChartDraft(getDraft())
  ) {
    return () => {};
  }

  const beforeUnload = (event) => {
    if (!isMeaningfulChartDraft(getDraft())) return undefined;
    event?.preventDefault?.();
    if (event) event.returnValue = CHART_DRAFT_EXIT_WARNING;
    return CHART_DRAFT_EXIT_WARNING;
  };
  platform.addEventListener("beforeunload", beforeUnload);
  return () => platform.removeEventListener("beforeunload", beforeUnload);
}
