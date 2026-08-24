import assert from "node:assert/strict";
import test, { after } from "node:test";

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
const browser = await chromium.launch();

after(async () => {
  await browser.close();
  await vite.close();
});

test("HTML-only sanitizer returns a fragment with no forbidden elements, attributes, resources, or URI bypasses", async () => {
  const page = await browser.newPage();
  await page.goto(`${baseURL}/tests/fixtures/portable-qmd-browser.html`);
  const result = await page.evaluate(async () => {
    const { sanitizePortableHtml } = await import("/src/static-content/qmd/sanitizePortableHtml.js");
    const fragment = sanitizePortableHtml(`
      <p id="other-panel-id" class="attacker" style="color:red" onclick="alert(1)">
        Safe <a href="javascript%3Aalert(1)" target="_blank">unsafe link</a>
      </p>
      <script>window.__qmdExecuted = true</script>
      <iframe src="https://example.test/frame"></iframe>
      <img src="https://example.test/tracker.png" onerror="alert(2)">
      <svg><a href="javascript:alert(3)"><text>foreign</text></a></svg>
      <math><mi>x</mi></math>
      <custom-widget data-src="https://example.test/widget.js"></custom-widget>
      <span class="portable-qmd-math katex" data-portable-qmd-generated="math"><span style="color:red;position:fixed">spoofed math</span></span>
    `, { panelId: "safe-panel" });
    const target = document.querySelector("#target");
    target.replaceChildren(fragment);
    const first = target.innerHTML;
    await Promise.resolve();
    return {
      nodeType: fragment.nodeType,
      first,
      second: target.innerHTML,
      forbiddenElements: target.querySelectorAll("script,iframe,img,svg,math,custom-widget,object,embed,video,audio,link,style").length,
      forbiddenAttributes: target.querySelectorAll("[style],[onclick],[onerror],[src],[data-src]").length,
      unsafeHref: target.querySelector("a")?.getAttribute("href") ?? null,
      executed: window.__qmdExecuted === true,
    };
  });
  await page.close();

  assert.equal(result.nodeType, 11);
  assert.equal(result.forbiddenElements, 0, JSON.stringify(result));
  assert.equal(result.forbiddenAttributes, 0);
  assert.equal(result.unsafeHref, null);
  assert.equal(result.executed, false);
  assert.equal(result.second, result.first);
  assert.doesNotMatch(result.first, /other-panel-id|attacker|javascript|example\.test/);
});

test("the real parse-render-sanitize pipeline mounts only the canonical sanitized fragment", async () => {
  const page = await browser.newPage();
  await page.goto(`${baseURL}/tests/fixtures/portable-qmd-browser.html`);
  const result = await page.evaluate(async () => {
    const [{ parsePortableQmd }, { renderPortableQmd }, { sanitizePortableHtml }] = await Promise.all([
      import("/src/static-content/qmd/parsePortableQmd.js"),
      import("/src/static-content/qmd/renderPortableQmd.js"),
      import("/src/static-content/qmd/sanitizePortableHtml.js"),
    ]);
    const parsed = parsePortableQmd("# Situation\n\n[Safe](https://example.test)\n\n`<script>` and math $x^2$.[^proof]\n\n[^proof]: Reviewed locally.");
    const rendered = renderPortableQmd(parsed.ast, { panelId: "safe-panel", hostHeadingLevel: 2 });
    const fragment = sanitizePortableHtml(rendered, { panelId: "safe-panel" });
    document.querySelector("#target").replaceChildren(fragment);
    return {
      ok: parsed.ok,
      heading: document.querySelector("h3")?.id,
      link: {
        href: document.querySelector("a")?.getAttribute("href"),
        target: document.querySelector("a")?.getAttribute("target"),
        rel: document.querySelector("a")?.getAttribute("rel"),
      },
      scripts: document.querySelector("#target").querySelectorAll("script").length,
      codeText: document.querySelector("#target code")?.textContent,
      math: {
        role: document.querySelector(".portable-qmd-math")?.getAttribute("role"),
        katex: document.querySelectorAll(".portable-qmd-math .katex").length,
        foreignMath: document.querySelectorAll("math,svg").length,
      },
      footnotes: document.querySelector('[aria-label="Footnotes"]')?.textContent,
    };
  });
  await page.close();

  assert.equal(result.ok, true);
  assert.equal(result.heading, "safe-panel-situation");
  assert.deepEqual(result.link, {
    href: "https://example.test",
    target: "_blank",
    rel: "noopener noreferrer",
  });
  assert.equal(result.scripts, 0);
  assert.equal(result.codeText, "<script>");
  assert.deepEqual(result.math, { role: "math", katex: 1, foreignMath: 0 });
  assert.match(result.footnotes, /Reviewed locally/);
});

