import React from "react";

import { CANONICAL_HOME_CONTENT } from "../../home/canonicalHomeContent.js";
import { LandingPresentation } from "../LandingPage.jsx";
import CanonicalDashboardFrame, {
  CanonicalDashboardFooter,
} from "../dashboard/CanonicalDashboardFrame.jsx";

export default function CanonicalHomeWorkspace({
  dashboard,
  onModeRequest,
  focusRequestKey,
  baseUrl = import.meta.env.BASE_URL,
}) {
  const landmarkRef = React.useRef(null);
  const previousFocusRequestKeyRef = React.useRef(focusRequestKey);

  React.useEffect(() => {
    if (previousFocusRequestKeyRef.current === focusRequestKey) return;
    previousFocusRequestKeyRef.current = focusRequestKey;
    landmarkRef.current?.focus({ preventScroll: true });
  }, [focusRequestKey]);

  return (
    <div className="view-shell home-mode-shell">
      <CanonicalDashboardFrame
        mode="home"
        landmarkRef={landmarkRef}
        landmarkTabIndex={-1}
        landmarkLabelledBy="showcase-landing-title"
        pageContent={(
          <LandingPresentation
            landing={CANONICAL_HOME_CONTENT}
            onModeRequest={onModeRequest}
            baseUrl={baseUrl}
          />
        )}
        footer={<CanonicalDashboardFooter dashboard={dashboard} />}
      />
    </div>
  );
}
