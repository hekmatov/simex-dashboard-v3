# Room moderator runbook

Draft for the engineering RC. The Moderator and Observer should follow this guide without builder coaching. Record exact app/package identities, people, devices, projector settings and results in the [rehearsal packet](rehearsal.md). Generic role labels do not establish participation. Support is currently **unassigned**; see [scope and support](scope-and-support.md).

## Before participants arrive

1. Preserve the previous compatible app/package and a fresh complete export. Verify the candidate and approved phase checksum. Use the full workspace for moderation and only the reviewed participant variants for distribution.
2. While connected, open required pages, Storylines, local media and lazy workspaces. Reopen the warmed app offline and confirm the actual data and images. A first hosted visit requires connectivity; a standalone HTML has its own offline launch check.
3. Set the intended presentation resolution and declared exercise time in **Build → Scenario Passport** and save them. Record that time separately from the package's publication cutoff. Connect the room display, extend the desktop, and keep browser zoom/scaling at the recorded settings.
4. In **Present**, choose the saved source/layout and open the Audience window on the same computer and origin. Allow the popup, move it to the room display and use fullscreen there. Confirm the actual Audience image agrees with the monitor; a monitor marked local is only a fallback.
5. Check letterboxing, chart labels and dense/long titles from the participant seating distance. Check visible fictional notice, version, cursor time and observation/as-of context. Confirm keyboard focus, actual screen-reader announcements and phone View controls with the assigned testers. Record readability/focus/reflow results separately for PDPC, Ledger, Humanist and Instrument; changing style does not change the exercise data.
6. Practice **Black**, return to **Active**, close/reopen Audience, and end the session. Confirm the operator can recover using the controls and known-issues instructions before beginning the exercise.

## During the exercise

Start with the reviewed first phase. Announce the declared exercise time separately from the selected historical cursor time. Browse pages and the approved Storylines; explain when a sparse observation is carried forward or unavailable. Pause before discussing a historical frame. Ordinary page content should remain available when a Storyline band is open.

To advance the declared clock, seek to the intended later instant in Present and choose **Advance exercise time**. A successful save returns to Live. Finish open drafts first; ordinary seeking/playback does not advance the declared clock. Check for a save error before announcing the new time.

Release the next phase package only at its agreed exercise boundary. Review and confirm the import; verify its identity and expected content. Reload or reopen Audience after each phase import, then verify its actual charts and time before resuming. A date cursor does not conceal future rows contained in an earlier package. Keep original/full packages outside participant distribution.

Use **Present** to control the saved output. **Black** temporarily blanks it; **Holding** shows the holding output; **Active** restores active content. End the presentation when the room session is over. Check the actual room display after source/layout/time changes rather than inferring success from a local monitor alone.

The Observer records task outcomes, confusion, interventions, timings and exact candidate/package identity in ordinary notes. Record chart-heavy page and Audience capture overhead separately. Accepted observed-device targets are warm-offline usable View within 3 seconds, page/time feedback p95 within 200 ms and no input-blocking task over 1 second.

## If something goes wrong

- **Audience disconnect or closed window:** pause narration/playback, preserve saved state, reopen Audience from Present and wait for connected output. Verify its actual version/source/time before resuming. Identify any local fallback honestly.
- **Blank/error chart:** inspect source and observation availability. Missing exact data is not zero. Retry only the supported content action; do not change source meaning to make the chart render. Record the error and affected phase.
- **Changed chart bindings or source data:** reload or reopen Audience, then verify its actual charts before resuming. Accepted time/matching updates do not replace chart/source bytes already loaded in that window.
- **Offline asset or workspace missing:** return online only if the exercise permits, warm the required resource and repeat the affected offline task. Record the gap; do not claim offline readiness from an unrelated cached page.
- **Saved package cannot load after an update:** preserve the newer export. Follow the [maintainer rollback guide](maintainer-release-and-rollback.md) with the retained app and compatible package. An older app may reject a newer format. Do not clear the live browser profile as a first recovery step.

## Debrief and close

Replay the same saved Storylines and key times from the Observer's notes. Ask participants to explain source, observation time, uncertainty and fictional status. Export the saved result so the debrief can cite its app/package versions and integrity identity. Preserve the original package and relevant provenance companions.

Classify findings as content, product, setup or later requests. Repair every blocker and repeat its affected task. Repeat the full-day rehearsal only when a finding invalidates the overall evidence. Keep remaining user impact and disposition visible. Final RC acceptance is a separate explicit human decision against the exact candidate; production publication and the real pilot remain outside this runbook's authority.
