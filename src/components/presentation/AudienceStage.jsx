import React from "react";
import { fitPresentationStage, resolvePresentationResolution } from "../../lib/presentationResolution.js";
import { dashboardOwnedRegionProps } from "../../theme/dashboardRegionRegistry.js";

export default function AudienceStage({ resolution, children }) {
  const target = resolvePresentationResolution(resolution);
  const [viewport, setViewport] = React.useState(target);
  React.useLayoutEffect(() => {
    const measure = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    measure(); window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const fitted = fitPresentationStage(target, viewport);
  return <div className="audience-stage" {...dashboardOwnedRegionProps("audience-stage")} data-target-width={target.width} data-target-height={target.height}>
    <div className="audience-stage__presentation" style={{ width: fitted.width, height: fitted.height,
      left: fitted.left, top: fitted.top, transform: `scale(${fitted.scale})`, transformOrigin: "top left" }}>
      {children}
    </div>
  </div>;
}
