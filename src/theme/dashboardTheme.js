import { resolveDashboardStyleGrammar } from "./dashboardStyleGrammar.js";
import { browserStorage } from "../lib/browserStorage.js";

export const DASHBOARD_VISUAL_CONTRACT = Object.freeze({
  radiusControl: 6,
  radiusSurface: 10,
  controls: Object.freeze({
    choiceGlyph: 16,
    utility: 24,
    compact: 28,
    standard: 32,
    prominent: 36,
    commandCrownRow: 36,
  }),
  typography: Object.freeze({
    control: Object.freeze({ fontSize: 13, lineHeight: 18 }),
    body: Object.freeze({ fontSize: 14, lineHeight: 20 }),
    label: Object.freeze({ fontSize: 12, lineHeight: 16 }),
  }),
  spacing: Object.freeze({
    scale: Object.freeze([2, 4, 8, 12, 16, 24, 32]),
    labelControl: 4,
    choiceLabel: 8,
    controlGroup: 8,
    section: 12,
    panelPadding: 12,
    dialogPadding: 16,
    region: 24,
  }),
  neutral: Object.freeze({
    outer: "#e8e9ea", surface: "#ffffff", subtle: "#f4f5f5",
    text: "#17191b", muted: "#5a6066", border: "#c7cbcf",
    borderStrong: "#747b82", active: "#202428",
  }),
});

const COMPONENT_CSS_VARIABLES = Object.freeze({
  "--simex-component-control-radius": `${DASHBOARD_VISUAL_CONTRACT.radiusControl}px`,
  "--simex-component-surface-radius": `${DASHBOARD_VISUAL_CONTRACT.radiusSurface}px`,
  "--simex-choice-glyph": `${DASHBOARD_VISUAL_CONTRACT.controls.choiceGlyph}px`,
  "--simex-control-utility": `${DASHBOARD_VISUAL_CONTRACT.controls.utility}px`,
  "--simex-control-compact": `${DASHBOARD_VISUAL_CONTRACT.controls.compact}px`,
  "--simex-control-standard": `${DASHBOARD_VISUAL_CONTRACT.controls.standard}px`,
  "--simex-control-prominent": `${DASHBOARD_VISUAL_CONTRACT.controls.prominent}px`,
  "--simex-command-crown-row": `${DASHBOARD_VISUAL_CONTRACT.controls.commandCrownRow}px`,
  "--simex-control-font-size": `${DASHBOARD_VISUAL_CONTRACT.typography.control.fontSize}px`,
  "--simex-control-line-height": `${DASHBOARD_VISUAL_CONTRACT.typography.control.lineHeight}px`,
  "--simex-body-font-size": `${DASHBOARD_VISUAL_CONTRACT.typography.body.fontSize}px`,
  "--simex-body-line-height": `${DASHBOARD_VISUAL_CONTRACT.typography.body.lineHeight}px`,
  "--simex-label-font-size": `${DASHBOARD_VISUAL_CONTRACT.typography.label.fontSize}px`,
  "--simex-label-line-height": `${DASHBOARD_VISUAL_CONTRACT.typography.label.lineHeight}px`,
  ...Object.fromEntries(DASHBOARD_VISUAL_CONTRACT.spacing.scale.map(
    (value, index) => [`--simex-space-${index + 1}`, `${value}px`],
  )),
  "--simex-gap-label-control": `${DASHBOARD_VISUAL_CONTRACT.spacing.labelControl}px`,
  "--simex-gap-choice-label": `${DASHBOARD_VISUAL_CONTRACT.spacing.choiceLabel}px`,
  "--simex-gap-control-group": `${DASHBOARD_VISUAL_CONTRACT.spacing.controlGroup}px`,
  "--simex-gap-section": `${DASHBOARD_VISUAL_CONTRACT.spacing.section}px`,
  "--simex-padding-panel": `${DASHBOARD_VISUAL_CONTRACT.spacing.panelPadding}px`,
  "--simex-padding-dialog": `${DASHBOARD_VISUAL_CONTRACT.spacing.dialogPadding}px`,
  "--simex-gap-region": `${DASHBOARD_VISUAL_CONTRACT.spacing.region}px`,
  "--simex-control-min": "var(--simex-control-standard)",
  "--simex-component-outer": DASHBOARD_VISUAL_CONTRACT.neutral.outer,
  "--simex-component-surface": DASHBOARD_VISUAL_CONTRACT.neutral.surface,
  "--simex-component-subtle": DASHBOARD_VISUAL_CONTRACT.neutral.subtle,
  "--simex-component-text": DASHBOARD_VISUAL_CONTRACT.neutral.text,
  "--simex-component-muted": DASHBOARD_VISUAL_CONTRACT.neutral.muted,
  "--simex-component-border": DASHBOARD_VISUAL_CONTRACT.neutral.border,
  "--simex-component-border-strong": DASHBOARD_VISUAL_CONTRACT.neutral.borderStrong,
  "--simex-component-active": DASHBOARD_VISUAL_CONTRACT.neutral.active,
});

