import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const NATIVE_STYLES = Object.freeze([
  Object.freeze({
    id: "evidence-ledger", label: "Evidence Ledger",
    profile: "evidence-ledger/brighter-vellum",
    shellRadius: "0px", surfaceRadius: "2px", panelRadius: "2px", controlRadius: "2px",
    panelShadow: "none", shellShadow: "none",
    sectionPaint: "rgb(247, 242, 232)",
    canvasPaint: "rgb(247, 242, 232)", panelPaint: "rgb(255, 253, 248)",
    panelAltPaint: "rgb(250, 246, 236)", accentSoftPaint: "rgb(232, 228, 218)",
    textPaint: "rgb(29, 37, 41)", borderPaint: "rgb(183, 176, 162)",
  }),
  Object.freeze({
    id: "humanist-standard", label: "Humanist Standard",
    profile: "humanist-standard/common-ground",
    shellRadius: "18px", surfaceRadius: "18px", panelRadius: "14px", controlRadius: "10px",
    panelShadow: "rgba(36, 57, 52, 0.1) 0px 8px 20px 0px",
    shellShadow: "rgba(25, 55, 48, 0.12) 0px 16px 38px 0px",
    sectionPaint: "color(srgb 0.946824 0.964549 0.949804)",
    canvasPaint: "rgb(240, 245, 241)", panelPaint: "rgb(252, 253, 251)",
    panelAltPaint: "rgb(242, 247, 243)", accentSoftPaint: "rgb(220, 235, 229)",
    textPaint: "rgb(29, 43, 42)", borderPaint: "rgb(183, 197, 191)",
  }),
  Object.freeze({
    id: "signal-instrument", label: "Signal + Instrument",
    profile: "signal-instrument/calibrated-steel",
    shellRadius: "6px", surfaceRadius: "6px", panelRadius: "4px", controlRadius: "3px",
    panelShadow: "rgba(19, 38, 45, 0.14) 0px 1px 2px 0px, rgba(255, 255, 255, 0.55) 0px 1px 0px 0px inset",
    shellShadow: "rgba(19, 38, 45, 0.14) 0px 4px 12px 0px, rgba(255, 255, 255, 0.45) 0px 1px 0px 0px inset",
    sectionPaint: "color(srgb 0.925882 0.94549 0.946902)",
    canvasPaint: "rgb(232, 237, 239)", panelPaint: "rgb(248, 250, 249)",
    panelAltPaint: "rgb(237, 242, 242)", accentSoftPaint: "rgb(215, 230, 232)",
    textPaint: "rgb(23, 37, 43)", borderPaint: "rgb(170, 185, 189)",
  }),
]);

const PROFILE_OUTER = Object.freeze({
  "evidence-ledger/brighter-vellum": ["#eee9de", "#181713"],
  "evidence-ledger/ash-register": ["#deded9", "#151615"],
  "evidence-ledger/cool-archive": ["#dfe3e1", "#141817"],
  "humanist-standard/common-ground": ["#e6ece8", "#121a18"],
  "humanist-standard/quiet-commons": ["#e9e9e5", "#171918"],
  "humanist-standard/open-forum": ["#e8e6ed", "#17151c"],
  "signal-instrument/calibrated-steel": ["#dce4e6", "#0d1518"],
  "signal-instrument/quiet-telemetry": ["#e1e5e6", "#111719"],
  "signal-instrument/amber-vector": ["#e2e3e5", "#151314"],
  "utility/prismatic-index": ["#e2e2e7", "#111117"],
  "utility/chromatic-polarity": ["#ddd5cb", "#161319"],
  "utility/luminance-ladder": ["#ded8e7", "#150d1b"],
  "graphpad/sunrise-reference": ["#e8ddd2", "#160f14"],
  "graphpad/lakeside-reference": ["#dde4e3", "#0e1515"],
  "utility/monochrome-reserve": ["#d6d6d6", "#0d0d0d"],
});

