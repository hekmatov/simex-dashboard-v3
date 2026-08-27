import React from "react";

export default function PresentationSourcePicker({
  scenes = [],
  groups = [],
  activeSceneId = null,
  activeGroupId = null,
  disabled = false,
  onSelectScene = () => {},
  onSelectGroup = () => {},
}) {
  const value = activeSceneId
    ? `scene:${activeSceneId}`
    : activeGroupId
      ? `group:${activeGroupId}`
      : "";
  return (
    <label className="present-field present-source-picker">
      <span>Presentation source</span>
      <select
        aria-label="Presentation source"
        data-presentation-control-id="source"
        value={value}
        disabled={disabled || (scenes.length === 0 && groups.length === 0)}
        onChange={(event) => {
          const [kind, id] = event.target.value.split(":", 2);
          if (kind === "scene") onSelectScene(id);
          if (kind === "group") onSelectGroup(id);
        }}
      >
        {value === "" && <option value="">No authored source available</option>}
        {scenes.length > 0 && (
          <optgroup label="Scenes">
            {scenes.map((scene) => (
              <option key={scene.id} value={`scene:${scene.id}`}>
                {scene.name ?? scene.title ?? scene.id}
                {scene.present?.temporalReview?.status === "degraded" ? " — Needs attention" : ""}
              </option>
            ))}
          </optgroup>
        )}
        {groups.length > 0 && (
          <optgroup label="Chrono Groups">
            {groups.map((group) => (
              <option key={group.id} value={`group:${group.id}`}>
                {group.name ?? group.title ?? group.id}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </label>
  );
}