const TOKEN_KEYS = Object.freeze([
  "OUT", "CAN", "PAN", "ALT", "INK", "INK-S", "INK-F", "RULE", "RULE+",
  "ACC", "ACC-S", "ON-ACC", "FOCUS", "SEL", "SEL-S", "CHR", "CHR-S",
  "INFO", "INFO-S", "OK", "OK-S", "WARN", "WARN-S", "ERR", "ERR-S",
  "GRID", "MARK", "D1", "D2", "D3", "D4", "D5", "D6",
]);

const CSS_VARIABLES = Object.freeze([
  "--simex-surface-outer",
  "--simex-surface-canvas",
  "--simex-surface-panel",
  "--simex-surface-panel-alt",
  "--simex-text-strong",
  "--simex-text-muted",
  "--simex-text-faint",
  "--simex-border-subtle",
  "--simex-border-strong",
  "--simex-accent",
  "--simex-accent-soft",
  "--simex-on-accent",
  "--simex-focus",
  "--simex-selected",
  "--simex-selected-soft",
  "--simex-chrono",
  "--simex-chrono-soft",
  "--simex-info",
  "--simex-info-soft",
  "--simex-success",
  "--simex-success-soft",
  "--simex-warning",
  "--simex-warning-soft",
  "--simex-error",
  "--simex-error-soft",
  "--simex-gridline",
  "--simex-chart-mark",
  "--simex-data-1",
  "--simex-data-2",
  "--simex-data-3",
  "--simex-data-4",
  "--simex-data-5",
  "--simex-data-6",
]);