const PROFILE_CATALOGUE_IDS = Object.freeze({
  "evidence-ledger/brighter-vellum": "brighter-vellum",
  "evidence-ledger/ash-register": "ash-register",
  "evidence-ledger/cool-archive": "cool-archive",
  "humanist-standard/common-ground": "common-ground",
  "humanist-standard/quiet-commons": "quiet-commons",
  "humanist-standard/open-forum": "open-forum",
  "signal-instrument/calibrated-steel": "calibrated-steel",
  "signal-instrument/quiet-telemetry": "quiet-telemetry",
  "signal-instrument/amber-vector": "amber-vector",
  "utility/prismatic-index": "prismatic-index",
  "utility/chromatic-polarity": "chromatic-polarity",
  "utility/luminance-ladder": "luminance-ladder",
  "graphpad/sunrise-reference": "sunrise-reference-faithful",
  "graphpad/lakeside-reference": "lakeside-reference-faithful",
  "utility/monochrome-reserve": "monochrome-reserve",
});

const TOKEN_TO_VARIABLE = Object.freeze({
  OUT: "--simex-surface-outer",
  CAN: "--simex-surface-canvas",
  PAN: "--simex-surface-panel",
  ALT: "--simex-surface-panel-alt",
  INK: "--simex-text-strong",
  "INK-S": "--simex-text-muted",
  "INK-F": "--simex-text-faint",
  RULE: "--simex-border-subtle",
  "RULE+": "--simex-border-strong",
  ACC: "--simex-accent",
  "ACC-S": "--simex-accent-soft",
  "ON-ACC": "--simex-on-accent",
  FOCUS: "--simex-focus",
  SEL: "--simex-selected",
  "SEL-S": "--simex-selected-soft",
  CHR: "--simex-chrono",
  "CHR-S": "--simex-chrono-soft",
  INFO: "--simex-info",
  "INFO-S": "--simex-info-soft",
  OK: "--simex-success",
  "OK-S": "--simex-success-soft",
  WARN: "--simex-warning",
  "WARN-S": "--simex-warning-soft",
  ERR: "--simex-error",
  "ERR-S": "--simex-error-soft",
  GRID: "--simex-gridline",
  MARK: "--simex-chart-mark",
  D1: "--simex-data-1", D2: "--simex-data-2", D3: "--simex-data-3",
  D4: "--simex-data-4", D5: "--simex-data-5", D6: "--simex-data-6",
});

const APPROVED_TOKEN_MATRIX = readApprovedTokenMatrix(await readFile(
  new URL("../../.planning/sketches/003-dashboard-visual-language/palette-catalog.html", import.meta.url),
  "utf8",
));

test.describe.configure({ timeout: 150_000 });

test("native style signatures resolve real shell, section, panel, and control paint", async ({ page }) => {
  await openBiomedicalLook(page);
  for (const style of NATIVE_STYLES) {
    await page.getByLabel(style.label, { exact: true }).check();
    await page.locator(`[data-profile-option="${style.profile}"] input`).check();
    await page.getByLabel("Light", { exact: true }).check();
    await expect(page.locator(".app-frame")).toHaveAttribute("data-dashboard-style", style.id);
    await page.waitForTimeout(220);

    const metrics = await page.evaluate(() => {
      const css = (selector) => getComputedStyle(document.querySelector(selector));
      const take = (style, names) => Object.fromEntries(
        names.map((name) => [name, style[name]]),
      );
      const section = document.querySelector("[data-canonical-section-id]");
      const header = section.querySelector(".section-header");
      const panel = section.querySelector("[data-canonical-panel-id]");
      const headerRect = header.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      return {
        shell: take(css(".canonical-dashboard-frame"), ["borderRadius", "boxShadow", "borderTopWidth", "borderTopStyle"]),
        panel: take(css("[data-canonical-panel-id]"), ["borderRadius", "boxShadow", "borderTopWidth", "borderTopStyle", "padding"]),
        control: take(css('[data-command-crown-pinned-actions="true"] .dashboard-look-trigger'), ["borderRadius"]),
        header: take(css("[data-canonical-section-id] .section-header"), ["padding", "borderBottomWidth", "borderBottomStyle", "backgroundColor"]),
        grid: take(css("[data-canonical-section-id] > .layout-grid"), ["padding", "columnGap", "rowGap"]),
        headerBottomToPanelBorder: panelRect.top - headerRect.bottom,
      };
    });
    expect(metrics.shell).toEqual({
      borderRadius: style.shellRadius,
      boxShadow: style.shellShadow,
      borderTopWidth: "1px",
      borderTopStyle: "solid",
    });
    expect(metrics.panel).toEqual({
      borderRadius: style.panelRadius,
      boxShadow: style.panelShadow,
      borderTopWidth: "1px",
      borderTopStyle: "solid",
      padding: "12px",
    });
    expect(metrics.control).toEqual({ borderRadius: style.controlRadius });
    expect(metrics.header).toEqual({
      padding: "22px 18px 14px",
      borderBottomWidth: "1px",
      borderBottomStyle: "solid",
      backgroundColor: style.sectionPaint,
    });
    expect(metrics.grid).toEqual({ padding: "18px", columnGap: "16px", rowGap: "16px" });
    expect(metrics.headerBottomToPanelBorder).toBe(18);
  }
});

