import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
const drawerModule = await vite
  .ssrLoadModule("/src/components/common/RightSideDrawer.jsx")
  .catch(() => ({}));
const statusModule = await vite
  .ssrLoadModule("/src/components/app-shell/OperationStatusViewport.jsx")
  .catch(() => ({}));
await vite.close();
const drawerSource = await readFile(
  new URL("../src/components/common/RightSideDrawer.jsx", import.meta.url),
  "utf8",
);

const Drawer = drawerModule.default;

test("shared right drawer renders dialog and complementary modality contracts", () => {
  assert.equal(typeof Drawer, "function", "RightSideDrawer must be implemented");

  const dialog = renderToStaticMarkup(React.createElement(Drawer, {
    id: "test-dialog-drawer",
    title: "Dialog settings",
    open: true,
    onClose() {},
    modality: "dialog",
  }, React.createElement("p", null, "Dialog body")));
  const complementary = renderToStaticMarkup(React.createElement(Drawer, {
    id: "test-map-drawer",
    title: "Dashboard map",
    open: true,
    onClose() {},
    modality: "complementary",
  }, React.createElement("p", null, "Map body")));

  assert.match(dialog, /data-right-side-drawer="test-dialog-drawer"/);
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /class="right-side-drawer-click-catcher"/);
  assert.match(dialog, /aria-label="Close Dialog settings"/);
  assert.match(complementary, /data-right-side-drawer="test-map-drawer"/);
  assert.match(complementary, /role="complementary"/);
  assert.doesNotMatch(complementary, /aria-modal=/);
  assert.doesNotMatch(complementary, /right-side-drawer-click-catcher/);
});

test("shared right drawer closes through named Escape, click-away, and close-button paths", () => {
  assert.equal(typeof drawerModule.requestRightSideDrawerClose, "function");
  const reasons = [];
  for (const reason of ["escape", "click-away", "close-button"]) {
    drawerModule.requestRightSideDrawerClose((value) => reasons.push(value), reason);
  }
  assert.deepEqual(reasons, ["escape", "click-away", "close-button"]);
  assert.match(drawerSource, /addEventListener\("keydown", closeOnEscape\);/);
  assert.doesNotMatch(
    drawerSource,
    /addEventListener\("keydown", closeOnEscape, true\)/,
    "complementary Escape must run after nested controls and modal focus scopes",
  );
});

test("shared right drawer restores a connected trigger without scrolling", () => {
  assert.equal(typeof drawerModule.restoreRightSideDrawerTriggerFocus, "function");
  const calls = [];
  const trigger = {
    isConnected: true,
    focus(options) {
      calls.push(options);
    },
  };

  assert.equal(drawerModule.restoreRightSideDrawerTriggerFocus(trigger), true);
  assert.deepEqual(calls, [{ preventScroll: true }]);
  assert.equal(drawerModule.restoreRightSideDrawerTriggerFocus({
    isConnected: false,
    focus() {
      throw new Error("disconnected trigger must not be focused");
    },
  }), false);
});

test("one crown-bottom calculation positions every drawer and status notices reserve its width", () => {
  assert.equal(typeof drawerModule.rightSideDrawerTopFromCrown, "function");
  assert.equal(drawerModule.rightSideDrawerTopFromCrown({ crownBottom: 176 }), 188);
  assert.equal(drawerModule.rightSideDrawerTopFromCrown({ crownBottom: -40 }), 12);
  assert.equal(
    statusModule.measureOperationStatusDrawerOffset({
      viewportWidth: 1440,
      drawerRect: { left: 1040, right: 1440 },
    }),
    400,
  );
  assert.equal(
    statusModule.measureOperationStatusDrawerOffset({
      viewportWidth: 1440,
      drawer: {
        dataset: { rightSideDrawer: "look-drawer" },
        offsetWidth: 400,
        getBoundingClientRect() {
          return { left: 1064, right: 1464, width: 400 };
        },
      },
    }),
    400,
    "the opening translate must not reduce the settled shared-drawer clearance",
  );
  assert.equal(
    statusModule.measureOperationStatusDrawerOffset({
      viewportWidth: 1440,
      drawer: {
        offsetWidth: 400,
        getBoundingClientRect() {
          return { left: 1040, right: 1440, width: 400 };
        },
      },
    }),
    400,
    "legacy surfaces must retain rectangle-based clearance",
  );
});
