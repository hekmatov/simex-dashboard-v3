import assert from "node:assert/strict";
import test from "node:test";

import { compilePortableQmd } from "../src/static-content/qmd/compilePortableQmd.js";
import { parsePortableQmd } from "../src/static-content/qmd/parsePortableQmd.js";
import {
  annotatePortableMediaTokens,
  extractPortableMediaNodes,
  parsePortableMediaReference,
  parsePortableQmdWithMedia,
  serializePortableMediaReference,
  validatePortableMediaAttributes,
} from "../src/static-content/qmd/portableQmdMedia.js";

test("serializer requires a local identity and contextual alt while decorative output has empty alt", () => {
  assert.throws(() => serializePortableMediaReference({ alt: "Map" }), /media id/i);
  assert.throws(() => serializePortableMediaReference({ mediaId: "map", alt: "" }), /alt/i);
  assert.equal(serializePortableMediaReference({
    mediaId: "response-map",
    alt: "Response map",
    width: "50%",
    align: "center",
    flow: "block",
    frame: "outline",
    caption: "Current response",
    decorative: false,
  }), '![Response map](simex-media:response-map){width=50% align=center flow=block frame=outline caption="Current response" decorative=false}');
  assert.equal(serializePortableMediaReference({
    mediaId: "decorative-rule",
    alt: "Ignored authored value",
    decorative: true,
  }).startsWith("![](simex-media:decorative-rule)"), true);
});

test("reference and attribute grammar accepts only the portable local allowlist", () => {
  assert.deepEqual(parsePortableMediaReference("simex-media:stored-map"), { mediaId: "stored-map" });
  for (const destination of [
    "https://example.test/map.png",
    "data:image/png;base64,AAAA",
    "blob:https://example.test/id",
    "file:///tmp/map.png",
    "simex-media:",
    "simex-media:../map",
  ]) assert.equal(parsePortableMediaReference(destination), null);

  assert.deepEqual(validatePortableMediaAttributes('{width=33% align=end flow=wrap-start frame=card caption="Map" decorative=false}'), {
    ok: true,
    attributes: {
      width: "33%",
      align: "end",
      flow: "wrap-start",
      frame: "card",
      caption: "Map",
      decorative: false,
    },
  });
  for (const suffix of [
    "{width=9%}",
    "{width=101%}",
    "{width=20.5%}",
    "{width=320px}",
    "{width=50% width=66%}",
    "{class=hero}",
    "{style=\"position:absolute\"}",
    "{onclick=alert(1)}",
  ]) assert.equal(validatePortableMediaAttributes(suffix).ok, false);

  for (const width of ["25%", "33%", "50%", "66%", "75%", "100%", "10%", "37%"]) {
    assert.equal(validatePortableMediaAttributes({ width }).attributes.width, width);
  }
});

test("one annotation pass consumes one fully allowlisted immediate suffix and preserves remaining text", () => {
  const source = 'Before ![Response map](simex-media:stored-map){width=50% align=center flow=block frame=outline caption="Current" decorative=false} after {width=25%}.';
  const rawPlacement = '![Response map](simex-media:stored-map){width=50% align=center flow=block frame=outline caption="Current" decorative=false}';
  const sourceStart = source.indexOf(rawPlacement);
  const parsed = parsePortableQmdWithMedia(source);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.ast.type, "root");
  assert.equal(parsed.ast.policy, parsePortableQmd(source).ast.policy);
  assert.equal(parsed.ast.source, source);
  assert.ok(Array.isArray(parsed.ast.tokens));
  assert.ok(Array.isArray(parsed.ast.footnotes));
  assert.deepEqual(parsed.ast.mediaNodes, [{
    tokenIndex: 1,
    mediaId: "stored-map",
    alt: "Response map",
    attributes: {
      width: "50%",
      align: "center",
      flow: "block",
      frame: "outline",
      caption: "Current",
      decorative: false,
    },
    sourceText: rawPlacement,
    sourceStart,
    sourceEnd: sourceStart + rawPlacement.length,
  }]);
  assert.deepEqual(parsed.ast.annotations, [{
    tokenIndex: 1,
    suffixTokenIndex: 2,
    sourceStart,
    sourceEnd: sourceStart + rawPlacement.length,
  }]);
  assert.equal(parsed.ast.tokens[1].children[1].meta.portableMediaSourceStart, sourceStart);
  assert.equal(parsed.ast.tokens[1].children[1].meta.portableMediaSourceEnd, sourceStart + rawPlacement.length);
  assert.equal(parsed.ast.tokens[1].children[2].content, " after {width=25%}.");

  const repeated = annotatePortableMediaTokens(parsed.ast);
  assert.deepEqual(repeated.mediaNodes, parsed.ast.mediaNodes);
  assert.equal(repeated.tokens[1].children[2].content, " after {width=25%}.");
});

test("annotation owns exact original spans across inert code, angle destinations, and duplicate real placements", () => {
  const inert = '`![Same](simex-media:same){width=25% align=start flow=block frame=none decorative=false}`';
  const first = '![Same](<simex-media:same>){width=33% align=center flow=block frame=outline decorative=false}';
  const second = '![Same](simex-media:same){width=66% align=end flow=wrap-start frame=card caption="Second" decorative=false}';
  const source = [inert, first, second].join("\n\n");
  const parsed = parsePortableQmdWithMedia(source);

  assert.equal(parsed.ast.mediaNodes.length, 2);
  assert.deepEqual(parsed.ast.mediaNodes.map(({ sourceText, sourceStart, sourceEnd }) => ({
    sourceText,
    sourceStart,
    sourceEnd,
    exactSlice: source.slice(sourceStart, sourceEnd),
  })), [first, second].map((sourceText) => {
    const sourceStart = source.indexOf(sourceText);
    return { sourceText, sourceStart, sourceEnd: sourceStart + sourceText.length, exactSlice: sourceText };
  }));
  assert.equal(parsed.ast.mediaNodes[0].sourceStart > source.indexOf(inert), true);
});

