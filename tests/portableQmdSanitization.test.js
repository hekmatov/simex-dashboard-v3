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
