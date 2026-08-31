import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  isTextEditingElement,
  pointerControlProps,
  suppressNonEditableFocus,
  suppressNonEditableKeyboardInput,
  suppressPointerControlFocus,
} from "../src/components/common/PointerInteractionMode.js";
import { IconControl } from "../src/components/common/SimExIcon.js";

test("pointer-only controls are removed from tab order and blur after a pointer click", () => {
  const control = {
    tagName: "BUTTON",
    isContentEditable: false,
    blurCalls: 0,
    blur() {
      this.blurCalls += 1;
    },
  };
  const prevented = [];
  const event = {
    currentTarget: control,
    preventDefault() {
      prevented.push(true);
    },
  };

  assert.deepEqual(pointerControlProps, { tabIndex: -1 });
  assert.equal(suppressPointerControlFocus(event), true);
  assert.deepEqual(prevented, [true]);
  assert.equal(control.blurCalls, 1);
});

test("pointer-only mode preserves native editable elements and their input events", () => {
  for (const tagName of ["INPUT", "TEXTAREA", "SELECT"]) {
    assert.equal(isTextEditingElement({ tagName, isContentEditable: false }), true, tagName);
  }
  assert.equal(isTextEditingElement({ tagName: "DIV", isContentEditable: true }), true);
  assert.equal(isTextEditingElement({ tagName: "BUTTON", isContentEditable: false }), false);

  const editable = { tagName: "TEXTAREA", isContentEditable: false };
  let prevented = false;
  assert.equal(suppressPointerControlFocus({
    currentTarget: editable,
    preventDefault() {
      prevented = true;
    },
  }), false);
  assert.equal(prevented, false);
});

test("keyboard events are suppressed only outside native and rich-text editing surfaces", () => {
  const calls = [];
  const keyboardEvent = {
    target: { tagName: "BUTTON", isContentEditable: false },
    preventDefault() { calls.push("prevent"); },
    stopPropagation() { calls.push("stop"); },
  };
  assert.equal(suppressNonEditableKeyboardInput(keyboardEvent), true);
  assert.deepEqual(calls, ["prevent", "stop"]);

  assert.equal(suppressNonEditableKeyboardInput({
    target: { tagName: "INPUT", isContentEditable: false },
    preventDefault() { throw new Error("text input must keep keyboard input"); },
    stopPropagation() { throw new Error("text input must keep propagation"); },
  }), false);
});

test("programmatic focus is released from non-editable controls but retained by editors", () => {
  const button = {
    tagName: "BUTTON",
    isContentEditable: false,
    blurCalls: 0,
    blur() { this.blurCalls += 1; },
  };
  assert.equal(suppressNonEditableFocus({ target: button }), true);
  assert.equal(button.blurCalls, 1);

  const input = {
    tagName: "INPUT",
    isContentEditable: false,
    blur() { throw new Error("editable focus must be preserved"); },
  };
  assert.equal(suppressNonEditableFocus({ target: input }), false);
});

test("icon controls remain pointer-operable without focus-triggered tooltip markup", () => {
  const html = renderToStaticMarkup(React.createElement(IconControl, {
    interactionId: "fullscreen.close-chart",
  }));

  assert.match(html, /<button[^>]*tabindex="-1"/);
  assert.match(html, /data-icon-tooltip="Close"/);
  assert.doesNotMatch(html, /role="tooltip"/);
});
