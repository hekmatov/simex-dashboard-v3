import assert from "node:assert/strict";
import test, { after, afterEach, beforeEach } from "node:test";

import { chromium } from "@playwright/test";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 0 },
});
await vite.listen();
const address = vite.httpServer.address();
const baseURL = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
let page;

beforeEach(async () => {
  page = await browser.newPage();
});

afterEach(async () => {
  await page?.close();
  page = null;
});

after(async () => {
  await browser.close();
  await vite.close();
});

test("Portable QMD alignment renders as a safe block-level text style", async () => {
  await page.goto(`${baseURL}/tests/fixtures/portable-qmd-browser.html`);
  const result = await page.evaluate(async () => {
    const { compilePortableQmd } = await import("/src/static-content/qmd/compilePortableQmd.js");
    const compiled = compilePortableQmd([
      "::: {.simex-text-align-right}",
      "Right-aligned operational note.",
      ":::",
    ].join("\n"), { panelId: "aligned-note" });
    const target = document.querySelector("#target");
    target.replaceChildren(compiled.fragment);
    const aligned = target.querySelector(".portable-qmd-text-align--right");
    return {
      ok: compiled.ok,
      className: aligned?.className,
      textAlign: aligned ? getComputedStyle(aligned).textAlign : "",
      text: aligned?.textContent,
      styleAttributes: target.querySelectorAll("[style]").length,
    };
  });

  assert.equal(result.ok, true);
  assert.equal(result.className, "portable-qmd-text-align portable-qmd-text-align--right");
  assert.equal(result.textAlign, "right");
  assert.equal(result.text, "Right-aligned operational note.");
  assert.equal(result.styleAttributes, 0);
});

test("arbitrary authored markup compiles into inert visible DOM without active elements or resources", async () => {
  const remoteRequests = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://example.test/")) remoteRequests.push(request.url());
  });
  await page.goto(`${baseURL}/tests/fixtures/portable-qmd-browser.html`);
  const result = await page.evaluate(async () => {
    window.__executed = false;
    const { compilePortableQmd } = await import("/src/static-content/qmd/compilePortableQmd.js");
    const source = [
      "Plain comparison x<y remains text.",
      "<script>window.__executed = true</script>",
      '<iframe src="https://example.test/frame"></iframe>',
      '<button onclick="window.__executed = true">Run</button>',
      '<span style="background:url(https://example.test/style.png)">Styled text</span>',
      "<!-- comment --><!doctype html><![CDATA[inert]]><?portable test?>",
      "![Remote image](https://example.test/map.png)",
      "[Unsafe link](javascript:window.__executed=true)",
      "Read [@source2026] and {{< include external.qmd >}}.",
      "::: {.widget}",
      "remote widget",
      ":::",
      "",
      "```{python} eval=true",
      "print('display only')",
      "```",
      "",
      "Unsafe math $\\htmlClass{bad}{x}$ remains readable.",
    ].join("\n");
    const compiled = compilePortableQmd(source, { panelId: "arbitrary-text" });
    const target = document.querySelector("#target");
    if (compiled.fragment) target.replaceChildren(compiled.fragment);
    const allElements = [...target.querySelectorAll("*")];
    return {
      ok: compiled.ok,
      errors: compiled.errors,
      text: target.textContent,
      activeElements: target.querySelectorAll("script,iframe,img,picture,audio,video,object,embed,source,link,style,template,base,meta,form,button,custom-widget").length,
      unsafeLinks: [...target.querySelectorAll("a")].filter((node) => !/^(?:https?:|#)/i.test(node.getAttribute("href") ?? "")).length,
      eventAttributes: allElements.flatMap((node) => [...node.attributes]).filter(({ name }) => name.startsWith("on")).length,
      authoredStyleAttributes: target.querySelectorAll("[style]").length,
      resourceAttributes: allElements.flatMap((node) => [...node.attributes]).filter(({ name }) => ["src", "srcset", "poster", "action", "formaction"].includes(name)).length,
      renderedMath: target.querySelectorAll(".portable-qmd-math").length,
      mathFallback: target.querySelector(".portable-qmd-math-fallback")?.textContent,
      executed: window.__executed,
    };
  });
  await page.waitForTimeout(100);

  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.match(result.text, /x<y/);
  assert.match(result.text, /<script>window\.__executed = true<\/script>/);
  assert.match(result.text, /<iframe src="https:\/\/example\.test\/frame"><\/iframe>/);
  assert.match(result.text, /!\[Remote image\]\(https:\/\/example\.test\/map\.png\)/);
  assert.match(result.text, /\{python\} eval=true/);
  assert.match(result.text, /\{\{< include external\.qmd >\}\}/);
  assert.equal(result.activeElements, 0);
  assert.equal(result.unsafeLinks, 0);
  assert.equal(result.eventAttributes, 0);
  assert.equal(result.authoredStyleAttributes, 0);
  assert.equal(result.resourceAttributes, 0);
  assert.equal(result.renderedMath, 0);
  assert.equal(result.mathFallback, "$\\htmlClass{bad}{x}$");
  assert.equal(result.executed, false);
  assert.deepEqual(remoteRequests, []);
});

