# SimEx validation 7 human test guide

Start with the device checks below. You can do them yourself on the equipment you have and send back a short report. Use the [rehearsal packet](rehearsal.md) when a moderator and observer can run the exercise together. It contains the phase schedule, expected data and tasks for a full rehearsal.

## Reported results

| Check | Result |
|---|---|
| Section 1 — device and candidate setup | Pass, as reported |
| Open and read | Pass, as reported |
| Time and Storyline | Pass, as reported |
| Phone touch | Deferred until after deployment |
| Warm offline View and standalone offline | Deferred until after deployment |
| Sections 3–5 — accessibility and room equipment, staff rehearsal, and detailed results | Deferred until after deployment |

The report did not specify the build or device details. The owner gave final release-candidate approval in the implementation chat on 18 November 2026 with “approved.” The checks listed above remain deferred.

## 1. Pick a device and open the candidate

- **On the preview laptop**, open [validation 7 in View](http://127.0.0.1:4310/?mode=view). Confirm the footer says **App version 0.2.0-rc.1**. The candidate tag is `rc/0.2.0-rc.1-validation.7` and its app commit starts with `65ac6935`. Use a separate browser profile for import, export or save exercises. [Build identity](../release/rc1-v7-standard-artifact.json)
- **On a separate phone or tablet**, copy a participant HTML file to that device and open it in a browser that can run local HTML. Start with either the [August Biomedical HTML](../release/rc1-v7-phase3-deliverables/Offline/PDPC-Biomedical-Offline.html) or [August Socioeconomic HTML](../release/rc1-v7-phase3-deliverables/Offline/PDPC-Socioeconomic-Offline.html). The laptop's loopback address points back to the device that opens it. If the device only shows a file preview or cannot run the HTML, record the setup as **Blocked**. The participant files contain Scenario and their own discipline page. Use the full workspace for the cross-page Storylines, Build and Present checks.
- Record the device model, OS, browser and version, and whether you used the full workspace or a named participant HTML. Include browser zoom, portrait or landscape, and whether the device was plugged in. For room checks, add display resolution and approximate viewing distance.

## 2. Quick device check

Allow about 10–15 minutes per device. For each applicable check, mark **Pass**, **Fail**, **Blocked** or **Not run**.

| Check | What to do | What you should see |
|---|---|---|
| Open and read | Open Scenario, then the available discipline pages. On a phone, tap the current page name in the top row to change pages. Scroll down to a chart and back up. | Pages remain reachable. Labels, dates and sources are readable, the main page fits the screen width, and the notice reads **Fictional scenario · Exercise use only**. |
| Time and Storyline | On the full workspace, choose **Cases and institutional trust** in the **Scope** menu. Tap or click the displayed date and time to open the slider. On a phone, open the slider first to reveal **Scope**. Seek to **1 August 2027**, then move one step back and forward and return to **Live**. If using a participant file, use the ordinary page time controls where available. | The charts reflect the selected time, including carried observations. In the full workspace, the trust chart carries its **19 July** observation at 1 August. Ordinary page charts remain reachable below the Storyline. |
| Phone touch | In portrait, switch pages, change time, open a chart with **Focus chart**, and exit. Try ordinary vertical scrolling over a chart. | Controls are easy to tap, scrolling works, and exiting the chart returns you to the page. Note any overlap, accidental gesture or control you cannot reach. |
| Warm offline View | On the preview laptop, first open both discipline pages while online. In Chromium DevTools, choose **Network → Offline** and reload the same preview tab with DevTools open. Once Scenario is usable, switch to a discipline page and check a chart. Return the network setting to normal afterwards. | The app opens and the chart shows data while the browser is offline. Start timing when you reload and stop when Scenario and its page control are usable. Mark the measurement as a reload. |
| Standalone offline | For a participant HTML, close its tab, disconnect the device from Wi-Fi and mobile data, then open the saved file again. Go to its discipline page. | The file renders its local content, charts and branding offline. Record the result as standalone HTML. |

Turning off laptop Wi-Fi alone leaves its loopback server reachable. Record how you made the browser offline. If you time a warm reopen in a new tab, set that tab to **Offline** before navigating and record it separately from a reload.

The agreed targets are **3 seconds** for usable warm offline View, **200 ms p95** for page and Time feedback, and **1 second** for the longest input-blocking task. For a manual check, record your approximate startup time and any pauses you notice. A stopwatch or visual impression can flag a problem. Use an instrumented browser run for p95 and main-thread task measurements.

## 3. Use real accessibility and room equipment

Run the checks you have equipment for. Leave the rest marked **Not run**.

- **Keyboard and screen reader.** With the actual screen reader running, use the keyboard to switch pages and activate **Choose time**. Move the **Selected time** slider with the arrow keys, then open and exit a focused chart. Record the screen reader name/version, what it announced for the time change, and where focus went after exiting. Check that focus is visible and you can reach the page and time controls without getting trapped.
- **Projector or second display.** In **Present**, choose a saved Storyline and select **Open audience display**. Move the window to the actual room display and make it fullscreen. Change time and compare the monitor with what the room sees. From a participant seat, read a chart title, axis label, time or as-of date and the fictional-use notice. Try **Black**, then **Active**. Close Audience and reopen it from Present to check recovery. Record any difference between monitor and room output.
- **Appearance.** For full acceptance, repeat the relevant focus, contrast, reflow and room-readability checks in **PDPC, Ledger, Humanist and Instrument**. Record which looks you actually tried.

## 4. Use the rehearsal packet with staff

Give the moderator and observer the [rehearsal packet](rehearsal.md), [moderator runbook](moderator-runbook.md), [author quick start](author-quick-start.md) and [maintainer guide](maintainer-release-and-rollback.md). Ask them to follow the guides independently and record where they needed help.

1. **Prepare.** The moderator identifies the exact candidate, checks the phase packages and keeps a compatible backup. Use the full workspace for moderation. For each participant group, select the matching discipline artifact for that phase. Keep the complete operator package with the moderator. [Participant file identities](../release/rc1-v7-participant-content-inspection.json)
2. **Run.** Work through the full rehearsal using the **31 March**, **31 May** and **15 August 2027** phase handoffs. Follow the runbook for import review, time changes, Audience, offline operation and recovery. Use the observation table in the rehearsal packet to check carried dates. Ask the observer to note any intervention.
3. **Debrief.** Reopen the key Storylines and the exported result from the notes. Check that staff can identify the source, observation date and exercise context. Record which instructions they could follow and which need clarification.

## 5. Send back your results

Paste this into the chat and repeat the device and check lines as needed. A partial report is useful.

```text
Candidate: validation 7 / 0.2.0-rc.1
Date and tester or role:
Device, OS, browser/version, zoom/orientation:
Artifact used (preview or exact HTML filename):
Network setting and warm offline reload/reopen time, if measured:
Check and result (Pass / Fail / Blocked / Not run):
Steps, expected result and what happened:
Screen reader/version or display resolution and distance, if used:
Rehearsal/guide use and any help needed:
Screenshot or recording, if useful:
```

Send failures with the page, chart or Storyline, and selected date if relevant.
