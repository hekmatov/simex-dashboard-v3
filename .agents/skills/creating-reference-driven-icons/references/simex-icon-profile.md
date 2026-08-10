# SimEx Dashboard icon profile

Use this profile only in the SimEx Dashboard repository.

## Rendering contract

- Author complete candidates with `viewBox="0 0 24 24"`.
- Match the production defaults in `src/styles.css`: `fill:none`, `stroke:currentColor`, `stroke-width:1.8`, round caps, and round joins.
- Use `accent-stroke` for accent outlines and `accent-fill` for accent fills. Use `#082552` as the comparison base color and `#087f75` as the comparison accent color.
- Inspect at 16px, 20px, 24px, and enlarged scale. The generic report provides 16px, 24px, and 192px; add 20px when the target control uses `IconControl` defaults.

## Relevant files

- Canonical fragments: `src/iconography/iconGlyphs.js`
- Semantic catalogue: `src/iconography/iconCatalog.js`
- Production wrapper: `src/components/SimExIcon.js`
- Generated reference: `docs/icon-language-atlas.html`
- Generator: `scripts/build-icon-reference.mjs`
- Focused contracts: `tests/iconSystem.test.js`

## SimEx workflow

1. Keep draft SVGs and comparison reports under `.superpowers/icon-visual-debug/comparisons/`; this location is ignored.
2. Do not edit `iconGlyphs.js`, `iconCatalog.js`, or the atlas until the user approves the comparison report.
3. After approval, copy the approved fragment into `iconGlyphs.js`. Change `iconCatalog.js` only when the semantic mapping changes or a new glyph ID is introduced.
4. Run `pnpm icons:build` once to regenerate the atlas.
5. Run the smallest matching test in `tests/iconSystem.test.js` only when source or semantic contracts changed. Do not run broad dashboard, build, integration, or E2E suites during visual iteration.
6. Do not immediately run `icons:check` after a successful deterministic `icons:build` unless a separate drift question remains.
