import React from "react";

import ModalFocusScope from "../common/ModalFocusScope.jsx";

export default function ChartEditorModal({
  titleId = "chart-editor-title",
  onClose,
  children,
}) {
  return React.createElement(
    ModalFocusScope,
    {
      className: "chart-editor-backdrop",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": titleId,
      onEscape: onClose,
      onPointerDown: (event) => {
        if (event.target === event.currentTarget) onClose?.();
      },
    },
    children,
  );
}