const RAW_PROFILES = Object.freeze([
  // Brand hex values from the 2023 PDPC guide; dark values are readable tints.
  ["pdpc/brand", "PDPC", "pdpc",
    "#e9ecf3 #f5f6fa #ffffff #eef1f7 #253162 #4f5873 #626b80 #b2b9cb #626e8e #253162 #e4e8f3 #ffffff #253162 #258161 #e2f0e9 #756c9a #eeebf5 #0878a9 #e0f2fa #258161 #e2f0e9 #806018 #f6edd7 #d72628 #fbe5e5 #d9dded #253162 #253162 #258161 #139cd8 #d72628 #8d88ad #806018",
    "#111627 #192139 #222c47 #1d263e #f1f3fa #c5cce0 #a4aec8 #526080 #96a5ca #b5c4f1 #303e63 #111627 #83cdef #86cfb0 #203e37 #c4bce0 #3b3453 #83cdef #203f51 #86cfb0 #203e37 #e5c57c #463c25 #f39297 #4b2935 #3c4968 #f1f3fa #b5c4f1 #86cfb0 #63c5ec #f39297 #c4bce0 #e5c57c"],
  ["evidence-ledger/brighter-vellum", "Vellum", "evidence-ledger",
    "#eee9de #f7f2e8 #fffdf8 #faf6ec #1d2529 #555a55 #6d7069 #b7b0a2 #50595d #2c383d #e8e4da #fffdf8 #2c383d #744740 #f0e2dc #62596b #e8e2e9 #58666b #e2e7e7 #4e6655 #e1e8e1 #7a6342 #eee7d8 #81514b #eee0dc #ddd7cb #2c383d #667853 #8f704a #61746f #8b584e #77657e #7d7457",
    "#181713 #211f1a #2b2922 #25231d #f5efe4 #c9c1b3 #aaa394 #746f64 #c2baab #f0e9dc #3b3831 #1d2428 #f5efe4 #d0a096 #493531 #c3b4ca #3f3944 #aab9bd #343e40 #a8bda9 #314035 #d1b482 #493d2c #d8a299 #4a3431 #4e4a40 #eee7da #a8b794 #c4aa82 #a2b2ad #c49a90 #b6a7bd #b9b08e"],
  ["evidence-ledger/ash-register", "Register", "evidence-ledger",
    "#deded9 #e9e9e3 #faf9f4 #f1f0e9 #202321 #555a56 #6e736e #aaa9a1 #4a4e4a #303735 #e2e4df #fbfaf5 #303735 #704b46 #e8ded9 #625c68 #e4e0e6 #59646a #e0e3e3 #486252 #dde6df #75603d #ede5d6 #794d49 #eadeda #d4d3ca #303735 #667853 #8f704a #61746f #8b584e #77657e #7d7457",
    "#151615 #1d1f1d #262825 #222421 #ecebe4 #c4c5bc #a4a69c #686a63 #b8bab0 #e4e5dc #363a36 #1b1d1b #ecebe4 #c59a91 #443733 #b8abbc #3c3740 #adb8bb #343b3d #9eb5a3 #2f3b32 #c3aa7e #443c2f #c99d96 #463533 #454841 #e2e2d9 #a8b794 #c4aa82 #a2b2ad #c49a90 #b6a7bd #b9b08e"],
  ["evidence-ledger/cool-archive", "Archive", "evidence-ledger",
    "#dfe3e1 #e9ece8 #fafaf6 #f1f3ef #1f2928 #52605e #687572 #a7b0ad #465551 #314743 #dce5e1 #fafcf8 #314743 #73505d #e8dfe3 #5f5a73 #e3e1e9 #536a6c #dfe7e6 #4d6758 #dfe8e2 #786443 #ece6d9 #81544f #eddfdc #d1d7d3 #314743 #667853 #8f704a #61746f #8b584e #77657e #7d7457",
    "#141817 #1c2220 #252c29 #202623 #eef2ed #c2cbc5 #a1aca6 #65706b #b6c0ba #e0e8e2 #343d39 #19211f #eef2ed #c39aaa #44343b #b2aac3 #393643 #9fb7b8 #2e3f40 #9db7a8 #2e4137 #c6b286 #443c2d #d0a09a #473431 #46504c #e2e9e3 #a8b794 #c4aa82 #a2b2ad #c49a90 #b6a7bd #b9b08e"],
  ["humanist-standard/common-ground", "Common Ground", "humanist-standard",
    "#e6ece8 #f0f5f1 #fcfdfb #f2f7f3 #1d2b2a #52615e #6d7975 #b7c5bf #61736d #28635d #dcebe5 #fafffc #155f91 #2c628e #dce9f4 #77618c #ebe3f0 #3c6a83 #e0ebf1 #397059 #dceae1 #8a641f #f4e9ce #9a4d52 #f4e0e1 #d6e0db #25423f #286b79 #a1693e #4f7b61 #9a5961 #6d66a0 #8b7944",
    "#121a18 #19231f #222e29 #1d2824 #eef5f1 #becbc5 #9caba4 #52655d #9aafa6 #8ed0c1 #2b4640 #10211d #8fcaf0 #91c5ef #293f51 #c3add7 #40364a #9bcbe4 #2b414c #98caae #2b4234 #e1bd77 #4a3d26 #e8a0a7 #4c3034 #405149 #dcece5 #7fc3cf #dfaa7e #91c2a2 #dfa0a7 #b8afe3 #c9ba7d"],
  ["humanist-standard/open-forum", "Forum", "humanist-standard",
    "#e8e6ed #f2eff5 #fcfbfd #f5f2f8 #282631 #5d5968 #777280 #c5bfcc #716a7c #594f7e #e8e2f1 #fdfbff #2d668e #3f6f94 #deeaf2 #755c8d #ebe2f1 #4e6f84 #e0e9ee #4d725f #e0ebe5 #86632d #f1e8d5 #95545e #f1e0e3 #ddd8e2 #403a51 #477b88 #a47149 #54806a #9a5e70 #705f9a #8d7a43",
    "#17151c #201d27 #292530 #24212b #f2eef5 #c8c1cf #a8a0b1 #605a69 #aba3b5 #c2b2e0 #3d364a #211b2a #91c9ed #99c8e7 #344657 #ceb2e0 #493852 #a8cbdd #34454e #a2c7b1 #304438 #dec080 #4b3f28 #e1a2ae #4c3238 #4b4554 #e5def0 #86c0cc #dfae82 #91c0a5 #dea0b1 #b8abe1 #c9b873"],
  ["signal-instrument/calibrated-steel", "Steel", "signal-instrument",
    "#dce4e6 #e8edef #f8faf9 #edf2f2 #17252b #45585e #5f7075 #aab9bd #536970 #285b67 #d7e6e8 #ffffff #0b6f89 #8a4350 #f1dee2 #615484 #e6e1ef #3b6576 #dce9ed #38705a #dcebe2 #7a5b1a #f3e7c9 #93434a #f2dfe1 #d0dadd #253941 #276f82 #a7602e #347557 #9c4f58 #665aa0 #7f6a25",
    "#0d1518 #131e22 #1a272c #162126 #edf4f5 #bac8cb #96a8ad #455a61 #8ca0a6 #86bbc4 #263f45 #102126 #85ccd6 #e09aa7 #4a2e35 #c1afe4 #3a334b #99c9d7 #293e45 #8bc7aa #283f34 #e2bf72 #473a20 #f1a1a9 #4b2c31 #34484f #dbe8ea #72c0d0 #e3a170 #83c3a0 #e79ca7 #aea3e2 #ceb96b"],
  ["signal-instrument/quiet-telemetry", "Telemetry", "signal-instrument",
    "#e1e5e6 #ebeeef #fafbfb #f1f3f3 #20292d #505d61 #687579 #b7c0c3 #5d6b70 #3d5b63 #dfe7e9 #ffffff #2e6675 #73515a #eadfe2 #625d73 #e8e5ed #536a73 #e3e9eb #4c6858 #e0e8e3 #75613a #eee7d8 #7d5056 #ecdee1 #d8dcdd #354348 #276f82 #a7602e #347557 #9c4f58 #665aa0 #7f6a25",
    "#111719 #182024 #20292d #1b2327 #edf1f2 #bdc6c8 #9ba6a9 #4a575b #929da0 #a7bcc1 #303c40 #162023 #91c6d2 #cba4ad #41343a #b8b1c7 #39363f #a3bdc6 #323f44 #a0baa9 #304038 #ccb680 #443d2d #d1a2a7 #473538 #414b4e #dfe6e8 #72c0d0 #e3a170 #83c3a0 #e79ca7 #aea3e2 #ceb96b"],
  ["signal-instrument/amber-vector", "Amber", "signal-instrument",
    "#e2e3e5 #ececed #fbfaf9 #f2efed #2a2422 #625650 #7a6d66 #c1b6b0 #71615a #6f4e43 #ebe0dc #fffaf8 #205e79 #8a4054 #efdee3 #5f5680 #e7e2ef #42687a #dfe9ed #416c59 #dce9e1 #765c20 #f0e6cc #8c444b #f0dddf #ded7d3 #493b36 #2f7582 #a55f36 #397258 #9a4f65 #64589a #817022",
    "#151314 #1d1a1b #282325 #211d1f #f2ece9 #c9bbb5 #aa9a93 #625451 #ae9b93 #d3a58f #49362f #241711 #83c8df #e3a0b1 #4b3039 #c0b2df #3c354b #9bc7d7 #2e4149 #92c5aa #2c4237 #dfbd75 #473c24 #eca3aa #4c2e33 #4c4140 #eaded9 #78c1cc #e4a074 #88c1a0 #dfa0b0 #ada3df #cdbc6c"],
  ["utility/prismatic-index", "Prismatic", "utility",
    "#e2e2e7 #eeeff2 #ffffff #f6f6f8 #1e2028 #545763 #717480 #b8bbc4 #5c606c #303745 #e5e7ec #ffffff #005fcc #47586b #e3e9ef #6b4d83 #eae2ef #27677b #e0eef2 #2e6f50 #dcede3 #7b5900 #f5e8be #a33b42 #f6dee1 #d7d8de #282b36 #2f6db0 #b83d5a #26743f #7148a6 #9a6500 #007b80",
    "#111117 #181820 #202029 #272731 #f1f1f6 #c3c4ce #9d9faa #4a4b58 #989aa7 #c8cbd6 #343741 #181a23 #85b6ff #acc0d4 #33414e #d0a8e3 #46374e #8dd1e0 #293f45 #81cda1 #294237 #e2c46a #493f25 #f09aa3 #4e2d34 #3b3b47 #e6e6ed #78a9e0 #e88498 #70b985 #b695de #c9a84f #60bdc1"],
  ["utility/luminance-ladder", "Ladder", "utility",
    "#ded8e7 #eae5ef #fffdf4 #f3efe0 #201827 #534a5c #6f6478 #c4bacb #62556b #5c2d82 #eadcf5 #fff8ed #00718c #a52d66 #f5dbe7 #006f72 #d9ece8 #3f568e #dfe6f5 #3a7045 #dfecdf #855800 #f4e5bd #9b3041 #f6dde0 #d8d0c6 #24182d #0a6c96 #560c34 #3ca21a #6d2b0b #8d5ede #5e5206",
    "#150d1b #1e1528 #2a2034 #241a2e #fff4df #d6c4db #b19db9 #594a64 #c0a9ca #d8a4f1 #4a2d5c #24102d #73d5ed #ff86c1 #553044 #6fe0ca #254a44 #a8bcef #334060 #93d69b #2e4934 #f4c55a #51411c #ff9aa7 #58303a #493d52 #fff2dc #1db1f1 #d41e7f #acee96 #db5716 #cbb5f0 #a7930b"],
  ["graphpad/sunrise-reference", "Sunrise", "graphpad",
    "#e8ddd2 #f4ece3 #fff9f2 #f7e8dd #2d1b23 #65535a #756168 #c9b5ae #735d65 #7f32bd #eaddf5 #ffffff #2856a8 #9b3d35 #f5ddd8 #68458e #eadff2 #345e9a #dee8f5 #3e6d49 #ddeadf #785000 #f4e4bb #982f2c #f5dcd8 #d9c9c0 #37242c #fb8809 #d84420 #690001 #7f32bd #5770ff #87beff",
    "#160f14 #21171e #2c2028 #251a21 #fff1e8 #d8c0c9 #b7a0a9 #66515b #c0a6b0 #ff9d4d #55301a #2a1303 #9fc0ff #ff8d76 #5b302c #d5a6f3 #493558 #a7c4ff #2f3b55 #9bcb9d #314538 #ffd080 #51401f #ffa192 #58302f #5a4650 #fff0e6 #ff9a3d #f06a4a #d65c6a #b879e3 #7e95ff #9acbff"],
  ["graphpad/lakeside-reference", "Lakeside", "graphpad",
    "#dde4e3 #eaf0ee #f9fcf8 #eaf3ee #1e2e2b #4d5e59 #5f706b #b7c7c2 #526660 #2650cc #dde5fa #ffffff #8b4300 #246b72 #d9ecec #526f3c #e1ecda #2657a7 #dde7f7 #486a37 #dfead9 #765500 #f4e6b7 #963e44 #f4ddde #ced9d4 #1f302d #2650cc #3d89de #65c8e3 #81ce6d #5f7b49 #29331a",
    "#0e1515 #14201f #1c2b28 #182421 #eff8f2 #c2d0cb #9fafa9 #435954 #94aaa3 #83aeff #293f65 #10203a #84ddeb #7ccad6 #26464a #a8d88e #35472d #93b7ff #2b3b5c #a4d58d #34482f #e5c36a #4b4022 #f1a0a7 #502f35 #3d514c #edf8f1 #6f91f2 #64acef #78d1e5 #9ade88 #9fc68a #b5c996"],
  ["utility/monochrome-reserve", "Monochrome", "utility",
    "#d6d6d6 #eeeeee #ffffff #f6f6f6 #151515 #494949 #5d5d5d #767676 #3e3e3e #202020 #e2e2e2 #ffffff #000000 #2e2e2e #e3e3e3 #424242 #ededed #4c4c4c #f0f0f0 #373737 #e6e6e6 #4a4a4a #ececec #272727 #e0e0e0 #c5c5c5 #222222 #2f6db0 #b83d5a #26743f #7148a6 #9a6500 #007b80",
    "#0d0d0d #171717 #222222 #2c2c2c #f5f5f5 #cacaca #ababab #757575 #b9b9b9 #f0f0f0 #3c3c3c #171717 #ffffff #f0f0f0 #414141 #d7d7d7 #363636 #cacaca #303030 #e7e7e7 #3d3d3d #d0d0d0 #333333 #fafafa #454545 #4a4a4a #ededed #78a9e0 #e88498 #70b985 #b695de #c9a84f #60bdc1"],
]);

