# M0 practitioner launch and navigation walkthrough

Status: local candidate preflighted on 1 October 2026; practitioner observations and acceptance remain pending.

## Live candidate

Open [the refreshed local preview](http://127.0.0.1:4280/) in Chrome or Edge on this computer. It serves an immutable standard production build from `fable-preparation`, with the user's selected content committed as `45f9a02ef564ca8a9638d9c77844d6e7550b6345`. The final reviewed branch tip is recorded in the handover and preview's `candidate-identity.json`. App version: **0.1.0**. Package: **HeV-A26 Day 2 Simulation**, configuration version **6**, updated **2026-09-03**. The original Downloads bundle SHA-256 is `b1582453dc2e2fd419a435f9af278b07f76325bd4867576437adf321c1dc84da`; the promoted `config/dashboard.json` SHA-256 is `bb6aafbb382a8013d6c66d54e434f847409a65ca8ec04b1d97b16226af3bda07`.

The two Pages are **Biomedical** and **Socio-economic**, containing **38 charts across 15 types**: line, bar, mixed, horizontal bar, pie, delta list, Chrono choropleth map, bubble, KPI, bullet, grouped bar, gauge, scatter map, table and stacked bar. All 34 CSV URLs returned HTTP 200 with exact promoted bytes; four GeoJSON sources remain embedded. Automated production-preview checks passed for launch, every chart type, all seven Chrono Group members, both authored periods, and real Present/Audience play, pause, seek and group transitions. External Chrome independently confirmed both Pages, Build controls, municipal map/line playback, and connected national line/bar/mixed/admissions output through the 2027-08-15 final frame. No authored edits were saved. This package has two Chrono Groups and no saved Scenes.

Use the same `127.0.0.1:4280` address throughout; `localhost` is a different origin. Avoid saving edits or resetting storage during this walkthrough. Export a V3 package if you later author changes. Report observations before clearing site data; a fresh browser profile can provide a clean first launch. The previous `127.0.0.1:4279` snapshot remains historical evidence for the superseded package.

## Preview process

The hidden Vite preview process listens only on `127.0.0.1:4280` (initial PID **44416**). Its immutable output, PID, stdout/stderr, package/source preflight, bundle measurements, browser results and screenshots live in:

`C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-m0-integration-evidence\m0-selected-content-20261001\preview`

Keep it running through feedback. To stop or restart, use PowerShell from `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`:

```powershell
$previewDir = 'C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-m0-integration-evidence\m0-selected-content-20261001\preview'
$previewPid = [int](Get-Content -LiteralPath (Join-Path $previewDir 'server.pid'))
$previewProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$previewPid"
if ($previewProcess.CommandLine -like '*vite*4280*m0-selected-content-20261001*') {
    Stop-Process -Id $previewPid
}
# Restart only after the previous process has stopped:
$previewArgs = @('node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4280', '--strictPort', '--outDir', (Join-Path $previewDir 'dist'))
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

These checks prepare the practitioner session; they do not constitute human acceptance. The 223 historical M1 geometry findings remain open, and this content refresh did not rerun the density audit. Hosted CI and bundle-budget ratification also remain open.
