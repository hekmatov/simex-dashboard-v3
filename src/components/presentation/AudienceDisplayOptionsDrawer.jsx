import React from "react";

import RightSideDrawer from "../common/RightSideDrawer.jsx";

export default function AudienceDisplayOptionsDrawer({
  open,
  onClose,
  audienceInformation = [],
  audienceFacts = {},
  onAudienceFactVisible,
}) {
  return (
    <RightSideDrawer
      id="audience-display-options-drawer"
      title="Audience display options"
      open={open}
      onClose={onClose}
      modality="dialog"
      eyebrow="Present"
      description="Choose which available scene facts appear on the audience display."
      className="audience-display-options-drawer"
      contentClassName="audience-display-options-drawer__content"
    >
      <fieldset className="present-audience-information">
        <legend>Display on audience</legend>
        <p>Shared information can be hidden without changing its value.</p>
        {audienceInformation.map((fact) => {
          const available = Boolean(fact.value);
          const descriptionId = `present-audience-fact-${fact.key}`;
          return (
            <label
              className={`present-audience-fact dashboard-choice-row${available ? "" : " is-unavailable"}`}
              key={fact.key}
              title={available ? undefined : fact.unavailableReason}
            >
              <input
                type="checkbox"
                aria-label={`Display ${fact.label}`}
                aria-describedby={descriptionId}
                checked={audienceFacts[fact.key] === true}
                disabled={!available}
                onChange={(event) => onAudienceFactVisible?.(
                  fact.key,
                  event.target.checked,
                )}
              />
              <span className="dashboard-choice-copy">
                <strong>{fact.label}</strong>
                <small id={descriptionId}>
                  {fact.value ?? fact.unavailableReason}
                </small>
              </span>
            </label>
          );
        })}
      </fieldset>
    </RightSideDrawer>
  );
}