export const DASHBOARD_STYLES = Object.freeze([
  Object.freeze({ id: "evidence-ledger", name: "Ledger" }),
  Object.freeze({ id: "pdpc", name: "PDPC" }),
  Object.freeze({ id: "humanist-standard", name: "Humanist" }),
  Object.freeze({ id: "signal-instrument", name: "Instrument" }),
]);

export const DASHBOARD_COLOR_PROFILES = Object.freeze(RAW_PROFILES.map(
  ([id, name, sourceStyle]) => Object.freeze({ id, name, sourceStyle }),
));

export const APPEARANCE_STORAGE_KEY = "simex-dashboard-appearance-v3";
export const APPEARANCE_PREFERENCES = Object.freeze(["light", "dark", "system"]);
export const CHART_COLOR_MODES = Object.freeze(["profile", "standard"]);

const DEFAULTS = Object.freeze({
  dashboardStyle: "evidence-ledger",
  dashboardColorProfile: "signal-instrument/calibrated-steel",
  chartColorMode: "profile",
});

const STANDARD_CHART_COLORS = Object.freeze({
  light: Object.freeze({
    MARK: "#24333d",
    D1: "#32669a",
    D2: "#a64f22",
    D3: "#2f7554",
    D4: "#974653",
    D5: "#69569a",
    D6: "#786223",
  }),
  dark: Object.freeze({
    MARK: "#edf2f5",
    D1: "#86b3dd",
    D2: "#e49a72",
    D3: "#83be9d",
    D4: "#de8b96",
    D5: "#b4a4db",
    D6: "#c8ae69",
  }),
});