test("QMD media compiler emits hosts only for known local records and leaves every unsafe destination request-free", async () => {
  const remoteRequests = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://example.test/")) remoteRequests.push(request.url());
  });
  await page.goto(`${baseURL}/tests/fixtures/portable-qmd-browser.html`);
  const result = await page.evaluate(async () => {
    const { compilePortableQmd } = await import("/src/static-content/qmd/compilePortableQmd.js");
    const source = [
      "![Ready](simex-media:ready){width=50% align=center flow=block frame=outline decorative=false}",
      "![Missing](simex-media:missing)",
      "![External](simex-media:external)",
      "![Unknown](simex-media:unknown)",
      "![HTTPS](https://example.test/map.png)",
      "![Data](data:image/png;base64,AAAA)",
      "![Blob](blob:https://example.test/id)",
      "![File](file:///tmp/map.png)",
      "![Malformed](simex-media:../bad)",
    ].join("\n\n");
    const mediaItems = {
      ready: { mediaId: "ready", current: { kind: "asset", assetId: "asset-ready" }, health: "ready" },
      missing: { mediaId: "missing", current: { kind: "asset", assetId: "asset-missing" }, health: "missing" },
      external: { mediaId: "external", current: { kind: "url", url: "https://example.test/external.png" }, health: "external" },
    };
    const compiled = compilePortableQmd(source, { panelId: "media-safety", mediaItems });
    const target = document.querySelector("#target");
    target.replaceChildren(compiled.fragment);
    return {
      hosts: [...target.querySelectorAll("[data-qmd-media-host]")].map((node) => ({
        key: node.dataset.qmdMediaKey,
        mediaId: node.dataset.qmdMediaId,
        width: node.dataset.qmdMediaWidth,
      })),
      text: target.textContent,
      resources: target.querySelectorAll("img,source,picture,video,audio,object,embed").length,
      resourceAttributes: [...target.querySelectorAll("*")].flatMap((node) => [...node.attributes])
        .filter(({ name }) => ["src", "srcset", "poster"].includes(name)).length,
      authoredAuthority: target.querySelectorAll("[style],[onclick],[class~='hero']").length,
    };
  });
  await page.waitForTimeout(100);

  assert.deepEqual(result.hosts, [
    { key: "ready:1", mediaId: "ready", width: "50%" },
    { key: "missing:2", mediaId: "missing", width: "100%" },
  ]);
  for (const visible of ["External", "Unknown", "HTTPS", "Data", "Blob", "File", "Malformed"]) {
    assert.match(result.text, new RegExp(visible));
  }
  assert.equal(result.resources, 0);
  assert.equal(result.resourceAttributes, 0);
  assert.equal(result.authoredAuthority, 0);
  assert.deepEqual(remoteRequests, []);
});

test("safe DOM renderer preserves supported semantic Markdown without HTML parsing", async () => {
  await page.goto(`${baseURL}/tests/fixtures/portable-qmd-browser.html`);
  const result = await page.evaluate(async () => {
    const { compilePortableQmd } = await import("/src/static-content/qmd/compilePortableQmd.js");
    const source = [
      "# Situation",
      "",
      "## Detail",
      "",
      "[External](https://example.test) and [detail](#detail).",
      "",
      "| Facility | Ready |",
      "| --- | --- |",
      "| North | Yes |",
      "",
      "::: {.callout-note}",
      "A note with `inline code`.",
      ":::",
      "",
      "```js",
      "const inert = true;",
      "```",
      "",
      "Math $x^2$.[^proof]",
      "",
      "[^proof]: Reviewed locally.",
    ].join("\n");
    const compiled = compilePortableQmd(source, { panelId: "situation-panel", hostHeadingLevel: 2 });
    const target = document.querySelector("#target");
    target.replaceChildren(compiled.fragment);
    const external = target.querySelector('a[href^="https://example.test"]');
    return {
      ok: compiled.ok,
      heading3: target.querySelector("h3")?.id,
      heading4: target.querySelector("h4")?.id,
      internal: target.querySelector('a[href="#situation-panel-detail"]')?.getAttribute("href"),
      external: external && { href: external.getAttribute("href"), target: external.target, rel: external.rel },
      tableRegion: target.querySelector(".portable-qmd-table-scroll")?.getAttribute("aria-label"),
      headerScope: target.querySelector("th")?.scope,
      callout: target.querySelector(".portable-qmd-callout")?.dataset.calloutType,
      code: target.querySelector("pre code")?.textContent,
      math: target.querySelector(".portable-qmd-math")?.getAttribute("role"),
      footnotes: target.querySelector(".portable-qmd-footnotes")?.getAttribute("aria-label"),
      forbidden: target.querySelectorAll("script,iframe,img,svg,math,object,embed,link,style").length,
    };
  });

  assert.deepEqual(result, {
    ok: true,
    heading3: "situation-panel-situation",
    heading4: "situation-panel-detail",
    internal: "#situation-panel-detail",
    external: { href: "https://example.test", target: "_blank", rel: "noopener noreferrer" },
    tableRegion: "Table: Facility, Ready; horizontal scrolling",
    headerScope: "col",
    callout: "note",
    code: "const inert = true;",
    math: "math",
    footnotes: "Footnotes",
    forbidden: 0,
  });
});

