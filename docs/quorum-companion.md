# Quorum Dashboard Companion

The dashboard can optionally connect to the Quorum moderator companion while
remaining a fully usable standalone dashboard. The integration is a non-voice,
metadata-only control channel: the dashboard never receives transcripts,
speaker data, summaries, topics, evidence text, or other discussion content.

Prototype for education and training only. Non-commercial. No guarantees of availability, accuracy, suitability, security, support, or compatibility.

**Standalone** and **Connected** are Quorum connection statuses, not UI modes.
The dashboard's workspace modes are View, Build, and Present; Present's
same-computer audience window does not start or use Quorum.

## Responsibility Boundary

Quorum owns recommendation ranking, operator authorization, the current top
five recommendations, and the five most recently closed charts. The dashboard
owns the charts that are actually visible in its browser window.

A recommendation can change the display only after an explicit operator action
inside Quorum. Quorum then sends `display_set_requested`. The dashboard applies
the request only when its session, sequence, catalogue, chart IDs, capacity, and
expected display revision are valid.

The dashboard reports its actual ordered visible set after both companion and
manual changes. Quorum uses that state to remove displayed charts from its top
five and to maintain its recently closed list. The dashboard does not implement
or infer recommendation ranking.

## Explicit Chart Catalogue

The generated catalogue is:

```text
public/integration/quorum-chart-catalogue.json
```

It contains stable chart IDs and descriptive discovery metadata, including
titles, descriptions, page and section IDs, aliases, keywords, and supported
display modes. It contains no data rows, discussion content, local file paths,
or runtime dashboard state.

Chart-type records also publish three bounded authoring contracts from the
same declarative authorities used by the dashboard:

- conversion classification, target-role preservation, and required remapping;
- GeoJSON source selection and explicit or inferred feature joins, with no
  assumed default join;
- the presentation sections that apply to each chart type.

These are type-level rules, not an all-pairs conversion matrix. Quorum can
combine a source type's compatible targets, the target schema's roles, and the
published preservation rule to explain the work required for a conversion.

Generate it directly with:

```powershell
pnpm.cmd run build:quorum-catalogue
```

Normal development and production builds regenerate it automatically. The
generator canonicalizes the catalogue and records a SHA-256 digest. Quorum must
match both `catalogue_id` and `digest` before display commands are enabled. This
is the explicit local catalogue snapshot for protocol v1; a future catalogue
exchange API can preserve the same versioned contract.

The snapshot also contains `dashboard_semantic_digest`, an opaque SHA-256 digest
of the complete packaged dashboard configuration and aliases. This covers
source descriptors and packaged payloads, time groups, page and section
semantics, landing and layout settings, and every chart definition without
publishing those values into the catalogue. The semantic producer accepts only
the strict version-3 configuration shape; unknown fields and hydrated runtime
state such as loaded rows, generated profiles, preview state, and timestamps
are rejected instead of silently omitted.

Before discovery, the browser regenerates both digests from its active
configuration and aliases. A saved, imported, or edited chart definition
therefore disables companion commands until a new catalogue is deliberately
generated and deployed. This prevents a stable chart ID from silently
acquiring a different meaning.

## Discovery and Connection

After the dashboard and catalogue load, the browser requests:

```text
GET /companion/bootstrap
Cache-Control: no-store
```

A `404` means no companion is present and the dashboard remains in
`Standalone` mode. A valid response must contain exactly the protocol version,
session ID, catalogue ID and digest, an opaque short-lived credential, and the
fixed gateway path `/companion/ws`.

The browser builds a same-origin `ws:` or `wss:` URL from its current location.
The credential is sent only inside the first `dashboard_hello` message. It is
never added to a URL, browser local storage, rendered status, log message, or
error string.

The visible status is deliberately coarse:

- `Standalone`
- `Companion connecting`
- `Companion connected`
- `Companion unavailable`

## Protocol v1

Every message has a protocol version, message ID, session ID, monotonically
increasing sequence, idempotency key, type, acknowledgement status, and
type-specific payload. Messages larger than 16 KiB, unknown fields, invalid
reason codes, duplicate chart IDs, and sets larger than four charts are
rejected by the shared codec.

When an invalid message still has a safely bounded message ID, session,
protocol, and next sequence, the dashboard consumes that sequence and sends
`display_rejected` with `malformed_message`, `invalid_chart`, or
`capacity_exceeded`. Oversized, non-JSON, or unidentifiable input is discarded
without reflecting attacker-controlled content.

The six message types are:

| Direction | Type | Purpose |
| --- | --- | --- |
| Dashboard → Quorum | `dashboard_hello` | Authenticate and advertise capabilities and current display state. |
| Quorum → Dashboard | `companion_ready` | Accept the instance, catalogue, and current display revision. |
| Quorum → Dashboard | `display_set_requested` | Request an operator-authorized ordered set of one to four chart IDs. |
| Dashboard → Quorum | `display_state_changed` | Report the actual ordered visible set after a manual or accepted companion change. |
| Dashboard → Quorum | `display_rejected` | Reject validly framed but stale, invalid, mismatched, or over-capacity commands with an enumerated reason. |
| Dashboard → Quorum | `dashboard_snapshot` | Reassert current browser state after reconnect. |

The browser has one revisioned display controller for manual single fullscreen,
manual multi-fullscreen, companion sets, individual close, close-all, and
reorder. Layout choice is local presentation state and does not increment the
display revision.

Duplicate command message IDs are idempotent. Only the next server sequence is
accepted; gaps and replays are rejected, while messages that cannot be safely
parsed are discarded. Reconnects use bounded exponential
backoff, authenticate again, and then send a current `dashboard_snapshot`.
Prior commands are not replayed, so reconnect cannot silently reopen a chart
the moderator already closed.

## Standalone and Deployment Behaviour

The production build remains a static dashboard. If no gateway supplies
`/companion/bootstrap` and `/companion/ws`, manual fullscreen and all existing
dashboard features continue to work.

To enable the companion, the local Quorum host must serve or proxy those two
same-origin routes beside the dashboard. A mismatched protocol or catalogue
fails closed: commands are disabled and the dashboard remains manually usable.

Flash-drive and ordinary static-host deployments do not need Quorum. When
opened from `file://`, companion discovery is unavailable and has no effect on
the portable dashboard.

## Verification

Install the browser used by the end-to-end suite once:

```powershell
pnpm.cmd exec playwright install chromium
```

Run the gates:

```powershell
pnpm.cmd test
pnpm.cmd run build
pnpm.cmd run test:e2e --project=chromium
```

The browser suite uses `tests/e2e/mock-companion-server.mjs`. It serves the
built dashboard and WebSocket gateway on loopback port `4173`; test controls are
isolated on loopback port `4174`. The mock server and controls live only under
`tests/` and are never included in the production build.

Coverage includes operator-authorized sets, manual single and multi-open,
individual close, reorder, stale revision, invalid chart ID, reconnect
snapshot, stale catalogue, runtime chart-definition drift, identifiable
malformed commands, and missing-bootstrap standalone behaviour.
