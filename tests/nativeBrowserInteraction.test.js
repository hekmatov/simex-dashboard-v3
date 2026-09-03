import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { IconControl, IconSummary } from "../src/components/common/SimExIcon.js";

test("icon controls retain native button and disclosure focusability", () => {
  const buttonHtml = renderToStaticMarkup(React.createElement(IconControl, {
    interactionId: "fullscreen.close-chart",
  }));
  const summaryHtml = renderToStaticMarkup(React.createElement(
    "details",
    null,
    React.createElement(IconSummary, {
      interactionId: "shell.global-panel-colors",
    }),
  ));

  const buttonTag = buttonHtml.match(/<button[^>]*>/)?.[0] ?? "";
  const summaryTag = summaryHtml.match(/<summary[^>]*>/)?.[0] ?? "";
  assert.doesNotMatch(buttonTag, /tabindex="-1"/);
  assert.doesNotMatch(summaryTag, /tabindex="-1"/);
  assert.match(buttonHtml, /data-icon-tooltip="Close"/);
  assert.doesNotMatch(buttonHtml, /role="tooltip"/);
});
