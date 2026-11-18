import React from "react";
import ExerciseContextStamp from "../common/ExerciseContextStamp.jsx";
import SceneViewCompositionGrid from "./SceneViewCompositionGrid.jsx";
import CursorTimeReadout from "../playback/CursorTimeReadout.jsx";
import { MOBILE_VIEW_QUERY, useMediaQuery } from "../common/useMediaQuery.js";

export default function StorylineBand({ dashboard, playback, activePageId }) {
  const phone = useMediaQuery(MOBILE_VIEW_QUERY);
  const scene = playback.activeScene;
  if (!scene) return null;
  return <section className="dashboard-section storyline-band" data-storyline-band={scene.id} aria-label="Storyline">
    <header className="storyline-band__header">
      {phone ? <h1>{scene.name}</h1> : <>
        <div><p className="eyebrow">Storyline</p><h2>{scene.name}</h2>
        <label>Storyline<select value={scene.id} onChange={event => playback.dispatch({ type: "setScene", sceneId: event.target.value })}>
          {playback.scenes.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}
        </select></label></div>
        <ExerciseContextStamp />
        <CursorTimeReadout mode={playback.cursor.mode} epochMs={playback.activeEpochMs} />
      </>}
      <button type="button" className="secondary" aria-label="Close Storyline" onClick={() => playback.dispatch({ type: "cursorScope", scope: { kind: "page", id: activePageId } })}>
        {phone ? "Close" : "Close Storyline"}
      </button>
    </header>
    {!phone && <p>Only Storyline members follow the selected time. Other page content remains visible.</p>}
    <SceneViewCompositionGrid dashboard={dashboard} scene={scene} timeContextForChart={playback.timeContextForChart} surface="view-scene" />
  </section>;
}