test("sanitized fragment node budget accepts exactly 5000 actual nodes and rejects 5001", async () => {
  const page = await browser.newPage();
  await page.goto(`${baseURL}/tests/fixtures/portable-qmd-browser.html`);
  const result = await page.evaluate(async () => {
    const { sanitizePortableHtml } = await import("/src/static-content/qmd/sanitizePortableHtml.js");
    const countNodes = (fragment) => {
      const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ALL);
      let count = 0;
      while (walker.nextNode()) count += 1;
      return count;
    };
    const exact = sanitizePortableHtml("<span></span>".repeat(5_000), { panelId: "node-budget" });
    let oneOver;
    try {
      sanitizePortableHtml("<span></span>".repeat(5_001), { panelId: "node-budget" });
    } catch (error) {
      oneOver = { rule: error.rule, actual: error.actual, limit: error.limit };
    }
    return { exact: countNodes(exact), oneOver };
  });
  await page.close();

  assert.deepEqual(result, {
    exact: 5_000,
    oneOver: { rule: "rendered-nodes", actual: 5_001, limit: 5_000 },
  });
});

test("one restricted math token cannot expand past the actual sanitized node budget", async () => {
  const page = await browser.newPage();
  await page.goto(`${baseURL}/tests/fixtures/portable-qmd-browser.html`);
  const result = await page.evaluate(async () => {
    const [{ parsePortableQmd }, { renderPortableQmd }, { sanitizePortableHtml }] = await Promise.all([
      import("/src/static-content/qmd/parsePortableQmd.js"),
      import("/src/static-content/qmd/renderPortableQmd.js"),
      import("/src/static-content/qmd/sanitizePortableHtml.js"),
    ]);
    const source = `$${"\\frac{x}{x}".repeat(220)}$`;
    const parsed = parsePortableQmd(source);
    let limitError;
    try {
      sanitizePortableHtml(renderPortableQmd(parsed.ast, { panelId: "math-budget" }), { panelId: "math-budget" });
    } catch (error) {
      limitError = { rule: error.rule, actual: error.actual, limit: error.limit };
    }
    return { parsedOk: parsed.ok, parsedTokens: parsed.stats.parsedTokens, limitError };
  });
  await page.close();

  assert.equal(result.parsedOk, true);
  assert.ok(result.parsedTokens < 5_000, JSON.stringify(result));
  assert.equal(result.limitError?.rule, "rendered-nodes", JSON.stringify(result));
  assert.ok(result.limitError?.actual > 5_000, JSON.stringify(result));
  assert.equal(result.limitError?.limit, 5_000);
});

