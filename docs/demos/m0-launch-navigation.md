# M0 practitioner launch and navigation walkthrough

Status: local candidate preflighted on 1 October 2026; practitioner observations and acceptance remain pending.

## Live candidate

Open [the local preview](http://127.0.0.1:4279/) in an external browser. It serves an immutable copy of the standard production build from the dedicated `fable-preparation` worktree. The application and authored inputs are unchanged from `d2dab23f`; the candidate commit is the commit containing this updated walkthrough and CI workflow, recorded by hash in the handover and preview's `candidate-identity.json`. App version: **0.1.0**. Package: **WCPH HeV-A26 Simulation**, configuration version **6**, updated **2026-09-07**; SHA-256 `bfecaa47139bbae95bfd484aadc44311539d5bb7bdf13b28283eaf485a21db00` for `config/dashboard.json`.

The three shipped Pages are Scenario, Biomedical and Socio-economic (17 panels). All nine CSV paths returned HTTP 200. In external Chrome, View showed the three Page identities, Build opened Add chart and the international source viewer (58 rows), and Present selected the shipped **International Confirmed Cases (Cumulative)** chart and launched a connected Audience displaying it. This package has no saved Chrono Groups or Scenes; the walkthrough uses the supported manual chart selection rather than adding fixture content. No chart or package changes were saved during preflight.

The dedicated origin isolates this preview from existing dashboard browser edits. Use the same `127.0.0.1:4279` address throughout; `localhost` is a different origin. During this navigation walkthrough, avoid saving changes or resetting storage. If you author changes, export the V3 package before requesting a source update. Report observations before clearing site data; a fresh browser profile can provide a clean first launch without disturbing this origin.

## Preview process

The hidden Vite preview process listens only on `127.0.0.1:4279`. Its immutable output, PID, stdout/stderr, package/source preflight, bundle measurements and screenshots live in:

`C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-m0-integration-evidence\m0-practitioner-preview`

Keep it running through feedback. To stop or restart, use PowerShell from `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`:

```powershell
$previewDir = 'C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-m0-integration-evidence\m0-practitioner-preview'
$previewPid = [int](Get-Content -LiteralPath (Join-Path $previewDir 'server.pid'))
$previewProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$previewPid"
if ($previewProcess.CommandLine -like '*vite*4279*m0-practitioner-preview*') {
    Stop-Process -Id $previewPid
}
# Restart only after the previous process has stopped:
$previewArgs = @('node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4279', '--strictPort', '--outDir', (Join-Path $previewDir 'dist'))
$previewProcess = Start-Process -FilePath (Get-Command node).Source -ArgumentList $previewArgs -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -RedirectStandardOutput (Join-Path $previewDir 'server.stdout.log') -RedirectStandardError (Join-Path $previewDir 'server.stderr.log') -PassThru
$previewProcess.Id | Set-Content -LiteralPath (Join-Path $previewDir 'server.pid')
```

`--strictPort` fails if another process owns the port. Do not replace the snapshot or rebuild into it during feedback. The preview is local and requires no deployment.

## Five-minute walkthrough

1. Give the practitioner the approved dashboard address or offline package and ask them to open it without setup help. Record loading delays, errors, or repairs they need.
2. Ask them to find the app version in **Dashboard information and feedback** and identify the exercise Scenario. Confirm the version against the changelog entry for the build under review.
3. Ask them to open each shipped Page in **View**, describe one finding on each Page, and return to a Page of their choice. Record confusing labels or missing source context.
4. Ask them to enter **Build**, find the same Page, and locate the control for adding or editing a chart. Do not save changes to the accepted package during this navigation exercise.
5. Ask them to enter **Present**, select **International Confirmed Cases (Cumulative)** from the shipped chart list, and open the **Audience display**. Ask how they know it is connected and whether the displayed finding is clear. The current package supports this manual selection; saved Chrono Group/Scene playback is outside this five-minute session.

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

The local all-Page View/Build/Present smoke is technical preparation only. A facilitator must run this walkthrough with an exercise practitioner to satisfy the human acceptance boundary.
