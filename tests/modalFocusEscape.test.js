import assert from "node:assert/strict";
import test, { after } from "node:test";

import { chromium } from "@playwright/test";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  configFile: false,
  appType: "custom",
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 0 },
  plugins: [{
    name: "modal-focus-test-page",
    configureServer(server) {
      server.middlewares.use("/modal-focus-test", (_request, response) => {
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/html");
        response.end('<!doctype html><html><body><main id="root"></main></body></html>');
      });
    },
  }],
});
await vite.listen();
const address = vite.httpServer.address();
const baseURL = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch();

after(async () => {
  await browser.close();
  await vite.close();
});

test("a nested control consumes Escape before the topmost dialog dismisses", async () => {
  const page = await browser.newPage();
  await page.goto(`${baseURL}/modal-focus-test`);
  await page.evaluate(async () => {
    const React = (await import("/@id/react")).default;
    const reactDomModule = await import("/@id/react-dom/client");
    const ReactDOMClient = reactDomModule.default ?? reactDomModule;
    const ModalFocusScope = (await import("/src/components/common/ModalFocusScope.jsx")).default;

    function Harness() {
      const [outerOpen, setOuterOpen] = React.useState(true);
      const [innerOpen, setInnerOpen] = React.useState(false);
      const [menuOpen, setMenuOpen] = React.useState(true);
      return outerOpen && React.createElement(
        ModalFocusScope,
        { "data-dialog": "outer", onEscape: () => setOuterOpen(false) },
        React.createElement("button", {
          type: "button",
          onClick: () => setInnerOpen(true),
        }, "Open inner"),
        innerOpen && React.createElement(
          ModalFocusScope,
          { "data-dialog": "inner", onEscape: () => setInnerOpen(false) },
          React.createElement("button", {
            type: "button",
            "aria-expanded": menuOpen,
            onKeyDown(event) {
              if (event.key !== "Escape" || !menuOpen) return;
              event.preventDefault();
              setMenuOpen(false);
            },
          }, "Transient menu"),
        ),
      );
    }

    ReactDOMClient.createRoot(document.querySelector("#root")).render(React.createElement(Harness));
  });

  await page.getByRole("button", { name: "Open inner" }).click();
  const trigger = page.getByRole("button", { name: "Transient menu" });
  await trigger.focus();
  await page.keyboard.press("Escape");
  await page.evaluate(() => new Promise(requestAnimationFrame));

  assert.equal(await page.locator('[data-dialog="inner"]').count(), 1);
  assert.equal(await page.locator('[data-dialog="outer"]').count(), 1);
  assert.equal(await trigger.getAttribute("aria-expanded"), "false");

  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector('[data-dialog="inner"]'));

  assert.equal(await page.locator('[data-dialog="outer"]').count(), 1);
  await page.close();
});

test("document-owned transients consume Escape before their dialog dismisses", async () => {
  const page = await browser.newPage();
  await page.goto(`${baseURL}/modal-focus-test`);
  await page.evaluate(async () => {
    const React = (await import("/@id/react")).default;
    const reactDomModule = await import("/@id/react-dom/client");
    const ReactDOMClient = reactDomModule.default ?? reactDomModule;
    const ModalFocusScope = (await import("/src/components/common/ModalFocusScope.jsx")).default;
    const ColorField = (await import("/src/components/ColorField.jsx")).default;
    const ChartPanelActions = (await import("/src/components/charts/ChartPanelActions.jsx")).default;
    const BuildPageNavigation = (await import("/src/components/build/BuildPageNavigation.jsx")).default;

    function Harness() {
      const [open, setOpen] = React.useState(true);
      return open && React.createElement(
        ModalFocusScope,
        { "data-dialog": "color-editor", onEscape: () => setOpen(false) },
        React.createElement(ColorField, {
          id: "panel-background",
          label: "Panel background",
          value: "#FFFFFF",
          onChange() {},
        }),
        React.createElement(ChartPanelActions, {
          chartId: "chart-1",
          chartTitle: "Response chart",
          sourceId: "response-source",
          source: { kind: "inline", rows: [] },
          citation: "Exercise data",
          showFullscreen: false,
        }),
        React.createElement(BuildPageNavigation, {
          dashboard: {
            pages: [{ id: "overview", label: "Overview", landing: true, sections: [] }],
          },
          activePageId: "overview",
          onSelectPage() {},
        }),
      );
    }

    ReactDOMClient.createRoot(document.querySelector("#root")).render(React.createElement(Harness));
  });

  await page.getByRole("button", { name: "Open Panel background color options" }).click();
  await page.getByRole("dialog", { name: "Panel background color options" }).waitFor();
  await page.keyboard.press("Escape");
  await page.evaluate(() => new Promise(requestAnimationFrame));

  assert.equal(await page.getByRole("dialog", { name: "Panel background color options" }).count(), 0);
  assert.equal(await page.locator('[data-dialog="color-editor"]').count(), 1);

  await page.getByRole("button", { name: "Show chart details" }).click();
  await page.locator(".chart-source-popover").waitFor();
  await page.keyboard.press("Escape");
  await page.evaluate(() => new Promise(requestAnimationFrame));

  assert.equal(await page.locator(".chart-source-popover").count(), 0);
  assert.equal(await page.locator('[data-dialog="color-editor"]').count(), 1);

  await page.getByRole("button", { name: "Overview" }).click();
  await page.getByRole("group", { name: "Overview Page actions" }).waitFor();
  await page.keyboard.press("Escape");
  await page.evaluate(() => new Promise(requestAnimationFrame));

  assert.equal(await page.getByRole("group", { name: "Overview Page actions" }).count(), 0);
  assert.equal(await page.locator('[data-dialog="color-editor"]').count(), 1);

  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector('[data-dialog="color-editor"]'));
  await page.close();
});
