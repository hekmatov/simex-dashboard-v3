import React from "react";
import GeneratedFormSection from "./GeneratedFormSection.jsx";

export default function DataRolesStep({
  section = null,
  prerequisites = [],
  ...context
} = {}) {
  const messages = cleanMessages(prerequisites);
  return React.createElement(
    "section",
    {
      className: "chart-wizard-step chart-wizard-data-roles",
      "aria-labelledby": "chart-wizard-data-roles-heading",
    },
    React.createElement("h3", { id: "chart-wizard-data-roles-heading" }, "Assign data roles"),
    section
      ? React.createElement(
          "p",
          { className: "chart-wizard-step-intro" },
          "Choose the measurements first, then describe how the remaining columns organize those values.",
        )
      : null,
    React.createElement(PrerequisiteNotice, { messages }),
    section
      ? React.createElement(GeneratedFormSection, {
          ...context,
          section: {
            ...section,
            fields: orderDataFields(section.fields),
          },
        })
      : null,
  );
}

export function orderDataFields(fields) {
  if (!Array.isArray(fields)) return [];
  return fields
    .map((field, index) => ({
      field,
      index,
      priority: measurementPriority(field),
    }))
    .sort((left, right) => (
      left.priority - right.priority || left.index - right.index
    ))
    .map(({ field }) => field);
}

function measurementPriority(field) {
  const identity = `${field?.id ?? ""} ${field?.label ?? ""}`;
  return /\bmeasurements?\b/i.test(identity) ? 0 : 1;
}

function PrerequisiteNotice({ messages }) {
  if (messages.length === 0) return null;
  return React.createElement(
    "div",
    { className: "chart-wizard-prerequisites", role: "status" },
    React.createElement("strong", null, "Before this step"),
    React.createElement(
      "ul",
      null,
      messages.map((message) => React.createElement(
        "li",
        { key: message },
        message,
      )),
    ),
  );
}

function cleanMessages(values) {
  return Array.isArray(values)
    ? values.filter((value) => typeof value === "string" && value)
    : [];
}