test("trusted underline rendering creates semantic u and never an authored underline element", async () => {
  await page.goto(`${baseURL}/tests/fixtures/portable-qmd-browser.html`);
  const result = await page.evaluate(async () => {
    const { compilePortableQmd } = await import("/src/static-content/qmd/compilePortableQmd.js");
    const target = document.querySelector("#target");
    target.replaceChildren(compilePortableQmd("Text with ++semantic underline++.", { panelId: "underline" }).fragment);
    return {
      underlines: [...target.querySelectorAll("u")].map((node) => node.textContent),
      invalid: target.querySelectorAll("underline").length,
    };
  });
  assert.deepEqual(result, { underlines: ["semantic underline"], invalid: 0 });
});

test("Lead and Caption directives render as one fixed semantic paragraph each", async () => {
  await page.goto(`${baseURL}/tests/fixtures/portable-qmd-browser.html`);
  const result = await page.evaluate(async () => {
    const { compilePortableQmd } = await import("/src/static-content/qmd/compilePortableQmd.js");
    const source = [
      "::: {.simex-text-lead}",
      "Lead copy.",
      ":::",
      "",
      "::: {.simex-text-caption}",
      "Caption copy.",
      ":::",
    ].join("\n");
    const target = document.querySelector("#target");
    target.replaceChildren(compilePortableQmd(source, { panelId: "semantic-text" }).fragment);
    return {
      lead: [...target.querySelectorAll("p.portable-qmd-lead")].map((node) => ({ text: node.textContent, nested: node.querySelectorAll("p").length })),
      caption: [...target.querySelectorAll("p.portable-qmd-caption")].map((node) => ({ text: node.textContent, nested: node.querySelectorAll("p").length })),
      totalParagraphs: target.querySelectorAll("p").length,
    };
  });
  assert.deepEqual(result, {
    lead: [{ text: "Lead copy.", nested: 0 }],
    caption: [{ text: "Caption copy.", nested: 0 }],
    totalParagraphs: 2,
  });
});

test("repeated footnotes keep unique occurrence links while missing definitions remain visible text", async () => {
  await page.goto(`${baseURL}/tests/fixtures/portable-qmd-browser.html`);
  const result = await page.evaluate(async () => {
    const { compilePortableQmd } = await import("/src/static-content/qmd/compilePortableQmd.js");
    const compiled = compilePortableQmd(
      "First.[^proof]\n\nSecond.[^proof]\n\nMissing.[^absent]\n\n[^proof]: Reviewed twice.",
      { panelId: "field-guide" },
    );
    const target = document.querySelector("#target");
    target.replaceChildren(compiled.fragment);
    return {
      ok: compiled.ok,
      refs: [...target.querySelectorAll(".portable-qmd-footnote-ref a")].map((node) => node.id),
      backlinks: [...target.querySelectorAll(".portable-qmd-footnote-backlink")].map((node) => node.getAttribute("href")),
      missingVisible: target.textContent.includes("[^absent]"),
      definitionCount: target.querySelectorAll("#field-guide-footnote-proof").length,
    };
  });

  assert.deepEqual(result, {
    ok: true,
    refs: ["field-guide-footnote-ref-proof-1", "field-guide-footnote-ref-proof-2"],
    backlinks: ["#field-guide-footnote-ref-proof-1", "#field-guide-footnote-ref-proof-2"],
    missingVisible: true,
    definitionCount: 1,
  });
});

