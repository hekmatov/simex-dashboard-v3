import React from "react";
import ColorField from "../ColorField.jsx";
import CollectionSettingsField from "./CollectionSettingsField.jsx";
import CitationField from "./CitationField.jsx";
import DeltaComparisonField from "./DeltaComparisonField.jsx";
import RoleField from "./RoleField.jsx";
import ReferenceLineField from "./ReferenceLineField.jsx";
import SeriesColorsField from "./SeriesColorsField.jsx";
import QuickBackgroundField from "./QuickBackgroundField.jsx";
import StandardField, {
  fieldControlId,
  fieldDescribedBy
} from "./StandardField.jsx";
import ChronoMembershipSettingsField from "./ChronoMembershipSettingsField.jsx";
function SchemaField({
  field,
  value = field?.value,
  onChange = noop,
  columns = [],
  rows = [],
  chart,
  charts,
  profile,
  loadedData,
  profiles,
  allowInterpolation,
  diagnostics = [],
  onMembershipChange,
  onGroupsChange,
  onValidationError,
  dataSources = {},
  onApplyCitationToSourceCharts,
} = {}) {
  if (!validField(field)) return null;
  const diagnosticIds = Array.isArray(diagnostics)
    ? diagnostics.flatMap((diagnostic) => typeof diagnostic?.id === "string" ? [diagnostic.id] : [])
    : [];
  const decoratedField = diagnosticIds.length > 0 ? { ...field, diagnosticIds } : field;
  const emit = (nextValue) => onChange(field.path, nextValue);
  const shared = { field: decoratedField, value, onChange: emit };
  if (field.control === "role") {
    return /* @__PURE__ */ React.createElement(RoleField, { ...shared, columns });
  }
  if (field.control === "palette") {
    return /* @__PURE__ */ React.createElement(SeriesColorsField, shared);
  }
  if (field.control === "quickBackground") {
    return /* @__PURE__ */ React.createElement(QuickBackgroundField, {
      field: decoratedField,
      chart,
      onChange,
    });
  }
  if (field.control === "referenceLine") {
    return /* @__PURE__ */ React.createElement(ReferenceLineField, shared);
  }
  if (field.control === "citation") {
    return /* @__PURE__ */ React.createElement(CitationField, {
      ...shared,
      chart,
      charts,
      dataSources,
      profile,
      onApplyCitationToSourceCharts,
    });
  }
  if (field.control === "color") {
    const background = isBackgroundColorField(field);
    const backgroundValue = chart?.presentation?.background;
    const backgroundColor = validHex(backgroundValue?.color)
      ? backgroundValue.color
      : validHex(value)
        ? value
        : "";
    return /* @__PURE__ */ React.createElement(
      ColorField,
      {
        id: fieldControlId(decoratedField),
        label: field.label,
        value,
        fallback: background ? "" : undefined,
        onChange: emit,
        dataColorField: field.id,
        help: field.help,
        error: field.error,
        invalid: diagnosticIds.length > 0,
        ariaDescribedBy: fieldDescribedBy(decoratedField),
        allowTransparency: background,
        transparent: background && backgroundValue?.transparent === true,
        allowDefault: background,
        defaultActive: background && !validHex(backgroundValue?.color) && backgroundValue?.transparent !== true,
        onDefault: background
          ? () => onChange(["presentation", "background"], undefined)
          : undefined,
        onTransparencyChange: background
          ? (transparent) => onChange(
            ["presentation", "background"],
            transparent
              ? {
                  ...(validHex(backgroundColor)
                    ? { color: backgroundColor.toUpperCase() }
                    : {}),
                  transparent: true,
                }
              : validHex(backgroundColor)
                ? { color: backgroundColor.toUpperCase(), transparent: false }
                : undefined
          )
          : void 0
      }
    );
  }
  if (field.control === "collection") {
    return /* @__PURE__ */ React.createElement(CollectionSettingsField, { ...shared });
  }
  if (field.control === "timeSync") {
    return /* @__PURE__ */ React.createElement(
      ChronoMembershipSettingsField,
      {
        field,
        chart,
        charts,
        loadedData,
        profiles,
        onMembershipChange,
        onGroupsChange,
        onValidationError
      }
    );
  }
  if (field.control === "deltaComparison") {
    return /* @__PURE__ */ React.createElement(
      DeltaComparisonField,
      {
        ...shared,
        chart,
        profile,
        allowInterpolation
      }
    );
  }
  if (field.control === "pivot") {
    return /* @__PURE__ */ React.createElement(StandardField, {
      field: { ...decoratedField, control: "toggle" },
      value: value?.mode === "measuresToRows",
      onChange: (enabled) => emit(enabled ? { mode: "measuresToRows" } : null),
      columns,
      rows,
    });
  }
  return /* @__PURE__ */ React.createElement(StandardField, { ...shared, columns, rows });
}
function validField(field) {
  return field !== null && typeof field === "object" && typeof field.id === "string" && typeof field.label === "string";
}
function isBackgroundColorField(field) {
  return Array.isArray(field?.path)
    && field.path.length === 3
    && field.path[0] === "presentation"
    && field.path[1] === "background"
    && field.path[2] === "color";
}
function validHex(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim());
}
function noop() {
}
export {
  SchemaField as default
};
