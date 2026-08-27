import React from "react";

import { SimExIcon } from "../common/SimExIcon.js";
import { getInteraction } from "../../iconography/iconCatalog.js";

const CONNECTION_INTERACTION_IDS = Object.freeze({
  disconnected: "presentation.connection-disconnected",
  reconnecting: "presentation.connection-reconnecting",
});

export default function ConnectionIndicator({ connection }) {
  const interactionId = CONNECTION_INTERACTION_IDS[connection];
  if (!interactionId) return null;

  const interaction = getInteraction(interactionId);
  return (
    <span
      className="presentation-connection-indicator"
      data-connection-indicator={connection}
    >
      <SimExIcon
        iconId={interaction.glyphId}
        decorative={false}
        label={interaction.label}
        size={20}
      />
    </span>
  );
}
