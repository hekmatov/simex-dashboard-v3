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
      <select
        aria-label="Presentation source"
        data-presentation-control-id="source"
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const [kind, id] = event.target.value.split(":", 2);
          if (event.target.value === "") onSelectGroup(null);
          if (kind === "scene") onSelectScene(id);
          if (kind === "group") onSelectGroup(id);
        }}
      >
        <option value="">None</option>
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
