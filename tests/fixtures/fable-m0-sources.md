# Fable M0 source fixture

Derived on 27 September 2026 from prepared code checkpoint `e7e58c8432987403767d4fc973fa30df41f91cd8`.

`fable-m0-sources.json` retains the shipped municipality descriptor, its source entry and the complete `GM0473` (Zandvoort) feature. The native V3 line chart is reduced from the shipped Biomedical chart to a two-row synthetic CSV. A small static QMD descriptor checks that portable generation leaves static content in the configuration. This is a source-resolution fixture, not a replacement exercise or the broader M0.2 fixture.

The portable tests cover embedded uploaded sources, existing CSV promotion, tracked GeoJSON assets, validation failures and equivalent offline loader data. `fable-m0-source-loader.js` bundles the real dashboard loader for a copied-file Chromium check; it does not render the dashboard, test Audience, or certify a release build. Static image packaging remains covered by `staticContentPortablePackage.test.js` and the existing PDPC converter cases.