test("rendered DOM budget accepts exactly 5000 actual nodes and rejects 5001", async () => {
  await page.goto(`${baseURL}/tests/fixtures/portable-qmd-browser.html`);
  const result = await page.evaluate(async () => {
    const { compilePortableQmd } = await import("/src/static-content/qmd/compilePortableQmd.js");
    const paragraphs = Array.from({ length: 2_499 }, () => "x");
    const exact = compilePortableQmd([...paragraphs, "---", "---"].join("\n\n"), { panelId: "node-budget" });
    const oneOver = compilePortableQmd([...paragraphs, "---", "---", "---"].join("\n\n"), { panelId: "node-budget" });
    return {
      exact: { ok: exact.ok, renderedNodes: exact.stats.renderedNodes },
      oneOver: {
        ok: oneOver.ok,
        rule: oneOver.errors[0]?.rule,
        renderedNodes: oneOver.stats.renderedNodes,
      },
    };
  });

  assert.deepEqual(result, {
    exact: { ok: true, renderedNodes: 5_000 },
    oneOver: { ok: false, rule: "rendered-nodes", renderedNodes: 5_001 },
  });
});

test("one restricted math token cannot expand past the actual rendered DOM budget", async () => {
  await page.goto(`${baseURL}/tests/fixtures/portable-qmd-browser.html`);
  const result = await page.evaluate(async () => {
    const { compilePortableQmd } = await import("/src/static-content/qmd/compilePortableQmd.js");
    const source = `$${"\\frac{x}{x}".repeat(220)}$`;
    const compiled = compilePortableQmd(source, { panelId: "math-budget" });
    return {
      ok: compiled.ok,
      parsedTokens: compiled.stats.parsedTokens,
      rule: compiled.errors[0]?.rule,
      actual: compiled.stats.renderedNodes,
    };
  });

  assert.equal(result.ok, false, JSON.stringify(result));
  assert.ok(result.parsedTokens < 5_000, JSON.stringify(result));
  assert.equal(result.rule, "rendered-nodes");
  assert.ok(result.actual > 5_000, JSON.stringify(result));
});

test("trusted restricted math keeps accessible superscript, fraction, root, and sum geometry", async () => {
  await page.goto(`${baseURL}/tests/fixtures/portable-qmd-browser.html`);
  const result = await page.evaluate(async () => {
    const { compilePortableQmd } = await import("/src/static-content/qmd/compilePortableQmd.js");
    const compiled = compilePortableQmd(
      "Superscript $x^2$, fraction $\\frac{a}{b}$, root $\\sqrt{x}$, and sum $\\sum_{i=1}^{n} i$.",
      { panelId: "math-structure" },
    );
    const target = document.querySelector("#target");
    target.replaceChildren(compiled.fragment);
    const expressions = [...target.querySelectorAll(".portable-qmd-math")];
    const negativeTop = (node) => [...node.querySelectorAll('[style*="top:"]')]
      .some((element) => Number.parseFloat(getComputedStyle(element).top) < 0);
    return {
      ok: compiled.ok,
      labels: expressions.map((node) => ({ role: node.getAttribute("role"), label: node.getAttribute("aria-label") })),
      structures: [
        expressions[0]?.querySelector(".msupsub") !== null,
        expressions[1]?.querySelector(".mfrac .frac-line") !== null,
        expressions[2]?.querySelector(".sqrt .hide-tail") !== null,
        expressions[3]?.querySelector(".mop.op-symbol") !== null,
      ],
      visual: expressions.map((node) => {
        const rect = node.getBoundingClientRect();
        return { width: rect.width, height: rect.height, negativeTop: negativeTop(node) };
      }),
      generatedStylesOnly: [...target.querySelectorAll("[style]")]
        .every((node) => node.closest('[data-portable-qmd-generated="math"]') !== null),
      forbiddenForeign: target.querySelectorAll("math,style,link,img").length,
      trustedVectors: [...target.querySelectorAll("svg")].map((node) => ({
        generated: node.closest('[data-portable-qmd-generated="math"]') !== null,
        resourceAttributes: node.querySelectorAll("[href],[src],[xlink\\:href]").length
          + (node.matches("[href],[src],[xlink\\:href]") ? 1 : 0),
      })),
    };
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.labels, [
    { role: "math", label: "x^2" },
    { role: "math", label: "\\frac{a}{b}" },
    { role: "math", label: "\\sqrt{x}" },
    { role: "math", label: "\\sum_{i=1}^{n} i" },
  ]);
  assert.deepEqual(result.structures, [true, true, true, true]);
  assert.ok(result.visual.every(({ width, height, negativeTop }) => width > 0 && height > 0 && negativeTop), JSON.stringify(result));
  assert.equal(result.generatedStylesOnly, true);
  assert.equal(result.forbiddenForeign, 0);
  assert.ok(result.trustedVectors.length > 0, JSON.stringify(result));
  assert.ok(result.trustedVectors.every(({ generated, resourceAttributes }) => generated && resourceAttributes === 0));
});