test("Humanist contours retain accepted translucency and steady shell elevation", async ({ page }) => {
  await openBiomedicalLook(page);
  await page.getByLabel("Humanist Standard", { exact: true }).check();
  await page.locator('[data-profile-option="humanist-standard/common-ground"] input').check();
  for (const appearance of ["Light", "Dark"]) {
    await page.getByLabel(appearance, { exact: true }).check();
    const metrics = await page.evaluate(() => {
      const app = document.querySelector(".app-frame");
      const sections = document.querySelectorAll("[data-canonical-section-id]");
      const mix = (variable, percentage) => {
        const probe = document.createElement("span");
        probe.style.color = `color-mix(in srgb, var(${variable}) ${percentage}%, transparent)`;
        app.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      };
      return {
        actual: {
          shell: getComputedStyle(document.querySelector(".canonical-dashboard-frame")).borderTopColor,
          panel: getComputedStyle(document.querySelector("[data-canonical-panel-id]")).borderTopColor,
          sectionBottom: getComputedStyle(sections[0].querySelector(".section-header")).borderBottomColor,
          sectionTop: getComputedStyle(sections[1].querySelector(".section-header")).borderTopColor,
        },
        expected: {
          shell: mix("--simex-border-strong", 78),
          panel: mix("--simex-border-subtle", 82),
          sectionBottom: mix("--simex-border-subtle", 75),
          sectionTop: mix("--simex-border-strong", 70),
        },
        shellShadow: getComputedStyle(document.querySelector(".canonical-dashboard-frame")).boxShadow,
      };
    });
    expect(metrics.actual).toEqual(metrics.expected);
    expect(metrics.shellShadow).toBe("rgba(25, 55, 48, 0.12) 0px 16px 38px 0px");
  }
});

test("native Dark charts yield legacy white defaults to profile surfaces", async ({ page }) => {
  await openBiomedicalLook(page);
  await page.getByLabel("Signal + Instrument", { exact: true }).check();
  await page.locator('[data-profile-option="signal-instrument/calibrated-steel"] input').check();
  await page.getByLabel("Dark", { exact: true }).check();
  await expect(page.locator(".chart-view-frame").first())
    .toHaveCSS("background-color", "rgb(22, 33, 38)");
});

