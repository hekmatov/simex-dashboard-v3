import assert from "node:assert/strict";
import test, { after } from "node:test";

import { chromium } from "@playwright/test";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), logLevel: "silent", server: { host: "127.0.0.1", port: 0 } });
await vite.listen();
const address = vite.httpServer.address();
const baseURL = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });

after(async () => {
  await browser.close();
  await vite.close();
});

test("HTML paste is centrally sanitized into safe visual-schema content", async () => {
  const page = await browser.newPage();
  const remoteRequests = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://unsafe.example/")) remoteRequests.push(request.url());
  });
  await page.goto(`${baseURL}/tests/fixtures/portable-qmd-browser.html`);
  const result = await page.evaluate(async () => {
    window.__pasteExecuted = false;
    const { sanitizePortableQmdHtmlPaste } = await import("/src/static-content/qmd/portableQmdHtmlPaste.js");
    const { serializePortableQmdEditorDocument } = await import("/src/static-content/qmd/portableQmdEditorDocument.js");
    const paste = sanitizePortableQmdHtmlPaste([
      '<p class="hero" style="color:red" onclick="window.__pasteExecuted=true">Visible <strong>bold</strong> <em>italic</em> <u>under</u>.</p>',
      '<p><a href="https://example.test/guide">Safe</a> <a href="javascript:window.__pasteExecuted=true">Unsafe text</a></p>',
      '<ul><li>One</li></ul><ol><li>Two</li></ol>',
      '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>B</td></tr></tbody></table>',
      '<img src="https://unsafe.example/image.png" alt="Remote image">',
      '<img src="data:image/png;base64,AAAA" alt="Data image">',
      '<iframe src="https://unsafe.example/frame"></iframe><form><input value="secret"></form>',
      '<script>window.__pasteExecuted=true</script><unknown-tag>Kept visible</unknown-tag>',
    ].join(""));
    const serialized = serializePortableQmdEditorDocument(paste.document);
    return {
      document: paste.document,
      removed: paste.removed,
      source: serialized.source,
      ok: serialized.ok,
      executed: window.__pasteExecuted,
    };
  });
  await page.waitForTimeout(100);
  await page.close();

  assert.equal(result.ok, true);
  assert.match(result.source, /Visible \*\*bold\*\* \*italic\* \+\+under\+\+/);
  assert.match(result.source, /\[Safe\]\(https:\/\/example\.test\/guide\)/);
  assert.match(result.source, /Unsafe text/);
  assert.doesNotMatch(result.source, /javascript:|<script|<iframe|<form|style=|class=|onclick=|simex-media:|data:image/i);
  assert.match(result.source, /Kept visible/);
  assert.ok(result.removed.length > 0);
  assert.equal(result.executed, false);
  assert.deepEqual(remoteRequests, []);
});
