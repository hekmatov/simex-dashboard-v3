import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const landingModule = await vite
  .ssrLoadModule("/src/components/LandingPage.jsx")
  .catch(() => null);
await vite.close();

const page = {
  id: "home",
  pageType: "landing",
  landing: {
    hero: {
      deliveryLabel: "First deliverable",
      headline: "Shared situational awareness",
      summary: "One environment.",
      primaryAction: { label: "Explore", pageId: "biomedical" },
      secondaryAction: { label: "What to try", anchorId: "tour" },
    },
    previewAsset: { src: "assets/preview.png", alt: "Dashboard preview" },
    proofPoints: [{ title: "Cross-domain", description: "One view." }],
    capabilities: [{ number: "01", title: "See", description: "Track change." }],
    domainRoutes: [{
      eyebrow: "Biomedical",
      title: "Follow pressure",
      description: "Explore indicators.",
      actionLabel: "Open Biomedical",
      pageId: "biomedical",
      tone: "biomedical",
    }],
    tourAnchorId: "tour",
    tourItems: ["Use filters"],
    deliveryStatus: [{ state: "ready", label: "Integration-ready", description: "Prepared." }],
  },
};
const pages = [page, { id: "biomedical" }];

test("landing component is available and requires a usable hero", () => {
  assert.equal(typeof landingModule?.default, "function");
  assert.equal(landingModule?.hasLandingPresentation(page), true);
  assert.equal(landingModule?.hasLandingPresentation({ pageType: "landing", landing: {} }), false);
});

test("landing renders semantic, configured content and valid actions", () => {
  const html = renderToStaticMarkup(
    React.createElement(landingModule.default, {
      page,
      pages,
      onNavigate: () => {},
      baseUrl: "/demo/",
    }),
  );
  assert.match(html, /<article[^>]+showcase-landing/);
  assert.match(html, /<h1[^>]*>Shared situational awareness<\/h1>/);
  assert.match(html, /href="#tour"/);
  assert.match(html, /Open Biomedical/);
  assert.match(html, /src="\/demo\/assets\/preview.png"/);
  assert.match(html, /alt="Dashboard preview"/);
});

test("invalid page targets and absent optional sections are omitted", () => {
  const invalid = structuredClone(page);
  invalid.landing.domainRoutes[0].pageId = "missing";
  delete invalid.landing.previewAsset;
  delete invalid.landing.proofPoints;
  const html = renderToStaticMarkup(
    React.createElement(landingModule.default, {
      page: invalid,
      pages,
      onNavigate: () => {},
      baseUrl: "/",
    }),
  );
  assert.doesNotMatch(html, /Open Biomedical/);
  assert.doesNotMatch(html, /showcase-landing-preview/);
  assert.doesNotMatch(html, /showcase-proof-grid/);
  assert.match(html, /Shared situational awareness/);
});
