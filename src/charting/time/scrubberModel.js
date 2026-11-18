import { validateCursorWindow } from "./cursorModel.js";

export function scrubberModel({ clock = [], window = null, activeEpochMs, exerciseEpochMs, coverageRuns = [] } = {}) {
  validateCursorWindow(window);
  if (!clock.length) return { disabled: true, start: null, end: null, ticks: [], coverageBands: [], thumb: null, exerciseNow: null };
  const start = window ? Date.parse(window.start) : clock[0];
  const end = window ? Date.parse(window.end) : clock.at(-1);
  const fraction = epoch => start === end ? 0.5 : Math.max(0, Math.min(1, (epoch - start) / (end - start)));
  const inside = epoch => Number.isFinite(epoch) && epoch >= start && epoch <= end;
  return { disabled: false, start, end,
    ticks: clock.filter(inside).map(fraction),
    coverageBands: coverageRuns.filter(([a, b]) => b >= start && a <= end).map(([a, b]) => [fraction(a), fraction(b)]),
    thumb: Number.isFinite(activeEpochMs) ? fraction(activeEpochMs) : null,
    exerciseNow: inside(exerciseEpochMs) ? fraction(exerciseEpochMs) : null,
  };
}

/** The caller attaches this handler only to its Time bar/disclosure subtree. */
export function timeBarKeyboardAction({ key, shiftKey = false, target = {}, clock = [], activeEpochMs,
  playing = false, scrubberOpen = false, settingsOpen = false, altKey = false, ctrlKey = false, metaKey = false } = {}) {
  if (altKey || ctrlKey || metaKey) return null;
  const tag = String(target.tagName ?? "").toUpperCase();
  const range = tag === "INPUT" && target.type === "range";
  if (key === " " && tag === "BUTTON") return null;
  if (target.isContentEditable || ["SELECT", "TEXTAREA"].includes(tag) || (tag === "INPUT" && !range)) return null;
  if (key === "Escape") return { type: scrubberOpen ? "closeScrubber" : settingsOpen ? "closeSettings" : "cursorLive" };
  if (!clock.length) return null;
  if (key === " ") return { type: playing ? "pause" : "cursorPlay" };
  if (key === "Home" || key === "End") return { type: "cursorSeek", epochMs: key === "Home" ? clock[0] : clock.at(-1) };
  if (!["ArrowLeft", "ArrowRight"].includes(key)) return null;
  const direction = key === "ArrowLeft" ? -1 : 1;
  if (range && shiftKey && Number.isFinite(activeEpochMs)) {
    const delta = Math.max(1, Math.round((clock.at(-1) - clock[0]) / 1000));
    return { type: "cursorSeek", epochMs: Math.max(clock[0], Math.min(clock.at(-1), activeEpochMs + direction * delta)) };
  }
  return { type: "cursorStep", direction };
}
