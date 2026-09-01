import React from "react";
import ChartPreview from "./ChartPreview.jsx";
import GeneratedFormSection from "./GeneratedFormSection.jsx";

export default function StyleLayoutStep({
  chart = null,
  rows = [],
  geoData = null,
  profile = null,
  prepared = null,
  showPreview = true,
  sections = [],
  prerequisites = [],
  ...context
} = {}) {
  const messages = Array.isArray(prerequisites)
    ? prerequisites.filter((value) => typeof value === "string" && value)
    : [];
  const visibleSections = Array.isArray(sections)
    ? sections.filter(({ id }) => id !== "data")
    : [];
  return React.createElement(
    "section",
    {
      className: "chart-wizard-step chart-wizard-style-layout",
      "aria-labelledby": "chart-wizard-style-layout-heading",
    },
    React.createElement("h3", { id: "chart-wizard-style-layout-heading" }, "Style and layout"),
    messages.length > 0
      ? React.createElement(
          "div",
          { className: "chart-wizard-prerequisites", role: "status" },
          React.createElement("strong", null, "Complete the chart data first"),
          React.createElement(
            "ul",
            null,
            messages.map((message) => React.createElement(
              "li",
              { key: message },
              message,
            )),
          ),
        )
      : null,
    chart
      ? React.createElement(
          "div",
          {
            className: [
              "chart-wizard-style-grid",
              showPreview ? "" : "chart-wizard-style-grid--without-preview",
            ].filter(Boolean).join(" "),
          },
          showPreview
            ? React.createElement(
                "div",
                { className: "chart-wizard-preview-column" },
                React.createElement(ChartPreview, {
                  chart,
                  rows,
                  geoData,
                  datasetProfile: profile,
                  diagnosticNamespace: chart.id,
                }),
              )
            : null,
          React.createElement(
            "div",
            { className: "chart-wizard-style-controls" },
            visibleSections.map((section) => React.createElement(
              GeneratedFormSection,
              {
                key: section.id,
                section,
                chart,
                profile,
                diagnostics: prepared?.diagnostics ?? [],
                diagnosticNamespace: chart.id,
                ...context,
              },
            )),
          ),
        )
      : null,
  );
}