test("restricted HTML-only math retains generated geometry for superscript, fraction, root, and sum", async () => {
  const page = await browser.newPage();
  await page.goto(`${baseURL}/tests/fixtures/portable-qmd-browser.html`);
  const result = await page.evaluate(async () => {
    const [{ parsePortableQmd }, { renderPortableQmd }, { sanitizePortableHtml }] = await Promise.all([
      import("/src/static-content/qmd/parsePortableQmd.js"),
      import("/src/static-content/qmd/renderPortableQmd.js"),
      import("/src/static-content/qmd/sanitizePortableHtml.js"),
    ]);
    const parsed = parsePortableQmd("Superscript $x^2$, fraction $\\frac{a}{b}$, root $\\sqrt{x}$, and sum $\\sum_{i=1}^{n} i$.");
    const fragment = sanitizePortableHtml(renderPortableQmd(parsed.ast, { panelId: "math-structure" }), { panelId: "math-structure" });
    const target = document.querySelector("#target");
    target.replaceChildren(fragment);
    const expressions = [...target.querySelectorAll(".portable-qmd-math")];
    const negativeTop = (node) => [...node.querySelectorAll('[style*="top:"]')]
      .some((element) => Number.parseFloat(getComputedStyle(element).top) < 0);
    const computedNumber = (node, selector, property) => Number.parseFloat(
      getComputedStyle(node.querySelector(selector))[property],
    );
    return {
      parsedOk: parsed.ok,
      count: expressions.length,
      labels: expressions.map((node) => ({ role: node.getAttribute("role"), label: node.getAttribute("aria-label") })),
      structures: {
        superscript: expressions[0]?.querySelectorAll(".katex-base, .katex-strut, .msupsub").length,
        fraction: expressions[1]?.querySelectorAll(".mfrac, .frac-line").length,
        root: expressions[2]?.querySelectorAll(".sqrt, .svg-align, .hide-tail").length,
        sum: expressions[3]?.querySelectorAll(".mop.op-symbol, .msupsub").length,
      },
      visual: expressions.map((node) => {
        const rect = node.getBoundingClientRect();
        return { width: rect.width, height: rect.height, negativeTop: negativeTop(node) };
      }),
      visualSignals: {
        fractionLine: computedNumber(expressions[1], ".frac-line", "borderBottomWidth"),
        rootMinWidth: computedNumber(expressions[2], '[style*="min-width"]', "minWidth"),
        rootPadding: computedNumber(expressions[2], '[style*="padding-left"]', "paddingLeft"),
        sumWidth: expressions[3].querySelector(".mop.op-symbol").getBoundingClientRect().width,
      },
      generatedStyles: [...target.querySelectorAll("[style]")].map((node) => ({
        style: node.getAttribute("style"),
        generatedMath: node.closest('[data-portable-qmd-generated="math"]') !== null,
      })),
      foreign: target.querySelectorAll("math,svg,style,link,img").length,
    };
  });
  await page.close();

  assert.equal(result.parsedOk, true);
  assert.equal(result.count, 4);
  assert.deepEqual(result.labels, [
    { role: "math", label: "x^2" },
    { role: "math", label: "\\frac{a}{b}" },
    { role: "math", label: "\\sqrt{x}" },
    { role: "math", label: "\\sum_{i=1}^{n} i" },
  ]);
  assert.ok(result.structures.superscript >= 2, JSON.stringify(result));
  assert.ok(result.structures.fraction >= 2, JSON.stringify(result));
  assert.ok(result.structures.root >= 3, JSON.stringify(result));
  assert.ok(result.structures.sum >= 2, JSON.stringify(result));
  for (const visual of result.visual) {
    assert.ok(visual.width > 0 && visual.height > 0, JSON.stringify(result));
  }
  assert.equal(result.visual[0].negativeTop, true, JSON.stringify(result));
  assert.equal(result.visual[1].negativeTop, true, JSON.stringify(result));
  assert.equal(result.visual[3].negativeTop, true, JSON.stringify(result));
  assert.ok(result.visualSignals.fractionLine > 0, JSON.stringify(result));
  assert.ok(result.visualSignals.rootMinWidth > 0, JSON.stringify(result));
  assert.ok(result.visualSignals.rootPadding > 0, JSON.stringify(result));
  assert.ok(result.visualSignals.sumWidth > 0, JSON.stringify(result));
  assert.ok(result.generatedStyles.length > 0, JSON.stringify(result));
  assert.ok(result.generatedStyles.every(({ generatedMath }) => generatedMath), JSON.stringify(result));
  assert.equal(result.foreign, 0);
});
