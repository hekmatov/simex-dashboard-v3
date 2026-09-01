import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const [
  { default: ControlTooltip },
  { default: ModeSwitcher },
  { IconControl },
  { default: BuildCommandHeader },
] = await Promise.all([
  vite.ssrLoadModule("/src/components/common/ControlTooltip.jsx"),
  vite.ssrLoadModule("/src/components/app-shell/ModeSwitcher.jsx"),
  vite.ssrLoadModule("/src/components/common/SimExIcon.js"),
  vite.ssrLoadModule("/src/components/build/BuildCommandHeader.jsx"),
]);
await vite.close();

test("workflow-disabled controls expose their reason from a pointer-only wrapper, never the native control", () => {
  const html = renderToStaticMarkup(React.createElement(
    ControlTooltip,
    { disabled: true, reason: "Finish or cancel the open chart draft." },
    React.createElement("button", { type: "button", disabled: true }, "Finish Build"),
  ));

  const describedBy = html.match(/data-control-tooltip-anchor="true"[^>]*aria-describedby="([^"]+)"/)?.[1];
  assert.ok(describedBy);
  assert.match(html, /data-control-tooltip-anchor="true"[^>]*tabindex="-1"/);
  assert.match(html, new RegExp(`<span id="${describedBy}" role="tooltip"`));
  assert.match(html, /<button type="button" disabled="">Finish Build<\/button>/);
  assert.doesNotMatch(html, /<button[^>]+aria-describedby/);
});

test("enabled controls keep ordinary tab order without a tooltip wrapper stop", () => {
  const html = renderToStaticMarkup(React.createElement(
    ControlTooltip,
    { disabled: false, reason: "No longer relevant" },
    React.createElement("button", { type: "button" }, "Finish Build"),
  ));

  assert.match(html, /data-control-tooltip-anchor="false"/);
  assert.doesNotMatch(html, /tabindex=/);
  assert.doesNotMatch(html, /aria-describedby=/);
  assert.doesNotMatch(html, /role="tooltip"/);
  assert.match(html, /<button type="button">Finish Build<\/button>/);
});

test("ModeSwitcher applies one disabled-reason wrapper per workflow-disabled action", () => {
  const disabledHtml = renderToStaticMarkup(React.createElement(ModeSwitcher, {
    mode: "build",
    availableModes: ["view", "build"],
    disabled: true,
    disabledReason: "Finish or cancel the open chart draft.",
    onModeRequest() {},
  }));
  const enabledHtml = renderToStaticMarkup(React.createElement(ModeSwitcher, {
    mode: "build",
    availableModes: ["view", "build"],
    onModeRequest() {},
  }));

  assert.equal((disabledHtml.match(/data-control-tooltip-anchor="true"/g) ?? []).length, 2);
  assert.equal((disabledHtml.match(/tabindex="-1"/g) ?? []).length, 2);
  assert.doesNotMatch(disabledHtml, /<button[^>]+aria-describedby/);
  assert.equal((enabledHtml.match(/data-control-tooltip-anchor="false"/g) ?? []).length, 2);
  assert.doesNotMatch(enabledHtml, /tabindex=/);
});

test("IconControl opts into the workflow-disabled anchor without explaining intrinsic states", () => {
  const workflowDisabled = renderToStaticMarkup(React.createElement(IconControl, {
    interactionId: "shell.save-edits",
    disabled: true,
    disabledReason: "Wait for the current dashboard operation to finish.",
  }));
  const ordinaryDisabled = renderToStaticMarkup(React.createElement(IconControl, {
    interactionId: "shell.save-edits",
    disabled: true,
  }));

  assert.match(workflowDisabled, /data-control-tooltip-anchor="true"[^>]*tabindex="-1"/);
  assert.match(workflowDisabled, /role="tooltip"/);
  assert.doesNotMatch(workflowDisabled, /<button[^>]+aria-describedby/);
  assert.doesNotMatch(ordinaryDisabled, /data-control-tooltip-anchor="true"/);
  assert.doesNotMatch(ordinaryDisabled, /tabindex="0"/);
});

test("open chart work explains the Build actions it workflow-disables", () => {
  const html = renderToStaticMarkup(React.createElement(BuildCommandHeader, {
    draftCoordinator: { slots: { layout: null, chart: null } },
    locked: true,
    auxiliaryLocked: true,
    disabledReason: "Finish or cancel the open chart draft.",
    auxiliaryDisabledReason: "Finish or cancel the open chart draft.",
  }));

  assert.match(
    html,
    /data-control-tooltip-anchor="true"[^>]*tabindex="-1"[^>]*>[\s\S]*?<button[^>]*disabled=""[^>]*>Finish Build<\/button>/,
  );
  assert.doesNotMatch(html, /<button[^>]+aria-describedby/);
  assert.match(html, /role="tooltip"[^>]*>Finish or cancel the open chart draft\.<\/span>/);
});
