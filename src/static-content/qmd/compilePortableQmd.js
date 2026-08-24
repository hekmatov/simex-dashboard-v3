import { parsePortableQmd } from "./parsePortableQmd.js";
import { renderPortableQmd } from "./renderPortableQmd.js";
import {
  countPortableQmdFragmentNodes,
  PortableQmdRenderedNodeLimitError,
  sanitizePortableHtml,
} from "./sanitizePortableHtml.js";

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
    const html = renderPortableQmd(parsed.ast, options);
    const fragment = sanitizePortableHtml(html, {
      panelId: options.panelId,
      window: options.window,
    });
    return Object.freeze({
      ok: true,
      fragment,
      errors: Object.freeze([]),
      warnings: parsed.warnings,
      stats: Object.freeze({
        ...parsed.stats,
        renderedNodes: countPortableQmdFragmentNodes(fragment, { window: options.window }),
      }),
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