test("selected dashboard style reaches crown, Build authoring, and Present chrome", async ({ page }) => {
  for (const style of NATIVE_STYLES) {
    await openBiomedicalLook(page);
    await page.getByLabel(style.label, { exact: true }).check();
    await page.locator(`[data-profile-option="${style.profile}"] input`).check();
    await page.getByLabel("Light", { exact: true }).check();

    const setLook = page.getByRole("button", { name: "Set dashboard look", exact: true });
    if (await setLook.isEnabled()) await setLook.click();
    await page.getByRole("dialog", { name: "Dashboard look" })
      .getByRole("button", { name: "Close", exact: true }).click();
    await page.getByLabel("Dashboard mode")
      .getByRole("button", { name: "View", exact: true }).click();
    await expect(page.locator(".view-shell")).toBeVisible();
    await expect(page.locator(".dashboard-command-pinned-actions .dashboard-look-trigger"))
      .toHaveCSS("background-color", style.panelAltPaint);

    const viewChrome = await readChrome(page, {
      dashboardLook: ".dashboard-command-pinned-actions .dashboard-look-trigger",
      chrono: ".dashboard-command-pinned-actions .chrono-view-button",
      compare: ".dashboard-command-pinned-actions .view-comparison-button",
    });
    expect(viewChrome.dashboardLook).toMatchObject({
      backgroundColor: style.panelAltPaint,
      borderRadius: style.controlRadius,
      borderTopColor: style.borderPaint,
      color: style.textPaint,
    });
    expect(viewChrome.chrono).toMatchObject({
      backgroundColor: style.panelPaint,
      borderRadius: style.controlRadius,
      borderTopColor: style.borderPaint,
      color: style.textPaint,
    });
    expect(viewChrome.compare).toMatchObject({
      backgroundColor: style.accentSoftPaint,
      borderRadius: style.controlRadius,
      borderTopColor: style.borderPaint,
      color: style.textPaint,
    });

    await page.getByLabel("Dashboard mode")
      .getByRole("button", { name: "Build", exact: true }).click();
    await expect(page.locator(".build-authoring-layer")).toBeVisible();
    await expect(page.locator(".dashboard-command-pinned-actions .build-time-groups"))
      .toHaveCSS("background-color", style.panelAltPaint);
    const buildChrome = await readChrome(page, {
      layer: ".build-authoring-layer",
      structure: ".build-authoring-layer .build-structure-sheet",
      inspector: ".build-authoring-layer .build-inspector-sheet",
      look: ".dashboard-command-pinned-actions .dashboard-look-trigger",
      timeGroups: ".dashboard-command-pinned-actions .build-time-groups",
    });
    expect(buildChrome.layer).toMatchObject({
      backgroundColor: style.panelPaint,
      borderRadius: style.surfaceRadius,
      borderTopColor: style.borderPaint,
      color: style.textPaint,
    });
    for (const surface of [buildChrome.structure, buildChrome.inspector]) {
      expect(surface).toMatchObject({
        backgroundColor: style.panelAltPaint,
        borderRadius: style.panelRadius,
        borderTopColor: style.borderPaint,
        color: style.textPaint,
      });
    }
    for (const control of [buildChrome.look, buildChrome.timeGroups]) {
      expect(control).toMatchObject({
        backgroundColor: style.panelAltPaint,
        borderRadius: style.controlRadius,
        borderTopColor: style.borderPaint,
        color: style.textPaint,
      });
    }

    await page.getByLabel("Dashboard mode")
      .getByRole("button", { name: "Present", exact: true }).click();
    await expect(page.locator(".present-workspace")).toBeVisible();
    await expect(page.locator(".present-status-strip .dashboard-look-trigger"))
      .toHaveCSS("background-color", style.panelAltPaint);
    const presentChrome = await readChrome(page, {
      workspace: ".present-workspace",
      status: ".present-status-strip",
      context: ".present-context-panel",
      scene: ".present-scene-panel",
      snapshot: ".audience-snapshot-frame",
      group: ".present-chart-group",
      dock: ".present-action-dock",
      look: ".present-status-strip .dashboard-look-trigger",
    });
    expect(presentChrome.workspace).toMatchObject({
      backgroundColor: style.canvasPaint,
      color: style.textPaint,
    });
    expect(presentChrome.status).toMatchObject({
      backgroundColor: style.panelPaint,
      borderRadius: style.surfaceRadius,
      borderTopColor: style.borderPaint,
      color: style.textPaint,
    });
    for (const surface of [presentChrome.context, presentChrome.scene]) {
      expect(surface).toMatchObject({
        backgroundColor: style.panelPaint,
        borderRadius: style.panelRadius,
        borderTopColor: style.borderPaint,
        color: style.textPaint,
      });
    }
    for (const surface of [presentChrome.snapshot, presentChrome.group]) {
      expect(surface).toMatchObject({
        backgroundColor: style.panelAltPaint,
        borderRadius: style.controlRadius,
        borderTopColor: style.borderPaint,
      });
    }
    expect(presentChrome.dock).toMatchObject({
      backgroundColor: style.panelPaint,
      borderTopColor: style.borderPaint,
      color: style.textPaint,
    });
    expect(presentChrome.look).toMatchObject({
      backgroundColor: style.panelAltPaint,
      borderRadius: style.controlRadius,
      borderTopColor: style.borderPaint,
      color: style.textPaint,
    });
  }
});

