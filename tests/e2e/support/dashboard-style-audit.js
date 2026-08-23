const RETIRED_DASHBOARD_COLORS = Object.freeze([
  "rgb(8, 34, 74)",
  "rgb(4, 59, 203)",
  "rgb(245, 248, 251)",
  "rgb(248, 251, 255)",
  "rgb(216, 226, 236)",
  "rgb(234, 241, 246)",
  "rgb(238, 244, 248)",
  "rgb(225, 233, 240)",
  "rgb(80, 106, 130)",
  "rgb(106, 127, 146)",
  "rgb(54, 81, 106)",
]);

/**
 * Audits every visible dashboard node, including body-level portals, generated
 * content, and SVG presentation paint. Canvas charts are covered by the live
 * ECharts presentation integration test because computed CSS cannot inspect
 * pixels painted into a canvas.
 */
export async function expectNoRetiredDashboardStyle(page) {
  const hits = await page.evaluate((retiredValues) => {
    const retired = new Set(retiredValues);
    const app = document.querySelector(".app-frame");
    if (!app) return [{ kind: "contract", detail: "Missing .app-frame" }];

    const rootStyle = getComputedStyle(app);
    const approvedFonts = new Set([
      "--simex-style-body-font",
      "--simex-style-heading-font",
      "--simex-style-data-font",
    ].map((variable) => {
      const probe = document.createElement("span");
      probe.style.fontFamily = `var(${variable})`;
      app.append(probe);
      const resolved = getComputedStyle(probe).fontFamily.toLowerCase();
      probe.remove();
      return resolved;
    }).filter(Boolean));
    const colorProperties = ["color", "backgroundColor", "fill", "stroke", "accentColor"];
    const compositeProperties = ["boxShadow", "textShadow", "backgroundImage"];
    const visible = (element, style) => {
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const describe = (element) => ({
      tag: element.tagName,
      id: element.id || undefined,
      className: typeof element.className === "string" ? element.className.slice(0, 120) : undefined,
      text: String(element.getAttribute("aria-label") || element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100),
    });
    const styleHits = (element, style, kind) => {
      const identity = describe(element);
      const paint = {};
      for (const property of colorProperties) {
        const unusedSvgPaint = (property === "fill" || property === "stroke") && style[property] === "none";
        if (!unusedSvgPaint && retired.has(style[property])) paint[property] = style[property];
      }
      for (const side of ["Top", "Right", "Bottom", "Left"]) {
        if (style[`border${side}Style`] !== "none"
          && Number.parseFloat(style[`border${side}Width`]) > 0
          && retired.has(style[`border${side}Color`])) {
          paint[`border${side}Color`] = style[`border${side}Color`];
        }
      }
      if (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0
        && retired.has(style.outlineColor)) paint.outlineColor = style.outlineColor;
      if (style.textDecorationLine !== "none" && retired.has(style.textDecorationColor)) {
        paint.textDecorationColor = style.textDecorationColor;
      }
      for (const property of compositeProperties) {
        for (const value of retired) {
          if (String(style[property]).includes(value)) paint[property] = style[property];
        }
      }
      const fontFamily = String(style.fontFamily || "").trim().toLowerCase();
      const userAgentColorControl = element instanceof HTMLInputElement && element.type === "color";
      if (!userAgentColorControl && fontFamily && approvedFonts.size > 0 && !approvedFonts.has(fontFamily)) {
        paint.fontFamily = style.fontFamily;
      }
      return Object.keys(paint).length ? [{ kind, ...identity, paint }] : [];
    };

    const dashboardNodes = [app, ...app.querySelectorAll("*")];
    const portalNodes = [...document.body.querySelectorAll('[role="tooltip"], [role="dialog"], [role="menu"], [data-dashboard-portal]')]
      .filter((node) => !app.contains(node));
    const nodes = [...new Set([...dashboardNodes, ...portalNodes])];
    const findings = [];
    for (const element of nodes) {
      const style = getComputedStyle(element);
      if (!visible(element, style) || element.classList.contains("visually-hidden")) continue;
      findings.push(...styleHits(element, style, "element"));
      for (const pseudo of ["::before", "::after"]) {
        const pseudoStyle = getComputedStyle(element, pseudo);
        if (pseudoStyle.content !== "none" && pseudoStyle.content !== "normal") {
          findings.push(...styleHits(element, pseudoStyle, pseudo));
        }
      }
      if (element instanceof SVGElement) {
        for (const attribute of ["fill", "stroke", "color"]) {
          const value = element.getAttribute(attribute);
          if (value && retired.has(value)) {
            findings.push({ kind: "svg-attribute", ...describe(element), paint: { [attribute]: value } });
          }
        }
      }
    }
    return findings;
  }, RETIRED_DASHBOARD_COLORS);

  if (hits.length) {
    throw new Error(`Retired dashboard style reached live UI:\n${JSON.stringify(hits, null, 2)}`);
  }
}
