# Representative Fable M0 dashboard fixture

Derived on 27 September 2026 from source checkpoint `cdf83abd109b10c538b7684bbdfb542c0d0d8aa4`. This is a small rendered-dashboard fixture; the earlier `fable-m0-sources.json` remains the independent portable-loader fixture.

The dashboard retains the shipped Eldoria cases and employment CSV descriptors, profiles and assets, a packaged timeline image/media item, and one complete municipal GeoJSON feature from the earlier source fixture. Its four native V3 panels are a temporal line, static pie, editable QMD briefing and image. Three items are eligible for Present; free text retains its existing exclusion. Synthetic fixture titles and abbreviated briefing text identify test content without changing authored public files.

Use `resetSourceDashboard(page, { fixture: "fable-m0" })` from `tests/e2e/support/dashboardFixture.js`. The helper visits an inert harness page, clears browser storage/databases/caches, selects the fixture and opens the app. Normal reloads retain saves; reset is explicit and one-shot. Use a dedicated browser context with no other active application tabs. The helper defaults to shipped content when the fixture argument is omitted.

The source harness accepts `POST /__test__/dashboard` with `{ "fixture": "fable-m0" }` or `{ "fixture": "shipped" }`. Selection uses an HttpOnly cookie within the requesting context. It changes only that context's configuration/profile responses; source data and packaged images still use existing public paths. Unknown selections return 400 without changing selection. The inert `GET /__test__/dashboard` page performs no reset itself. Companion bootstrap is unavailable for this fixture because it has no matching companion catalogue; unrelated contexts retain the existing companion behavior.

Requests with no selection use the existing shipped-content path. The old companion `/__test__/reset` remains a companion-only reset. Unrelated specs are not opted into this fixture. Do not use server selection alone as a substitute for the browser reset helper when saved dashboard state already exists.

`e2eHarnessSourceMode.test.js` validates identities, ready data, temporal/static and Present eligibility, packaged media bytes, context isolation and the default route. `fable-m0-fixture.spec.js` covers the public View/Build/Present journey, QMD save/reload/reset, visible missing-source recovery and a separate shipped launch. These checks do not certify Audience, broad historical fixture/driver repair or production builds.
