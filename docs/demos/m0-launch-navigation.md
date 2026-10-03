# M0 practitioner launch and navigation walkthrough

Status: Chrono membership repair preflighted on 3 October 2026; practitioner recheck and acceptance remain pending.

## Live candidate

Open [the fixed local preview](http://127.0.0.1:4281/) in Chrome or Edge on this computer. It serves an immutable standard production build of the Chrono membership repair at **1c19f309e1269472309353753f7684bddef23e74** from `fable-preparation`. The selected authored content remains committed as `45f9a02ef564ca8a9638d9c77844d6e7550b6345`. App version: **0.1.0**. Package: **HeV-A26 Day 2 Simulation**, configuration version **6**, updated **2026-09-03**. The original Downloads bundle SHA-256 is `b1582453dc2e2fd419a435f9af278b07f76325bd4867576437adf321c1dc84da`; the promoted and fixed-preview `config/dashboard.json` SHA-256 remains `bb6aafbb382a8013d6c66d54e434f847409a65ca8ec04b1d97b16226af3bda07`.

The two Pages are **Biomedical** and **Socio-economic**, containing **38 charts across 15 types**: line, bar, mixed, horizontal bar, pie, delta list, Chrono choropleth map, bubble, KPI, bullet, grouped bar, gauge, scatter map, table and stacked bar. This package has two Chrono Groups and no saved Scenes. The 1 October content-baseline checks established all 34 exact CSV URLs, four embedded GeoJSON sources, chart rendering, playback and Present/Audience behavior; those are historical checks rather than a repeat of every journey on this repair. For the fixed build, **28/28** focused checks, the production build and **1/1** shipped-national-group browser regression passed. That regression checks Collection exclusion, display-title warnings, scrolling/focus to an affected row below five ready members, and removal. No authored content was changed.

Use the same `127.0.0.1:4281` address throughout; `localhost` is a different origin. Avoid saving edits or resetting storage during this walkthrough. Export a V3 package if you later author changes. Report observations before clearing site data; a fresh browser profile can provide a clean first launch. **4280 is the historical 1 October content-baseline preview**, retained with its existing browser storage and any unsaved user edits. Do not reset that origin or overwrite its snapshot. The earlier 4279 snapshot also remains historical evidence for the superseded package.

## Preview process

The hidden Vite preview process listens only on `127.0.0.1:4281` (initial PID **16276**; consult `server.pid` after a restart). Its immutable output, current PID, stdout/stderr, focused Playwright configuration and browser results live in:

`C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-m0-integration-evidence\m0-chrono-membership-20261003`

Keep it running through feedback. To stop or restart, use PowerShell from `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`:

```powershell
$previewDir = 'C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-m0-integration-evidence\m0-chrono-membership-20261003'
$previewPid = [int](Get-Content -LiteralPath (Join-Path $previewDir 'server.pid'))
$previewProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$previewPid"
if ($previewProcess.CommandLine -like '*vite*4281*m0-chrono-membership-20261003*') {
    Stop-Process -Id $previewPid
}
# Restart only after the previous process has stopped:
$previewArgs = @('node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4281', '--strictPort', '--outDir', (Join-Path $previewDir 'dist'))
$previewProcess = Start-Process -FilePath (Get-Command node).Source -ArgumentList $previewArgs -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -RedirectStandardOutput (Join-Path $previewDir 'server.stdout.log') -RedirectStandardError (Join-Path $previewDir 'server.stderr.log') -PassThru
$previewProcess.Id | Set-Content -LiteralPath (Join-Path $previewDir 'server.pid')
```

`--strictPort` fails if another process owns the port. Do not replace the snapshot or rebuild into it during feedback. The preview is local and requires no deployment.

## Five-minute walkthrough

1. Open the address without setup help. Confirm **HeV-A26 Day 2 Simulation** and app **0.1.0** in the dashboard/footer; report loading delays or errors.
2. In **View**, visit both Pages and describe a finding. Try the Biomedical map/bubble, KPI, bullet, gauge or **Current vaccination status** table and the Socio-economic stacked bar and authored **TEEEST** bar. Charts load as they enter the viewport.
3. On **Biomedical**, open **Chrono view**. Choose **Municipal outbreak playback**, then **Group only** in Scope: its map/aggregate line span **2020-02-27–2021-04-17**. Play, pause, drag the frame slider and step once. Switch to **National outbreak and health-system playback**: its five charts span **2027-02-20–2027-08-15**. Confirm the period changes and dates stay synchronized. Exit Chrono view afterward.
4. In **Build**, find the add-chart control and a chart's edit/source controls. Do not save edits during this review.
5. In **Present**, open **Chrono Groups**, choose the municipal source, check **Municipal infection rate over time** and **Aggregate municipal infections**, and open **Audience display**. Play, pause and seek; confirm the Audience follows. For the national source, clear those selections, choose its source and check **Confirmed cases**, **Daily confirmed cases**, **Daily cases and deaths** and **New ICU and hospital admissions**. Present allows four charts at once, while View covers all five national members. Try its final frame and report legibility, connection or timing problems. End presentation when finished.

## Recheck the three Chrono findings

1. In **Build → Chrono Studio**, open **National outbreak and health-system playback → Edit → Choose charts**. Confirm Collection displays such as **Hospital occupancy against capacity** are absent from add choices. An invalid member already selected remains visible for removal.
2. Add **Vaccination rate over time**, then use **Edit period** to shorten the end date to **2027-03-01**. Continue to chart selection and attempt to continue again. Vaccination begins in June, so the warning should name **Vaccination rate over time**, matching its chart row, with no internal chart ID.
3. Click the **Needs attention** warning. Confirm the wizard scrolls to and focuses the affected row below the five ready members. Remove that member if testing removal, then **Discard** to restore the saved group and period; do not save this trial edit. Report whether each finding is resolved.

## Observation record for the real session

| Field | Record after the session |
| --- | --- |
| Participant role and date | Pending |
| App version, package identity, browser and device | Pending |
| Launch completed without repair | Pending |
| Pages and mode transitions completed | Pending |
| Three comparisons the practitioner wants | Pending |
| Confusing controls or incorrect content | Pending |
| Actionable follow-up, owner and priority | Pending |
| Practitioner acceptance or rejection, in their words | Pending |

These checks prepare the practitioner session; they do not constitute human acceptance. The 223 historical M1 geometry findings remain open, and this repair did not rerun the density audit or full repository gates. Hosted CI and bundle-budget ratification also remain open. No push, merge or deployment was performed.
