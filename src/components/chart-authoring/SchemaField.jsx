import React from "react";
import ColorField from "../ColorField.jsx";
import CollectionSettingsField from "./CollectionSettingsField.jsx";
import DeltaComparisonField from "./DeltaComparisonField.jsx";
import RoleField from "./RoleField.jsx";
import StandardField, {
  fieldControlId,
  fieldDescribedBy
} from "./StandardField.jsx";
import TimeSyncSettingsField from "./TimeSyncSettingsField.jsx";
function SchemaField({
  field,
  value = field?.value,
  onChange = noop,
  columns = [],
  chart,
  charts,
  profile,
  loadedData,
  profiles,
  allowInterpolation,
  onMembershipChange,
  onGroupsChange,
  onValidationError
} = {}) {
  if (!validField(field)) return null;
  const emit = (nextValue) => onChange(field.path, nextValue);
  const shared = { field, value, onChange: emit };
  if (field.control === "role") {
    return /* @__PURE__ */ React.createElement(RoleField, { ...shared, columns });
  }
  if (field.control === "color") {
    return /* @__PURE__ */ React.createElement(
      ColorField,
      {
        id: fieldControlId(field),
        label: field.label,
        value,
        onChange: emit,
        dataColorField: field.id,
        help: field.help,
        error: field.error,
        ariaDescribedBy: fieldDescribedBy(field)
      }
    );
  }
  if (field.control === "collection") {
    return /* @__PURE__ */ React.createElement(CollectionSettingsField, { ...shared });
  }
  if (field.control === "timeSync") {
    return /* @__PURE__ */ React.createElement(
      TimeSyncSettingsField,
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
  return /* @__PURE__ */ React.createElement(StandardField, { ...shared, columns });
}
function validField(field) {
  return field !== null && typeof field === "object" && typeof field.id === "string" && typeof field.label === "string";
}
function noop() {
}
export {
  SchemaField as default
};