test("canonical image tokens own distinct raw spans for reference and inline local images", () => {
  const reference = '![Reference map][stored]{width=25% align=start flow=block frame=none decorative=false}';
  const firstInline = '![Inline map](simex-media:inline){width=33% align=center flow=block frame=outline decorative=false}';
  const secondInline = '![Inline map](simex-media:inline){width=66% align=end flow=wrap-start frame=card decorative=false}';
  const unresolved = '![Unresolved][absent]';
  const unsafe = '![Unsafe][remote]';
  const source = [
    reference,
    firstInline,
    secondInline,
    unresolved,
    unsafe,
    "[stored]: simex-media:stored",
    "[remote]: https://example.test/remote.png",
  ].join("\n\n");
  const parsed = parsePortableQmdWithMedia(source);

  assert.deepEqual(parsed.ast.mediaNodes.map(({ mediaId, sourceText, sourceStart, sourceEnd }) => ({
    mediaId,
    sourceText,
    sourceStart,
    sourceEnd,
    exactSlice: source.slice(sourceStart, sourceEnd),
  })), [
    { mediaId: "stored", sourceText: reference, sourceStart: 0, sourceEnd: reference.length, exactSlice: reference },
    {
      mediaId: "inline",
      sourceText: firstInline,
      sourceStart: reference.length + 2,
      sourceEnd: reference.length + 2 + firstInline.length,
      exactSlice: firstInline,
    },
    {
      mediaId: "inline",
      sourceText: secondInline,
      sourceStart: reference.length + 4 + firstInline.length,
      sourceEnd: reference.length + 4 + firstInline.length + secondInline.length,
      exactSlice: secondInline,
    },
  ]);
  assert.equal(parsed.ast.mediaNodes.some((node) => node.mediaId === "remote" || node.mediaId === "absent"), false);
});

test("annotation extends the parser-owned image span through one validated immediate suffix only", () => {
  const placement = '![Map](simex-media:map){width=50% align=center flow=block frame=none decorative=false}';
  const source = `${placement}{width=25%} tail`;
  const parsed = parsePortableQmdWithMedia(source);

  assert.equal(parsed.ast.mediaNodes[0].sourceText, placement);
  assert.equal(parsed.ast.mediaNodes[0].sourceStart, 0);
  assert.equal(parsed.ast.mediaNodes[0].sourceEnd, placement.length);
  assert.equal(parsed.ast.tokens[1].children[1].content, "{width=25%} tail");
  assert.equal(source.slice(parsed.ast.mediaNodes[0].sourceEnd), "{width=25%} tail");
});

test("invalid suffix stays visible while the local image keeps default token attributes", () => {
  const parsed = parsePortableQmdWithMedia("![Map](simex-media:stored-map){width=50% onclick=alert(1)} tail");
  assert.equal(parsed.ast.mediaNodes.length, 1);
  assert.equal(parsed.ast.annotations[0].suffixTokenIndex, null);
  assert.equal(parsed.ast.tokens[1].children[1].content, "{width=50% onclick=alert(1)} tail");
  assert.deepEqual(parsed.ast.mediaNodes[0].attributes, {
    width: "100%",
    align: "center",
    flow: "block",
    frame: "none",
    caption: "",
    decorative: false,
  });
});

test("wrapper preserves invalid parser diagnostics and compile never renders a null AST", () => {
  const source = "x".repeat(102_401);
  const primitive = parsePortableQmd(source);
  const parsed = parsePortableQmdWithMedia(source);
  assert.equal(parsed.ast, null);
  assert.deepEqual(parsed.errors, primitive.errors);
  assert.deepEqual(parsed.warnings, primitive.warnings);
  assert.equal(parsed.stats.sourceBytes, primitive.stats.sourceBytes);
  const compiled = compilePortableQmd(source);
  assert.equal(compiled.ok, false);
  assert.equal(compiled.fragment, null);
  assert.equal(compiled.errors[0].rule, "source-size");
  assert.equal(compiled.stats.sourceBytes, primitive.stats.sourceBytes);
});

test("dependency extraction reuses annotated nodes and keeps known local unhealthy identity", () => {
  const parsed = parsePortableQmdWithMedia([
    "![Ready](simex-media:ready)",
    "![Missing](simex-media:missing)",
    "![External](simex-media:external)",
    "![Unknown](simex-media:unknown)",
  ].join("\n\n"));
  const extracted = extractPortableMediaNodes(parsed.ast, { mediaItems: {
    ready: mediaItem("ready", { kind: "asset", assetId: "asset-ready" }, "ready"),
    missing: mediaItem("missing", { kind: "asset", assetId: "asset-missing" }, "missing"),
    external: mediaItem("external", { kind: "url", url: "https://example.test/map.png" }, "external"),
  } });
  assert.deepEqual(extracted.map(({ mediaId, renderable }) => ({ mediaId, renderable })), [
    { mediaId: "ready", renderable: true },
    { mediaId: "missing", renderable: false },
  ]);
});

function mediaItem(mediaId, current, health) {
  return {
    mediaId,
    revision: 1,
    current,
    displayName: mediaId,
    defaultDescription: mediaId,
    origin: current.kind === "url" ? "external" : "uploaded",
    health,
    dimensions: { width: 800, height: 400 },
    byteLength: 100,
    mediaType: "image/png",
  };
}
