export function presentationTimeFixture(overrides = {}) {
  const frame_epochs = overrides.frame_epochs ?? [100, 200];
  const frame_index = overrides.frame_index ?? 0;
  return { mode: "at", epoch_ms: frame_epochs[frame_index] ?? null, scope: { kind: "dashboard", id: null },
    window: null, exercise_time: null, frame_epochs, frame_index, trace_mode: "reveal", seconds_per_frame: 1,
    matching_override: "authored", nearest_tolerance_ms: null, members: [], ...overrides };
}
