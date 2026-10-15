# M0 practitioner launch and navigation walkthrough

Status: five-minute walkthrough and prior Chrono recheck accepted by the practitioner on 12 October 2026. Additional feedback repairs and the 15 October Chrono playback correction await practitioner recheck.

## Live candidate

Open [the Chrono playback preview](http://127.0.0.1:4283/) in Chrome or Edge on this computer. It serves the immutable production build of the 15 October Chrono correction, including the 12 October practitioner repairs, from `fable-preparation`; the exact commit and build relationship are recorded in the snapshot's `candidate-identity.json` and the rolling checkpoint. The selected authored content remains committed as `45f9a02ef564ca8a9638d9c77844d6e7550b6345`. App version: **0.1.0**. Package: **HeV-A26 Day 2 Simulation**, configuration version **6**, updated **2026-09-03**. The original Downloads bundle SHA-256 is `b1582453dc2e2fd419a435f9af278b07f76325bd4867576437adf321c1dc84da`; `config/dashboard.json` SHA-256 remains `bb6aafbb382a8013d6c66d54e434f847409a65ca8ec04b1d97b16226af3bda07`.

The two Pages are **Biomedical** and **Socio-economic**, containing **38 charts across 15 types**. This package has two Chrono Groups and no saved Scenes. The 1 October source/render/playback checks and the 3 October **28/28** checks plus **1/1** Chrono membership journey remain historical evidence; both practitioner rechecks subsequently passed. For the 12 October repairs, the focused **142/142** selection passed, affected checks were reused or rerun after scoped review corrections, and all five feedback browser journeys are covered. The rolling checkpoint records exact counts and limits. No authored content was changed.

Use the same `127.0.0.1:4283` address throughout; `localhost` is a different origin. Avoid saving trial edits or resetting storage during this walkthrough. Export a V3 package if you later author changes. **4282 preserves the 12 October feedback preview, 4281 the accepted earlier Chrono repair preview, and 4280 the historical 1 October content baseline**. Those snapshots and their browser storage, including unsaved user edits, are preserved. Do not reset those origins. The earlier 4279 snapshot also remains historical evidence.

## Preview process

The hidden Vite preview process listens only on `127.0.0.1:4283` (PID **1240**; consult `server.pid` after a restart). Its immutable `dist` output, current PID, stdout/stderr, focused Playwright configuration and browser results live in:

`C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-m0-integration-evidence\m0-chrono-playback-20261015`

Keep it running through feedback. To stop or restart, use PowerShell from `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`:

```powershell
$previewDir = 'C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-m0-integration-evidence\m0-chrono-playback-20261015'
$previewPid = [int](Get-Content -LiteralPath (Join-Path $previewDir 'server.pid'))
$previewProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$previewPid"
if ($previewProcess.CommandLine -like '*vite*4283*m0-chrono-playback-20261015*dist*') {
    Stop-Process -Id $previewPid
}
# Restart only after the previous process has stopped:
$previewArgs = @('node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4283', '--strictPort', '--outDir', (Join-Path $previewDir 'dist'))
$previewProcess = Start-Process -FilePath (Get-Command node).Source -ArgumentList $previewArgs -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -RedirectStandardOutput (Join-Path $previewDir 'server.stdout.log') -RedirectStandardError (Join-Path $previewDir 'server.stderr.log') -PassThru
$previewProcess.Id | Set-Content -LiteralPath (Join-Path $previewDir 'server.pid')
```

`--strictPort` fails if another process owns the port. Do not replace the snapshot or rebuild into it during feedback. The preview is local and requires no deployment.

## Five-minute walkthrough

1. Open the address without setup help. Confirm **HeV-A26 Day 2 Simulation** and app **0.1.0** in the dashboard/footer; report loading delays or errors.
2. In **View**, visit both Pages and describe a finding. Try the Biomedical map/bubble, KPI, bullet, gauge or **Current vaccination status** table and the Socio-economic stacked bar and authored **TEEEST** bar. Charts load as they enter the viewport.
3. On **Biomedical**, open **Chrono view**. Choose **Municipal outbreak playback**: Scope should become **Group only**, showing its two map/aggregate charts across **2020-02-27–2021-04-17**. Play, pause, drag the frame slider and step once. Switch to **National outbreak and health-system playback**: its five charts span **2027-02-20–2027-08-15**. Confirm the period changes and dates stay synchronized. Exit Chrono view afterward.
4. In **Build**, find the add-chart control and a chart's edit/source controls. Do not save edits during this review.
5. In **Present**, open **Chrono Groups**, choose the municipal source, check **Municipal infection rate over time** and **Aggregate municipal infections**, and open **Audience display**. Play, pause and seek; confirm the Audience follows. For the national source, clear those selections, choose its source and check **Confirmed cases**, **Daily confirmed cases**, **Daily cases and deaths** and **New ICU and hospital admissions**. Present allows four charts at once, while View covers all five national members. Try its final frame and report legibility, connection or timing problems. End presentation when finished.

## Recheck the three Chrono findings

1. In **Build → Chrono Studio**, open **National outbreak and health-system playback → Edit → Choose charts**. Confirm Collection displays such as **Hospital occupancy against capacity** are absent from add choices. An invalid member already selected remains visible for removal.
2. Add **Vaccination rate over time**, then use **Edit period** to shorten the end date to **2027-03-01**. Continue to chart selection and attempt to continue again. Vaccination begins in June, so the warning should name **Vaccination rate over time**, matching its chart row, with no internal chart ID.
3. Click the **Needs attention** warning. Confirm the wizard scrolls to and focuses the affected row below the five ready members. Remove that member if testing removal, then **Discard** to restore the saved group and period; do not save this trial edit. Report whether each finding is resolved.

## Recheck the 12 October feedback repairs

1. In **Build**, confirm Discard and Finish are disabled in an unchanged session. Scroll to the footer: the Structure rail should stop above it. CSV labels in **Source content → Data sources** should read dataset first, then **Biomedical** or **Socio-economic**.
2. In **Chrono view**, choose the national group and **Group only**. Empty section headings and Add Panel controls should be absent. Click **View all charts** in the hidden-chart message and confirm Scope changes to **All page charts**.
3. In **Build → Scene Studio → Create Scene**, verify Parent Chrono Group offers both municipal and national groups on Biomedical. Name the draft, switch its parent, close it, browse Chrono Studio, then use **Resume Scene Studio draft**: the same Scene and parent should return.
4. Discard Build changes and confirm the dialog closes, the drafts clear and the mode remains Build. New Chrono Groups should default to **Snap to Latest**, followed by **Interpolate**, **Snap to Closest**, **Concurrent only**. With a Chrono draft open, new Scene creation should be disabled; its status message should link directly back to that pending draft. Discard trial edits rather than saving them.
5. In **Present**, use **Open audience display** and confirm a separate audience window opens. Browser popup settings can affect this; report the actual browser and outcome if it still opens as a tab or is blocked.

## Recheck the 15 October Chrono playback correction

1. In **View → Chrono view**, select each saved group without changing Scope manually. Municipal should show two charts and National five. **View all charts** should still explicitly reveal the rest; selecting a group again restores **Group only**.
2. Select **Whole page**. It should open at the latest available frame with **Snap to Latest**. Temporal charts should show available observations; **Hospital occupancy against capacity** and other Collection/non-temporal charts should retain their normal display, without a bound-temporal-role error.
3. Seek back to the start in 2020. National observations begin in 2027, so those charts should show a truthful missing-measurement message; Collection snapshots should remain visible. Select National again and confirm its five charts and authored period return.

## Observation record for the real session

| Field | Record after the session |
| --- | --- |
| Participant role and date | User, 12 October 2026 |
| App version, package identity, browser and device | Pending |
| Launch completed without repair | Passed within the reported five-minute walkthrough |
| Pages and mode transitions completed | Passed within the reported five-minute walkthrough |
| Three comparisons the practitioner wants | Pending |
| Confusing controls or incorrect content | Remaining 12 October feedback and 15 October Chrono playback correction listed above; repairs await recheck |
| Actionable follow-up, owner and priority | Current owner: practitioner feedback repairs; recheck at 4283 |
| Practitioner acceptance or rejection, in their words | “Other than those comments, the five-minute walkthrough and chrono recheck both passed” |

These checks prepare the practitioner session; they do not constitute human acceptance. The 223 historical M1 geometry findings remain open, and this repair did not rerun the density audit or full repository gates. Hosted CI and bundle-budget ratification also remain open. No push, merge or deployment was performed.
