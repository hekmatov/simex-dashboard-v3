import { parsePortableQmd } from "./parsePortableQmd.js";
import { PORTABLE_QMD_POLICY } from "./portableQmdPolicy.js";
import { renderPortableQmd } from "./renderPortableQmd.js";

export class PortableQmdRenderedNodeLimitError extends Error {
  constructor(actual) {
    const limit = PORTABLE_QMD_POLICY.limits.renderedNodes;
    super(`Portable QMD renders ${actual} DOM nodes; the limit is ${limit}.`);
    this.name = "PortableQmdRenderedNodeLimitError";
    this.rule = "rendered-nodes";
    this.actual = actual;
    this.limit = limit;
    this.guidance = "Split the content across panels or simplify generated math, lists, and tables.";
    this.location = Object.freeze({ line: 1, column: 1 });
  }
}

export function compilePortableQmd(source, options = {}) {
  const parsed = parsePortableQmd(source);
  if (!parsed.ok) {
    return Object.freeze({
      ok: false,
      fragment: null,
      errors: parsed.errors,
      warnings: parsed.warnings,
      stats: parsed.stats,
    });
  }

  try {
    const fragment = renderPortableQmd(parsed.ast, options);
    const renderedNodes = countPortableQmdFragmentNodes(fragment, options);
    if (renderedNodes > PORTABLE_QMD_POLICY.limits.renderedNodes) {
      throw new PortableQmdRenderedNodeLimitError(renderedNodes);
    }
    return Object.freeze({
      ok: true,
      fragment,
      errors: Object.freeze([]),
      warnings: parsed.warnings,
      stats: Object.freeze({ ...parsed.stats, renderedNodes }),
    });
  } catch (error) {
    if (!(error instanceof PortableQmdRenderedNodeLimitError)) throw error;
    return Object.freeze({
      ok: false,
      fragment: null,
      errors: Object.freeze([Object.freeze({
        rule: error.rule,
        message: error.message,
        guidance: error.guidance,
        location: error.location,
      })]),
      warnings: parsed.warnings,
      stats: Object.freeze({ ...parsed.stats, renderedNodes: error.actual }),
    });
  }
}

export function countPortableQmdFragmentNodes(fragment, options = {}) {
  const document = options.document ?? options.window?.document ?? fragment?.ownerDocument ?? globalThis.document;
  const NodeFilter = options.window?.NodeFilter ?? document?.defaultView?.NodeFilter ?? globalThis.NodeFilter;
  if (!fragment || !document?.createTreeWalker || !NodeFilter) {
    throw new TypeError("A browser DOM fragment is required.");
  }
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ALL);
  let count = 0;
  while (walker.nextNode()) count += 1;
  return count;
}