const PROFILE_TOKENS = new Map(RAW_PROFILES.map(
  ([id, , , light, dark]) => [id, Object.freeze({
    light: tokenRecord(light),
    dark: tokenRecord(dark),
  })],
));

export function resolveDashboardTheme({
  globalStyles = {},
  appearancePreference = "system",
  prefersDark = false,
} = {}) {
  const dashboardStyle = includesId(DASHBOARD_STYLES, globalStyles.dashboardStyle)
    ? globalStyles.dashboardStyle
    : DEFAULTS.dashboardStyle;
  const dashboardColorProfile = PROFILE_TOKENS.has(globalStyles.dashboardColorProfile)
    ? globalStyles.dashboardColorProfile
    : DEFAULTS.dashboardColorProfile;
  const chartColorMode = CHART_COLOR_MODES.includes(globalStyles.chartColorMode)
    ? globalStyles.chartColorMode
    : DEFAULTS.chartColorMode;
  const savedAppearance = APPEARANCE_PREFERENCES.includes(appearancePreference)
    ? appearancePreference
    : "system";
  const resolvedAppearance = savedAppearance === "system"
    ? (prefersDark ? "dark" : "light")
    : savedAppearance;
  const profileTokens = PROFILE_TOKENS.get(dashboardColorProfile)[resolvedAppearance];
  const tokens = chartColorMode === "standard"
    ? { ...profileTokens, ...STANDARD_CHART_COLORS[resolvedAppearance] }
    : profileTokens;

  return Object.freeze({
    dashboardStyle,
    dashboardColorProfile,
    chartColorMode,
    appearancePreference: savedAppearance,
    resolvedAppearance,
    styleVariables: resolveDashboardStyleGrammar(dashboardStyle, resolvedAppearance),
    cssVariables: Object.freeze({
      ...COMPONENT_CSS_VARIABLES,
      ...Object.fromEntries(TOKEN_KEYS.map((key, index) => [CSS_VARIABLES[index], tokens[key]])),
    }),
  });
}