test("all 15 profiles project every approved Light and Dark palette token", async ({ page }) => {
  await openBiomedicalLook(page);
  const appFrame = page.locator(".app-frame");
  for (const [profile, approvedOuter] of Object.entries(PROFILE_OUTER)) {
    await page.locator(`[data-profile-option="${profile}"] input`).check();
    for (const [index, appearance] of ["Light", "Dark"].entries()) {
      await page.getByLabel(appearance, { exact: true }).check();
      await expect(appFrame).toHaveAttribute("data-dashboard-color-profile", profile);
      const actualTokens = await appFrame.evaluate((element, entries) => {
        const style = getComputedStyle(element);
        return Object.fromEntries(entries.map(([token, variable]) => [
          token,
          style.getPropertyValue(variable).trim().toLowerCase(),
        ]));
      }, Object.entries(TOKEN_TO_VARIABLE));
      expect(actualTokens).toEqual(APPROVED_TOKEN_MATRIX[profile][appearance.toLowerCase()]);
      await expect(appFrame).toHaveCSS("background-color", rgb(approvedOuter[index]));
    }
  }
});

test("native outer paint remains continuous beside the centered maximum-width page", async ({ page }) => {
  await openBiomedicalLook(page);
  for (const style of NATIVE_STYLES) {
    await page.getByLabel(style.label, { exact: true }).check();
    await page.locator(`[data-profile-option="${style.profile}"] input`).check();
    for (const appearance of ["Light", "Dark"]) {
      await page.getByLabel(appearance, { exact: true }).check();
      const approvedOuter = PROFILE_OUTER[style.profile][appearance === "Light" ? 0 : 1];
      for (const viewport of [{ width: 1920, height: 1080 }, { width: 2560, height: 1440 }]) {
        await page.setViewportSize(viewport);
        const continuity = await page.evaluate(() => {
          const app = document.querySelector(".app-frame");
          const frame = document.querySelector(".canonical-dashboard-frame");
          const appRect = app.getBoundingClientRect();
          const frameRect = frame.getBoundingClientRect();
          return {
            viewportWidth: document.documentElement.clientWidth,
            appWidth: appRect.width,
            appLeft: appRect.left,
            frameWidth: frameRect.width,
            leftGutter: frameRect.left,
            rightGutter: document.documentElement.clientWidth - frameRect.right,
            appPaint: getComputedStyle(app).backgroundColor,
          };
        });
        expect(continuity).toEqual({
          viewportWidth: viewport.width,
          appWidth: viewport.width,
          appLeft: 0,
          frameWidth: 1392,
          leftGutter: (viewport.width - 1392) / 2,
          rightGutter: (viewport.width - 1392) / 2,
          appPaint: rgb(approvedOuter),
        });
      }
    }
  }
});

async function openBiomedicalLook(page) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByRole("button", { name: "Dashboard look", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Dashboard look" })).toBeVisible();
}

async function readChrome(page, selectors) {
  return page.evaluate((entries) => Object.fromEntries(Object.entries(entries).map(
    ([name, selector]) => {
      const style = getComputedStyle(document.querySelector(selector));
      return [name, {
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        borderTopColor: style.borderTopColor,
        boxShadow: style.boxShadow,
        color: style.color,
      }];
    },
  )), selectors);
}

function rgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`;
}

function readApprovedTokenMatrix(html) {
  const tokenNames = new Set(Object.keys(TOKEN_TO_VARIABLE));
  return Object.freeze(Object.fromEntries(Object.entries(PROFILE_CATALOGUE_IDS).map(
    ([profile, catalogueId]) => [profile, Object.freeze(Object.fromEntries(
      ["light", "dark"].map((appearance) => {
        const row = html.match(new RegExp(
          `<tr id="${appearance}-${catalogueId}">([\\s\\S]*?)<\\/tr>`,
          "i",
        ));
        if (!row) throw new Error(`Missing accepted palette row: ${appearance}-${catalogueId}`);
        const tokens = Object.fromEntries([...row[1].matchAll(
          /\b([A-Z][A-Z0-9+-]*)\s+(#[0-9A-F]{6})/gi,
        )]
          .map(([, token, value]) => [token.toUpperCase(), value.toLowerCase()])
          .filter(([token]) => tokenNames.has(token)));
        if (Object.keys(tokens).length !== tokenNames.size) {
          throw new Error(
            `Accepted palette row ${appearance}-${catalogueId} has ${Object.keys(tokens).length} of ${tokenNames.size} tokens.`,
          );
        }
        return [appearance, Object.freeze(tokens)];
      }),
    ))],
  )));
}
