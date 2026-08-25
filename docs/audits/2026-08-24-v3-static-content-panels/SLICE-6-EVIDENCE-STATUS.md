# Slice 6 Present/Audience Evidence Status

**Status:** Final hardening fix round 2 addressed; IM-02, IM-14, PS-01, and PS-05 restored; engine implemented, UI implemented, all 36 fidelity rows verified Passing, and independent implementation review clean. Master acceptance is pending.

FT-05, FT-06, IM-08, IM-15, and IM-16 are restored after their original binding journeys passed without wording changes or deviations. Free text remains permissive and inert with no sanitizer; Image intake and presentability remain strict.

## Acceptance disposition

| Requirement | Engine | Mounted UI/composition | Retained production route |
|---|---|---|---|
| FT-05 / FT-06 inert link and resource-boundary use | Passing: exact safe-link and typed resource limits remain deterministic | Passing: View/fullscreen online/offline activation plus every create/edit authoring limit and recovery are live | FT-05/FT-06 passed 2/2 in 1.2 minutes; safe external/scoped fragments cover both inputs, unsafe forms caused no unauthorized navigation/resource, and no unsaved source persisted |
| FT-12 Free-text Present/Audience exclusion | Passing: trusted index rejects Free text plus replacement-required/incomplete/recovery-only Images; exact protocol rejects injected/unknown descriptors | Passing: saved Free text is absent from Present and a malicious real-channel v3 message cannot produce a cell or disturb accepted cells | Passing in the real separate Audience journey at 1920×1080 and 1366×768 |
| IM-02 strict Image intake | Passing: saved-manifest budget accounting plus real decoder/structure/animation/origin limits | Passing: exact typed UI errors, blocked acceptance, replacement reset, and recovery | IM-02/IM-08 group passed 3/3 in 37.0 seconds using real PNG/JPEG/WebP and controlled named failures |
| IM-08 guided crop at 200% | Passing: keyboard/pointer operations share bounded crop geometry | Passing: page-scale 2.0 keeps focus and controls visible without horizontal overflow | Two independent Chromium cases passed at 1440×900 and 1024×768 in 8.9 seconds |
| IM-15 direct non-temporal Image presentation | Passing: exact v3 `{ kind, panel_id, source_id, revision }`; synchronous stale-selection/layout normalization; no time/Scene/Chrono/transform/bytes | Passing: canonical ChartView exposes the active rendered date; Image receives no playback context | Representative chart active date and canvas hash independently changed while Image descriptor, revision, source, and transform remained exact |
| IM-16 passive separate-Audience resolution | Passing: strict index plus per-window/cell/revision readiness and stale replay rejection | Passing: 1/2/4-cell loading, contained fit, isolated passive error, sibling continuation, no controls/overflow | All three Chrono siblings had nonzero canvases and each changed active date plus pixel hash through failure; restore/reopen replayed exact revision at 1366×768 |
| PS-04 physical copied package | Passing: generator, promotion, MIME and containment owners exercised together | Passing: real Windows launcher served main and passive separate Audience from the copied directory | PNG bytes/MIME exact, traversal denied, browser offline with zero external requests, 1366×768 Audience fits; process stopped and exact temp copy removed |
| PS-08 temporal/static and playback ownership | Passing: Build/Scene filters, unchanged Scene schema, static bypass, tokenized playback-view owners | Passing: StrictMode Present releases only its stable token and time controls affect only charts | Pre-existing/overlapping owners survive; charts changed before and through Image failure |

## Evidence summary

- Core fix-focused deterministic suite: **35/35 passed**.
- Final affected sweep: **77/78 passed**; all 77 executed assertions passed. The sole failure is the unchanged legacy `playbackComponentsV3.test.js` raw-Node JSX loader baseline, which aborts before assertions on `FreeTextChartView.jsx`.
- Runtime-boundary check: **passed**, with no remote runtime dependencies.
- Fix-round focused canonical regressions: **51/51 passed** in 3.59 seconds.
- Production build: **passed**, 891 modules in 9.47 seconds.
- Binding Image/Audience journey: **1/1 passed** in 29.7 seconds.
- FT-05/FT-06: **2/2 passed** in 1.2 minutes.
- IM-08: **2/2 passed** in 8.9 seconds.
- Copied Windows package launch/offline/cleanup: **1/1 passed** in the final affected sweep.

Exact RED/GREEN history, browser checkpoints, baseline disclosures, and implementation owners are recorded in `.superpowers/sdd/2026-08-24-static-content-panels/task-6-report.md`.

## Whole-branch hardening wave

**Status:** 7 findings addressed, 0 open; implementation complete and independent implementation review clean. Master acceptance is pending.

The final 36-row disposition remains Passing after new strict RED→GREEN evidence for aggregate asset budget authority, finalized-source-only manifests, unified static dirty selection, multiply-used legacy Image migration, terminal JPEG EOI, exact typed static schemas, and contained packaged preview paths. The final consolidated affected sweep passed 152/152; runtime boundaries passed with no remote dependencies; and the 891-module production build passed in 9.88 seconds. Material Chromium evidence passed at 1440×900 for near-budget creation and exact Keep editing/Discard draft retention, and at 1280×800 for packaged generated-path crop preview. No Free-text source-policy or protocol behavior changed.

Final hardening fix round 2 adds identity-before-accounting duplicate cases, pruned-final-candidate replacement cases, and a real local staged-replacement navigation journey. RED was 3/29 focused failures plus one leaked session/blob entry. GREEN is 29/29 focused, 155/155 consolidated, runtime boundary passed with no remote dependencies, production build passed with 891 modules in 15.31 seconds, and Chromium passed 1/1 in 16.4 seconds at 1440×900. Discard preserved the saved source, removed the staged registry entry, observed exact blob URL revocation, and completed the requested Dashboard-map navigation.
