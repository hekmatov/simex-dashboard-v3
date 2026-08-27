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
const canonicalContentModule = await vite
  .ssrLoadModule("/src/home/canonicalHomeContent.js")
  .catch(() => null);
const canonicalWorkspaceModule = await vite
  .ssrLoadModule("/src/components/home/CanonicalHomeWorkspace.jsx")
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
    faq: {
      heading: "Getting started with building",
      description: "Practical guidance for your first dashboard.",
      items: [{ question: "How do I add a chart?", answer: "Open Build and choose Add chart." }],
    },
    resources: {
      heading: "Project resources",
      description: "Learn more about SimEx.",
      repository: { label: "View the repository", destination: "https://github.com/hekmatov/simex-dashboard-v3" },
    },
  },
};
const pages = [page, { id: "biomedical" }];

test("landing component is available and requires a usable hero", () => {
  assert.equal(typeof landingModule?.default, "function");
  assert.equal(landingModule?.hasLandingPresentation(page), true);
  assert.equal(landingModule?.hasLandingPresentation({ pageType: "landing", landing: {} }), false);
  assert.equal(
    landingModule?.hasLandingPresentation({
      pageType: "landing",
      landing: { hero: { headline: { text: "Not a string" } } },
    }),
    false,
  );
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
  assert.match(html, /How SimEx works/);
  assert.match(html, /href="#tour"/);
  assert.match(html, /Open Biomedical/);
  assert.match(html, /src="\/demo\/assets\/preview.png"/);
  assert.match(html, /alt="Dashboard preview"/);
  assert.match(html, /Getting started with building/);
  assert.match(html, /<details>/);
  assert.match(html, /View the repository/);
  assert.doesNotMatch(html, /First-deliverable status/);
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

test("malformed optional collections are normalized without crashing", () => {
  const malformed = structuredClone(page);
  malformed.landing.proofPoints = [null, "not an item", {}, {
    title: "Valid proof",
    description: "Still rendered.",
  }];
  malformed.landing.capabilities = [null, { title: "Missing description" }];
  malformed.landing.domainRoutes = [
    null,
    { pageId: "biomedical" },
    malformed.landing.domainRoutes[0],
  ];
  malformed.landing.tourItems = [null, {}, "", "Use filters"];
  malformed.landing.faq.items = [null, { question: "Missing answer" }, malformed.landing.faq.items[0]];

  const html = renderToStaticMarkup(
    React.createElement(landingModule.default, {
      page: malformed,
      pages,
      onNavigate: () => {},
      baseUrl: "/",
    }),
  );

  assert.match(html, /Valid proof/);
  assert.match(html, /Open Biomedical/);
  assert.match(html, /Use filters/);
  assert.match(html, /How do I add a chart\?/);
  assert.doesNotMatch(html, /Missing answer/);
});

test("resources reject non-web repository URLs", () => {
  const invalid = structuredClone(page);
  invalid.landing.resources.repository.destination = "javascript:alert('not-a-link')";
  const html = renderToStaticMarkup(React.createElement(landingModule.default, {
    page: invalid, pages, onNavigate: () => {}, baseUrl: "/",
  }));
  assert.doesNotMatch(html, /showcase-resources/);
});

test("secondary anchor action is omitted unless its target section renders", () => {
  const partial = structuredClone(page);
  partial.landing.tourItems = [null, "", {}];

  const html = renderToStaticMarkup(
    React.createElement(landingModule.default, {
      page: partial,
      pages,
      onNavigate: () => {},
      baseUrl: "/",
    }),
  );

  assert.doesNotMatch(html, /href="#tour"/);
  assert.doesNotMatch(html, /showcase-tour/);
});

test("canonical Home renders immutable source content without consuming a package Page", () => {
  assert.equal(typeof canonicalWorkspaceModule?.default, "function");
  assert.equal(canonicalContentModule?.CANONICAL_HOME_CONTENT?.faq?.items?.length, 7);
  assert.equal(
    canonicalContentModule?.CANONICAL_HOME_CONTENT?.resources?.repository?.destination,
    "https://github.com/hekmatov/simex-dashboard-v3",
  );
  assert.deepEqual(
    canonicalContentModule?.CANONICAL_HOME_CONTENT?.capabilities?.map(({ title }) => title),
    ["View", "Build", "Present"],
  );
  assert.equal(Object.isFrozen(canonicalContentModule?.CANONICAL_HOME_CONTENT), true);

  const html = canonicalWorkspaceModule?.default
    ? renderToStaticMarkup(React.createElement(canonicalWorkspaceModule.default, {
      dashboard: { pages: [{ id: "ordinary-page", title: "Ordinary Page" }] },
      onModeRequest() {},
      focusRequestKey: 0,
      baseUrl: "/",
    }))
    : "";
  assert.match(html, /data-canonical-mode="home"/);
  assert.match(html, /tabindex="-1"/);
  assert.match(html, /Open the dashboard/);
  assert.match(html, /How do I add a chart\?/);
  assert.doesNotMatch(html, /data-canonical-page-id=/);
  assert.doesNotMatch(html, /ordinary-page|Ordinary Page/);
});

test("canonical Home primary action dispatches View instead of a package Page id", () => {
  const requests = [];
  const action = landingModule?.resolveLandingPrimaryAction({
    landing: canonicalContentModule?.CANONICAL_HOME_CONTENT,
    onModeRequest: (mode) => requests.push(mode),
  });
  assert.equal(action?.label, "Open the dashboard");
  action?.activate();
  assert.deepEqual(requests, ["view"]);
});
