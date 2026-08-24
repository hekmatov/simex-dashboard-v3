import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const loaded = await nextLoad(url, { ...context, format: "module" });
    return { format: "module", source: loaded.source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
`)}`, import.meta.url);

test("an image chart renders an image embedded by dashboard package export", async () => {
  const { default: ImageChartView } = await import(
    "../src/components/charts/ImageChartView.jsx"
  );

  const html = renderToStaticMarkup(React.createElement(ImageChartView, {
    model: {
      src: "data:image/png;base64,aW1hZ2U=",
      alt: "Embedded briefing image",
      fit: "contain",
    },
    chart: { title: "Briefing image" },
  }));

  assert.match(html, /<img[^>]+src="data:image\/png;base64,aW1hZ2U="/);
  assert.doesNotMatch(html, /cannot be displayed/i);
});