export function createDashboardThemeProjection(theme = {}) {
  const cssVariables = Object.freeze({
    ...(theme.cssVariables ?? {}),
    ...(theme.styleVariables ?? {}),
  });
  const metadata = {
    dashboardStyle: theme.dashboardStyle,
    dashboardColorProfile: theme.dashboardColorProfile,
    chartColorMode: theme.chartColorMode,
    appearancePreference: theme.appearancePreference,
    resolvedAppearance: theme.resolvedAppearance,
  };
  const key = JSON.stringify([
    ...Object.values(metadata),
    ...Object.entries(cssVariables).sort(([left], [right]) => left.localeCompare(right)),
  ]);
  return Object.freeze({ ...metadata, cssVariables, key });
}

export function createPresentationThemeSnapshot(theme = {}) {
  const resolved = (
    includesId(DASHBOARD_STYLES, theme.dashboardStyle)
    && PROFILE_TOKENS.has(theme.dashboardColorProfile)
    && CHART_COLOR_MODES.includes(theme.chartColorMode)
    && APPEARANCE_PREFERENCES.includes(theme.appearancePreference)
    && ["light", "dark"].includes(theme.resolvedAppearance)
  ) ? theme : resolveDashboardTheme();
  return Object.freeze({
    dashboard_style: resolved.dashboardStyle,
    dashboard_color_profile: resolved.dashboardColorProfile,
    chart_color_mode: resolved.chartColorMode,
    appearance_preference: resolved.appearancePreference,
    resolved_appearance: resolved.resolvedAppearance,
  });
}

