import React from "react";
import { hasUnresolvedFrameSource } from "./chronoContentState.js";

export default function SceneContent({ content, onAction = () => {} }) {
  if (!content) return React.createElement("p", { role: "alert" }, "This Scene is no longer available.");
  const repairFrameSource = hasUnresolvedFrameSource(content);
  return React.createElement("article", { className: "temporal-content-page scene-content", "aria-labelledby": "scene-content-title" },
    React.createElement("header", { className: "temporal-content-page__header" },
      React.createElement("div", null, React.createElement("p", { className: "eyebrow" }, "Scene"), React.createElement("h2", { id: "scene-content-title" }, content.name), React.createElement("p", null, `Chrono Group: ${content.chronoGroupName}`)),
      React.createElement("div", { className: "temporal-content-page__actions" },
        React.createElement("button", { type: "button", onClick: () => onAction({ type: "START_EDIT", itemType: "scene", itemId: content.id }) }, "Edit"),
        React.createElement("button", { type: "button", className: "secondary", onClick: () => onAction({ type: "START_DUPLICATE", itemType: "scene", itemId: content.id }) }, "Duplicate"),
        React.createElement("button", { type: "button", className: "secondary", onClick: () => onAction({ type: "REQUEST_REMOVE", itemType: "scene", itemId: content.id }) }, "Remove"),
        content.status === "needs-attention" && repairFrameSource ? React.createElement("button", {
          type: "button",
          "data-scene-workflow-id": "repair-frame-source",
          onClick: () => onAction({
            type: "START_REPAIR",
            itemType: "scene",
            itemId: content.id,
            stage: "details",
            focusId: "scene-frame-source",
          }),
        }, "Repair Frame source") : content.status === "needs-attention" ? React.createElement("button", {
          type: "button",
          "data-scene-workflow-id": "repair-scene",
          onClick: () => onAction({ type: "START_REPAIR", itemType: "scene", itemId: content.id }),
        }, "Repair") : null,
        React.createElement("button", { type: "button", className: "secondary", onClick: () => onAction({ type: "RETURN_TO_STUDIO" }) }, "Back to Scene Studio"),
      ),
    ),
    React.createElement("p", { className: "temporal-content-page__status", "data-status": content.status }, content.status === "needs-attention" ? "Needs attention" : "Ready"),
    ...(content.statusReasons ?? []).map((reason) => React.createElement("p", { className: "temporal-content-page__reason", key: reason }, reason)),
    React.createElement("section", null,
      React.createElement("h3", null, "Scene content"),
      React.createElement("ul", null, ...(content.memberCharts ?? []).map((member) => React.createElement("li", { key: member.chartId }, `${member.chart?.title ?? member.chart?.label ?? member.chartId}${member.pageLabel ? ` · ${member.pageLabel}` : ""}`))),
    ),
  );
}
