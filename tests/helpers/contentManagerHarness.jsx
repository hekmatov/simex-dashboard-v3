import React from "react";
import SourceContentWorkspace from "../../src/components/source-content/SourceContentWorkspace.jsx";

export default function ContentManagerHarness({ dashboard, viewport = 1440, failAt = null }) {
  const [committedDashboard, setCommittedDashboard] = React.useState(dashboard);
  const transactionLog = React.useRef([]);
  const drafts = React.useRef(new Map());
  React.useEffect(() => {
    window.__SIMEX_CONTENT_TEST__ = { committedDashboard, transactionLog: transactionLog.current };
    return () => { delete window.__SIMEX_CONTENT_TEST__; };
  }, [committedDashboard]);
  return <SourceContentWorkspace
    dashboard={committedDashboard}
    viewportWidth={viewport}
    onContentDraftStage={(input) => { drafts.current.set(input.draftId, input); transactionLog.current.push({ type: "stage", draftId: input.draftId }); return input; }}
    onContentDraftCommit={async (draftId, buildCandidate) => {
      if (failAt === "commit") throw new Error("Harness commit failure");
      const result = buildCandidate({ dashboard: committedDashboard, draft: drafts.current.get(draftId) });
      setCommittedDashboard(result.dashboard);
      drafts.current.delete(draftId);
      transactionLog.current.push({ type: "commit", draftId });
    }}
    onContentDraftDiscard={(draftId, reason) => { drafts.current.delete(draftId); transactionLog.current.push({ type: "discard", draftId, reason }); }}
  />;
}