export function resolvePresentationThemeSnapshot(snapshot, fallbackTheme = null) {
  if (!snapshot || typeof snapshot !== "object") {
    return fallbackTheme ?? resolveDashboardTheme();
  }
  return resolveDashboardTheme({
    globalStyles: {
      dashboardStyle: snapshot.dashboard_style,
      dashboardColorProfile: snapshot.dashboard_color_profile,
      chartColorMode: snapshot.chart_color_mode,
    },
    appearancePreference: snapshot.appearance_preference,
    prefersDark: snapshot.resolved_appearance === "dark",
  });
}

export function readAppearancePreference(storage = browserStorage) {
  try {
    const value = storage?.getItem(APPEARANCE_STORAGE_KEY);
    return APPEARANCE_PREFERENCES.includes(value) ? value : "system";
  } catch {
    return "system";
  }
}

export function persistAppearancePreference(value, storage = browserStorage) {
  if (!APPEARANCE_PREFERENCES.includes(value)) {
    throw new TypeError("Dashboard appearance preference must be light, dark, or system.");
  }
  if (typeof storage?.setItem !== "function") return false;
  return storage.setItem(APPEARANCE_STORAGE_KEY, value) !== false;
}

function tokenRecord(serialized) {
  const values = serialized.split(" ");
  if (values.length !== TOKEN_KEYS.length) {
    throw new Error("Dashboard color profile must define all 33 approved tokens.");
  }
  return Object.freeze(Object.fromEntries(
    TOKEN_KEYS.map((key, index) => [key, values[index]]),
  ));
}

function includesId(options, value) {
  return options.some(({ id }) => id === value);
}
