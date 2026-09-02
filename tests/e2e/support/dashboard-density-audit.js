const ROLE_HEIGHTS = Object.freeze({
  glyph: 16,
  utility: 24,
  compact: 28,
  standard: 32,
  prominent: 36,
  crown: 36,
});

const SPACING_SCALE = Object.freeze([2, 4, 8, 12, 16, 24, 32]);
const SIZE_TOLERANCE = 2;

export const DASHBOARD_DENSITY_CATEGORIES = Object.freeze([
  "role-size",
  "centreline",
  "rhythm",
  "wrap",
  "whitespace",
  "overlap",
  "clipping",
  "overflow",
  "repeated-title",
  "same-role-variance",
  "occupancy",
  "operational-contrast",
  "visible-semantics",
  "desktop-support-contract",
]);

export async function collectDashboardDensityEvidence(page, entry) {
  const snapshot = await page.evaluate(({ metadata, rootSelector, roleHeights }) => {
    const round = (value) => Math.round(value * 100) / 100;
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (!(style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || 1) > 0
        && rect.width > 0
        && rect.height > 0)) return false;
      let ancestor = element.parentElement;
      while (ancestor) {
        const ancestorStyle = getComputedStyle(ancestor);
        if (
          ancestor.hidden
          || ancestor.inert
          || ancestor.getAttribute("aria-hidden") === "true"
          ||
          ancestorStyle.display === "none"
          || ancestorStyle.visibility === "hidden"
          || Number(ancestorStyle.opacity || 1) <= 0
        ) return false;
        const bounds = ancestor.getBoundingClientRect();
        if (
          ["hidden", "clip"].includes(ancestorStyle.overflowX)
          && (rect.right <= bounds.left + 0.5 || rect.left >= bounds.right - 0.5)
        ) return false;
        if (
          ["hidden", "clip"].includes(ancestorStyle.overflowY)
          && (rect.bottom <= bounds.top + 0.5 || rect.top >= bounds.bottom - 0.5)
        ) return false;
        ancestor = ancestor.parentElement;
      }
      return true;
    };
    const paintedRect = (element) => {
      const source = element.getBoundingClientRect();
      const rect = {
        left: source.left,
        right: source.right,
        top: source.top,
        bottom: source.bottom,
      };
      let ancestor = element.parentElement;
      while (ancestor) {
        const style = getComputedStyle(ancestor);
        const bounds = ancestor.getBoundingClientRect();
        if (["hidden", "clip", "auto", "scroll"].includes(style.overflowX)) {
          rect.left = Math.max(rect.left, bounds.left);
          rect.right = Math.min(rect.right, bounds.right);
        }
        if (["hidden", "clip", "auto", "scroll"].includes(style.overflowY)) {
          rect.top = Math.max(rect.top, bounds.top);
          rect.bottom = Math.min(rect.bottom, bounds.bottom);
        }
        ancestor = ancestor.parentElement;
      }
      rect.width = Math.max(0, rect.right - rect.left);
      rect.height = Math.max(0, rect.bottom - rect.top);
      return rect;
    };
    const visuallyClipped = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const classes = String(element.className ?? "");
      if (/\b(?:visually-hidden|sr-only|screen-reader-only)\b/.test(classes)) return true;
      const clippedByPaint = style.clip !== "auto"
        || (style.clipPath !== "none" && style.clipPath !== "");
      const collapsedBox = rect.width <= 2 && rect.height <= 2;
      return collapsedBox
        && ["absolute", "fixed"].includes(style.position)
        && (clippedByPaint || ["hidden", "clip"].includes(style.overflow));
    };
    const root = [...document.querySelectorAll(rootSelector)].find(visible);
    if (!root) throw new Error(`Audit root is not visible: ${rootSelector}`);

    const rectOf = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: round(rect.x),
        y: round(rect.y),
        width: round(rect.width),
        height: round(rect.height),
        right: round(rect.right),
        bottom: round(rect.bottom),
      };
    };
    const textOf = (element) => String(element.innerText ?? element.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);
    const nodeId = (element, index = 0) => {
      if (element.id) return `#${element.id}`;
      const dataKey = [
        "dashboardMode",
        "panelId",
        "fieldId",
        "presentationControlId",
        "action",
        "authoringSurface",
      ].find((key) => element.dataset?.[key]);
      if (dataKey) return `[data-${dataKey.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}="${element.dataset[dataKey]}"]`;
      const classes = [...element.classList].slice(0, 2).join(".");
      return `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ""}:nth(${index})`;
    };
    const pixels = (value) => {
      const number = Number.parseFloat(value);
      return Number.isFinite(number) ? round(number) : null;
    };
    const controlRole = (element) => {
      const tag = element.tagName.toLowerCase();
      const type = String(element.getAttribute("type") ?? "").toLowerCase();
      const role = String(element.getAttribute("role") ?? "").toLowerCase();
      const classes = String(element.className ?? "");
      const text = textOf(element);
      const rect = element.getBoundingClientRect();
      const explicitRole = String(element.dataset.densityRole ?? "").toLowerCase();
      if (Object.hasOwn(roleHeights, explicitRole) || explicitRole === "content") return explicitRole;
      if (["checkbox", "radio"].includes(type) || ["checkbox", "radio"].includes(role)) return "glyph";
      if (
        tag === "textarea"
        || type === "range"
        || type === "file"
        || (tag === "select" && (element.multiple || Number(element.size) > 1))
      ) return "content";
      if (
        tag === "a"
        && !["button", "menuitem", "tab"].includes(role)
        && !/button|control|action|secondary|primary|danger/.test(classes)
      ) return "content";
      const childRects = [...element.children]
        .filter(visible)
        .map((child) => child.getBoundingClientRect());
      const childBands = [];
      for (const childRect of childRects) {
        const band = childBands.find((candidate) => (
          Math.min(candidate.bottom, childRect.bottom) - Math.max(candidate.top, childRect.top) > 1
        ));
        if (band) {
          band.top = Math.min(band.top, childRect.top);
          band.bottom = Math.max(band.bottom, childRect.bottom);
        } else {
          childBands.push({ top: childRect.top, bottom: childRect.bottom });
        }
      }
      const nestedControls = element.querySelector([
        "button",
        "input:not([type='hidden'])",
        "select",
        "textarea",
        "[role='button']",
      ].join(","));
      if (
        tag === "button"
        && (
          element.dataset.action === "open-content"
          || /content-card|card-button|choice-card|dashboard-card|tile-button|chart-type-card/.test(classes)
          || Boolean(nestedControls)
          || (rect.height > 48 && childBands.length > 1)
        )
      ) return "content";
      if (tag === "button" && /(?:^|[-_])(?:breadcrumb|repair-link|link-button)(?:$|[-_])/.test(classes)) {
        return "content";
      }
      if (
        ["menuitem", "option", "tab"].includes(role)
        || /menu-row|choice-row|compact-action/.test(classes)
      ) return "compact";
      if (
        /prominent|destructive|danger|primary-action/.test(classes)
        || (tag === "button" && /^(delete|discard|clear|save changes|create chart|load package)$/i.test(text))
      ) return "prominent";
      if (
        tag === "button"
        && element.closest(".settings-color-popover")
        && rect.height > roleHeights.prominent + 2
      ) return "content";
      if (
        tag === "button"
        && element.closest(".portable-qmd-composer__toolbar")
      ) return "utility";
      if (
        /simex-icon-control|icon-button|close-button|__close/.test(classes)
        || (tag === "button" && text.length === 0)
      ) return "utility";
      if (
        tag === "button"
        && element.closest([
          "[data-right-side-drawer]",
          ".right-side-drawer",
          ".look-drawer",
          ".dashboard-map-panel",
          ".source-content-workspace",
        ].join(","))
      ) return "compact";
      return "standard";
    };
    const styleRecord = (element) => {
      const style = getComputedStyle(element);
      return {
        display: style.display,
        position: style.position,
        fontSize: pixels(style.fontSize),
        lineHeight: pixels(style.lineHeight),
        minHeight: pixels(style.minHeight),
        padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].map(pixels),
        gap: pixels(style.gap),
        rowGap: pixels(style.rowGap),
        columnGap: pixels(style.columnGap),
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        flexWrap: style.flexWrap,
      };
    };
    const traversalQueries = [];
    const descendants = (selector, limit = Infinity) => {
      const matched = [...root.querySelectorAll(selector)].filter(visible);
      const captured = matched.slice(0, limit);
      traversalQueries.push({
        selector,
        matched: matched.length,
        captured: captured.length,
        truncated: captured.length < matched.length,
      });
      return captured;
    };

    const controlNodes = descendants([
      "button",
      "input:not([type='hidden'])",
      "select",
      "textarea",
      "a[href]",
      "[role='button']",
      "[role='menuitem']",
      "[role='option']",
      "[role='tab']",
      "[role='switch']",
      "[role='checkbox']",
      "[role='radio']",
      "[role='combobox']",
    ].join(","), 500);
    const controls = controlNodes.map((element, index) => {
      const role = controlRole(element);
      return {
        id: nodeId(element, index),
        tag: element.tagName.toLowerCase(),
        type: element.getAttribute("type") ?? null,
        text: textOf(element),
        role,
        expectedHeight: roleHeights[role] ?? null,
        rect: rectOf(element),
        style: styleRecord(element),
      };
    });
    const crownRows = descendants([
      ".command-crown-mode-row",
      ".dashboard-identity-row",
      ".build-page-navigation",
    ].join(","), 20);
    controls.push(...crownRows.map((element, index) => ({
      id: `${nodeId(element, index)}:row`,
      tag: element.tagName.toLowerCase(),
      type: null,
      text: textOf(element),
      role: "crown",
      expectedHeight: roleHeights.crown,
      rect: rectOf(element),
      style: styleRecord(element),
    })));

    const textLineGeometry = (label) => {
      const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => node.textContent.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
      });
      const rects = [];
      let node = walker.nextNode();
      while (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        rects.push(...range.getClientRects());
        node = walker.nextNode();
      }
      if (!rects.length) return { first: label.getBoundingClientRect(), lineCount: 0 };
      rects.sort((left, right) => left.top - right.top || left.left - right.left);
      const lines = [];
      for (const rect of rects) {
        if (!lines.some((top) => Math.abs(top - rect.top) <= 1)) lines.push(rect.top);
      }
      return { first: rects[0], lineCount: lines.length };
    };
    const textBounds = (element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => node.textContent.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
      });
      const rects = [];
      let node = walker.nextNode();
      while (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        rects.push(...range.getClientRects());
        node = walker.nextNode();
      }
      if (!rects.length) return element.getBoundingClientRect();
      return {
        left: Math.min(...rects.map(({ left }) => left)),
        right: Math.max(...rects.map(({ right }) => right)),
        top: Math.min(...rects.map(({ top }) => top)),
        bottom: Math.max(...rects.map(({ bottom }) => bottom)),
      };
    };
    const choiceNodes = controlNodes.filter((element) => {
      const type = String(element.getAttribute("type") ?? "").toLowerCase();
      const role = String(element.getAttribute("role") ?? "").toLowerCase();
      return ["checkbox", "radio"].includes(type) || ["checkbox", "radio"].includes(role);
    });
    const choices = choiceNodes.map((glyph, index) => {
      const label = glyph.labels?.[0]
        ?? (glyph.id ? root.querySelector(`label[for="${CSS.escape(glyph.id)}"]`) : null)
        ?? glyph.closest("label")
        ?? glyph.parentElement?.querySelector("label")
        ?? glyph.nextElementSibling;
      const row = glyph.closest([
        ".dashboard-authoring-boolean-row",
        ".present-chart-choice",
        ".choice-row",
        ".checkbox-row",
        ".radio-row",
        "label",
      ].join(",")) ?? glyph.parentElement;
      const glyphRect = glyph.getBoundingClientRect();
      const labelRect = label?.getBoundingClientRect();
      const lineGeometry = label ? textLineGeometry(label) : null;
      const lineRect = lineGeometry?.first ?? null;
      return {
        id: nodeId(glyph, index),
        text: label ? textOf(label) : "",
        glyphRect: rectOf(glyph),
        labelRect: label && visible(label) ? rectOf(label) : null,
        rowRect: row && visible(row) ? rectOf(row) : rectOf(glyph),
        glyphWidth: round(glyphRect.width),
        glyphHeight: round(glyphRect.height),
        rowHeight: row ? round(row.getBoundingClientRect().height) : round(glyphRect.height),
        singleLine: lineGeometry?.lineCount === 1,
        hasSupplementalCopy: Boolean(row && [...row.querySelectorAll(
          ".dashboard-authoring-boolean-copy > small, .dashboard-authoring-boolean-copy > [role='alert'], small, [role='alert']",
        )].some(visible)),
        centrelineDelta: lineRect
          ? round(Math.abs((glyphRect.top + glyphRect.height / 2) - (lineRect.top + lineRect.height / 2)))
          : null,
      };
    });

    const groupSelector = [
      "fieldset",
      "form",
      "[role='group']",
      "[role='toolbar']",
      "[class*='form-group']",
      "[class*='field-group']",
      "[class*='toolbar']",
      "[class*='actions']",
      "[class*='controls']",
    ].join(",");
    const groupNodes = descendants(groupSelector, 300);
    const gapValues = (node) => {
      const children = [...node.children].filter(visible);
      const rects = children.map((child) => child.getBoundingClientRect());
      const gaps = [];
      for (const a of rects) {
        const right = rects
          .filter((b) => b !== a
            && b.left >= a.right - 0.5
            && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1)
          .sort((left, rightCandidate) => left.left - rightCandidate.left)[0];
        if (right) {
          const gap = right.left - a.right;
          if (gap > 0.5) gaps.push(round(gap));
        }
        const below = rects
          .filter((b) => b !== a
            && b.top >= a.bottom - 0.5
            && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1)
          .sort((top, bottomCandidate) => top.top - bottomCandidate.top)[0];
        if (below) {
          const gap = below.top - a.bottom;
          if (gap > 0.5) gaps.push(round(gap));
        }
      }
      return [...new Set(gaps)].slice(0, 20);
    };
    const rhythms = groupNodes.map((node, index) => {
      const style = getComputedStyle(node);
      return {
        id: nodeId(node, index),
        gaps: gapValues(node),
        declaredGap: pixels(style.gap),
        panelPadding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].map(pixels),
      };
    });

    const layoutNodes = descendants("div,section,header,footer,nav,form,fieldset,[role='group'],[role='toolbar']", 500)
      .filter((node) => ["flex", "grid", "inline-flex", "inline-grid"].includes(getComputedStyle(node).display));
    const layoutRows = (node) => {
      const rects = [...node.children].filter(visible).map((child) => child.getBoundingClientRect());
      const rows = [];
      for (const rect of rects) {
        let row = rows.find((candidate) => (
          Math.min(candidate.bottom, rect.bottom) - Math.max(candidate.top, rect.top) > 1
        ));
        if (!row) {
          row = { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
          rows.push(row);
        } else {
          row.top = Math.min(row.top, rect.top);
          row.bottom = Math.max(row.bottom, rect.bottom);
          row.left = Math.min(row.left, rect.left);
          row.right = Math.max(row.right, rect.right);
        }
      }
      return rows;
    };
    const wraps = [];
    const whitespace = [];
    const occupancies = [];
    layoutNodes.forEach((node, index) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const children = [...node.children].filter(visible);
      const rows = layoutRows(node);
      const isRowFlex = ["flex", "inline-flex"].includes(style.display)
        && style.flexDirection.startsWith("row");
      const controlCount = children.filter((child) => child.matches?.("button,input,select,textarea,[role='button'],[role='tab']") || child.querySelector?.("button,input,select,textarea,[role='button'],[role='tab']")).length;
      const maxRowWidth = rows.length ? Math.max(...rows.map((row) => row.right - row.left)) : 0;
      const occupiedWidth = rows.length ? Math.max(...rows.map((row) => row.right)) - Math.min(...rows.map((row) => row.left)) : 0;
      const occupiedRatio = rect.width > 0 ? round(Math.min(1, occupiedWidth / rect.width)) : 1;
      const overlappingChildren = children.some((child, childIndex) => {
        const a = child.getBoundingClientRect();
        return children.slice(childIndex + 1).some((other) => {
          const b = other.getBoundingClientRect();
          return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        });
      });
      const crowded = node.scrollWidth > node.clientWidth + 2
        || (isRowFlex && rows.length > 1 && controlCount >= 2)
        || overlappingChildren;
      if (isRowFlex && (rows.length > 1 || style.flexWrap !== "nowrap")) {
        wraps.push({
          id: nodeId(node, index),
          rowCount: rows.length,
          unexpected: rows.length > 1
            && controlCount >= 2
            && node.dataset.densityWrapIntent !== "allowed",
          flexWrap: style.flexWrap,
        });
      }
      if (controlCount >= 2 && isRowFlex) {
        whitespace.push({
          id: nodeId(node, index),
          strandedInlineSpace: round(Math.max(0, rect.width - maxRowWidth)),
          occupiedRatio,
          crowded,
        });
      }
      if (controlCount >= 3) {
        occupancies.push({ id: nodeId(node, index), occupiedRatio, crowded });
      }
    });

    const overlapCandidates = controlNodes.slice(0, 250);
    const overlaps = [];
    overlapCandidates.forEach((first, firstIndex) => {
      const a = paintedRect(first);
      if (a.width <= 1 || a.height <= 1) return;
      overlapCandidates.slice(firstIndex + 1).forEach((second, offset) => {
        if (first.contains(second) || second.contains(first)) return;
        if (controlRole(first) === "glyph" || controlRole(second) === "glyph") return;
        const b = paintedRect(second);
        if (b.width <= 1 || b.height <= 1) return;
        const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (width > 1 && height > 1) {
          overlaps.push({
            first: nodeId(first, firstIndex),
            second: nodeId(second, firstIndex + offset + 1),
            area: round(width * height),
          });
        }
      });
    });

    const clippingTextSelector = [
      "h1", "h2", "h3", "h4", "h5", "h6", "legend", "label", "p", "small",
      "[role='alert']", "[role='status']", "[class*='helper']", "[class*='error']",
    ].join(",");
    const intentionallyTruncated = (element) => {
      let node = element;
      while (node && node !== root.parentElement) {
        const style = getComputedStyle(node);
        const classes = String(node.className ?? "");
        if (
          style.textOverflow === "ellipsis"
          || /\b(?:truncate|truncated|ellipsis)\b/.test(classes)
          || (node.hasAttribute("data-full-value") && Boolean(node.getAttribute("title")))
        ) return true;
        node = node.parentElement;
      }
      return false;
    };
    const clippingCandidates = [...new Set([...controlNodes, ...descendants(clippingTextSelector, 800)])]
      .filter((element) => !visuallyClipped(element))
      .filter((element) => !element.matches(".image-crop-handle"))
      .filter((element) => !element.matches(clippingTextSelector) || !intentionallyTruncated(element));
    const clippedElements = clippingCandidates.flatMap((element, index) => {
      const rect = element.matches(clippingTextSelector)
        ? textBounds(element)
        : element.getBoundingClientRect();
      const elementId = nodeId(element, index);
      const position = getComputedStyle(element).position;
      let blockScrollReachable = false;
      let inlineScrollReachable = false;
      const records = [];
      let ancestor = element.parentElement;
      while (ancestor && ancestor !== root.parentElement) {
        const style = getComputedStyle(ancestor);
        const bounds = ancestor.getBoundingClientRect();
        if (["auto", "scroll"].includes(style.overflowY) && ancestor.scrollHeight > ancestor.clientHeight + 2) {
          blockScrollReachable = true;
        }
        if (["auto", "scroll"].includes(style.overflowX) && ancestor.scrollWidth > ancestor.clientWidth + 2) {
          inlineScrollReachable = true;
        }
        const ownerAxes = [];
        if (
          !inlineScrollReachable
          && ["hidden", "clip"].includes(style.overflowX)
          && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)
        ) ownerAxes.push("inline");
        if (
          !blockScrollReachable
          &&
          ["hidden", "clip"].includes(style.overflowY)
          && (rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1)
        ) ownerAxes.push("block");
        if (ownerAxes.length) {
          records.push({
            id: `${elementId}@${nodeId(ancestor, index)}`,
            clippingOwner: nodeId(ancestor, index),
            axes: ownerAxes,
            scrollReachable: false,
          });
        }
        ancestor = ancestor.parentElement;
      }
      const viewportAxes = [];
      if (rect.left < -1 || rect.right > innerWidth + 1) viewportAxes.push("viewport-inline");
      if (rect.top < -1 || rect.bottom > innerHeight + 1) viewportAxes.push("viewport-block");
      if (viewportAxes.length) {
        records.push({
          id: elementId,
          clippingOwner: "viewport",
          axes: viewportAxes,
          scrollReachable: blockScrollReachable || (
          !["fixed", "sticky"].includes(position)
          && rect.bottom <= Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) + 1
        ),
        });
      }
      return records;
    });

    const scrollContainers = descendants("*", 1500).filter((node) => !visuallyClipped(node)).flatMap((node, index) => {
      if (node.matches(".image-crop-preview")) return [];
      const style = getComputedStyle(node);
      const nodeBounds = node.getBoundingClientRect();
      const visibleDescendantBounds = [...node.querySelectorAll("*")]
        .filter(visible)
        .map((descendant) => descendant.getBoundingClientRect());
      const explicitTextScroller = ["pre", "code", "table"].includes(node.tagName.toLowerCase())
        || Boolean(node.querySelector(":scope > pre, :scope > code, :scope > table"));
      const paintedOverflowX = visibleDescendantBounds.length
        ? Math.max(0, ...visibleDescendantBounds.map((bounds) => bounds.right - nodeBounds.right))
        : 0;
      const paintedOverflowY = visibleDescendantBounds.length
        ? Math.max(0, ...visibleDescendantBounds.map((bounds) => bounds.bottom - nodeBounds.bottom))
        : 0;
      const overflowX = explicitTextScroller
        ? Math.max(0, node.scrollWidth - node.clientWidth)
        : paintedOverflowX;
      const overflowY = explicitTextScroller
        ? Math.max(0, node.scrollHeight - node.clientHeight)
        : paintedOverflowY;
      if (overflowX <= 2 && overflowY <= 2) return [];
      if (!["auto", "scroll", "hidden", "clip"].includes(style.overflowX) && !["auto", "scroll", "hidden", "clip"].includes(style.overflowY)) return [];
      let topReachable = null;
      let bottomReachable = null;
      if (overflowY > 2 && ["auto", "scroll"].includes(style.overflowY)) {
        const originalScrollTop = node.scrollTop;
        const maximumScrollTop = Math.max(0, node.scrollHeight - node.clientHeight);
        node.scrollTop = 0;
        topReachable = node.scrollTop <= 1;
        node.scrollTop = node.scrollHeight;
        bottomReachable = Math.abs(node.scrollTop - maximumScrollTop) <= 1;
        node.scrollTop = originalScrollTop;
      }
      return [{
        id: nodeId(node, index),
        overflowX: round(overflowX),
        overflowY: round(overflowY),
        modeX: style.overflowX,
        modeY: style.overflowY,
        topReachable,
        bottomReachable,
        allowsHorizontal: node.dataset.allowHorizontalScroll === "true"
          || style.textOverflow === "ellipsis"
          || explicitTextScroller,
      }];
    });

    const titleNodes = descendants("h1,h2,h3,h4,h5,h6,legend,[class*='subtitle'],[class*='section-title'],[class*='dialog-title']", 300)
      .filter((node) => textOf(node).length > 0 && textOf(node).length <= 120);
    const titleRecords = titleNodes.map((node, index) => ({
      node,
      scope: node.closest("fieldset, section, [role='dialog'], [role='group'], aside, article") ?? root,
      heading: {
        id: nodeId(node, index),
        text: textOf(node),
        normalizedText: textOf(node).toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim(),
        tag: node.tagName.toLowerCase(),
        rect: rectOf(node),
      },
    }));
    const headings = titleRecords.map(({ heading }) => heading);
    const repeatedTitles = [];
    const titleGroups = [];
    titleRecords.forEach((record) => {
      let group = titleGroups.find((candidate) => (
        candidate.normalizedText === record.heading.normalizedText
        && candidate.scope === record.scope
      ));
      if (!group) {
        group = { normalizedText: record.heading.normalizedText, scope: record.scope, records: [] };
        titleGroups.push(group);
      }
      group.records.push(record);
    });
    titleGroups.forEach(({ records, normalizedText }) => {
      const distinct = [];
      for (const record of records) {
        if (distinct.some((existing) => (
          existing.node.contains(record.node) || record.node.contains(existing.node)
        ))) continue;
        distinct.push(record);
      }
      if (distinct.length > 1) {
        repeatedTitles.push({
          owner: metadata.id,
          text: distinct[0].heading.text,
          normalizedText,
          ids: distinct.map(({ heading }) => heading.id),
        });
      }
    });

    const parseColor = (value) => {
      const source = String(value ?? "").trim().toLowerCase();
      const components = source.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
      if (source.startsWith("color(srgb") && components.length >= 3) {
        return {
          r: Math.max(0, Math.min(255, components[0] * 255)),
          g: Math.max(0, Math.min(255, components[1] * 255)),
          b: Math.max(0, Math.min(255, components[2] * 255)),
          a: Math.max(0, Math.min(1, components[3] ?? 1)),
        };
      }
      if (!source.startsWith("rgb") || components.length < 3) return null;
      return {
        r: Math.max(0, Math.min(255, components[0])),
        g: Math.max(0, Math.min(255, components[1])),
        b: Math.max(0, Math.min(255, components[2])),
        a: Math.max(0, Math.min(1, components[3] ?? 1)),
      };
    };
    const compositeColor = (foreground, background) => {
      const alpha = foreground.a + background.a * (1 - foreground.a);
      if (alpha <= 0) return { r: 255, g: 255, b: 255, a: 1 };
      return {
        r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
        g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
        b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
        a: alpha,
      };
    };
    const effectiveBackground = (element) => {
      const layers = [];
      let hasImage = false;
      let node = element;
      while (node) {
        const style = getComputedStyle(node);
        if (style.backgroundImage !== "none") hasImage = true;
        const layer = parseColor(style.backgroundColor);
        if (layer && layer.a > 0) layers.push(layer);
        if (layer?.a >= 0.995) break;
        node = node.parentElement;
      }
      let color = { r: 255, g: 255, b: 255, a: 1 };
      layers.reverse().forEach((layer) => {
        color = compositeColor(layer, color);
      });
      return { color, hasImage };
    };
    const linearChannel = (value) => {
      const normalized = value / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (color) => (
      0.2126 * linearChannel(color.r)
      + 0.7152 * linearChannel(color.g)
      + 0.0722 * linearChannel(color.b)
    );
    const contrastRatio = (first, second) => {
      const light = Math.max(luminance(first), luminance(second));
      const dark = Math.min(luminance(first), luminance(second));
      return (light + 0.05) / (dark + 0.05);
    };
    const colorText = ({ r, g, b, a }) => `rgba(${round(r)}, ${round(g)}, ${round(b)}, ${round(a)})`;
    const contrastSelector = [
      "h1", "h2", "h3", "h4", "h5", "h6", "legend", "label", "p", "small", "button",
      "[class*='notice']", "[class*='warning']", "[class*='status']", "[class*='error']",
    ].join(",");
    const operationalContrastSamples = descendants(contrastSelector, 700)
      .filter((element) => textOf(element).length > 0)
      .flatMap((element, index) => {
        const style = getComputedStyle(element);
        const foreground = parseColor(style.color);
        const background = effectiveBackground(element);
        if (!foreground || background.hasImage) return [];
        const paintedForeground = compositeColor(foreground, background.color);
        const ratio = round(contrastRatio(paintedForeground, background.color));
        return [{
          id: nodeId(element, index),
          text: textOf(element).slice(0, 90),
          ratio,
          foreground: colorText(paintedForeground),
          background: colorText(background.color),
          state: element.matches(":disabled, [disabled]") ? "disabled" : "available",
        }];
      });
    const operationalContrastCandidates = operationalContrastSamples
      .filter(({ ratio }) => ratio < 2.25)
      .sort((left, right) => left.ratio - right.ratio)
      .slice(0, 24);

    const visibleSemanticNodes = descendants([
      "h1", "h2", "h3", "h4", "h5", "h6", "legend", "label", "button",
      "[class*='notice']", "[class*='warning']", "[class*='status']", "[class*='error']",
    ].join(","), 700).filter((element) => textOf(element).length > 0);
    const semanticFaults = [
      { signal: "object-stringification", pattern: /\[object Object\]/i },
      { signal: "unresolved-value", pattern: /(?:^|\s)(?:undefined|NaN)(?:$|[\s.,;:!?])/i },
      { signal: "null-value", pattern: /^null$/i },
      { signal: "placeholder-copy", pattern: /\blorem ipsum\b/i },
      { signal: "unfinished-copy", pattern: /\bTODO\b/ },
      { signal: "unresolved-template", pattern: /(?:\{\{[^{}]+\}\}|\$\{[^{}]+\})/ },
    ];
    const visibleSemanticsCandidates = visibleSemanticNodes.flatMap((element, index) => {
      const text = textOf(element);
      const fault = semanticFaults.find(({ pattern }) => pattern.test(text));
      return fault ? [{ id: nodeId(element, index), text, signal: fault.signal }] : [];
    }).slice(0, 24);
    const visibleStateTextCount = visibleSemanticNodes.filter((element) => (
      /notice|warning|status|error/.test(String(element.className ?? ""))
    )).length;

    const rootRect = rectOf(root);
    return {
      surface: metadata,
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
      root: {
        selector: rootSelector,
        tag: root.tagName.toLowerCase(),
        classes: [...root.classList],
        rect: rootRect,
        style: styleRecord(root),
      },
      scanCompleteness: {
        truncated: traversalQueries.some(({ truncated }) => truncated),
        truncations: traversalQueries.filter(({ truncated }) => truncated),
      },
      controls,
      choices,
      headings,
      rhythms,
      wraps,
      whitespace,
      overlaps,
      clippedElements,
      scrollContainers,
      repeatedTitles,
      occupancies,
      operationalContrastSamples: {
        measured: operationalContrastSamples.length,
        lowest: operationalContrastSamples
          .sort((left, right) => left.ratio - right.ratio)
          .slice(0, 5),
      },
      operationalContrastCandidates,
      visibleSemanticsCandidates,
      humanReview: {
        operationalContrast: {
          status: "required",
          prompt: "Judge whether selected, inactive, warning, destructive, and primary states remain immediately distinguishable in the existing colour profile; do not use this review to enlarge controls.",
        },
        visibleSemantics: {
          status: "required",
          prompt: "Judge visible label and action meaning, title/group hierarchy, icon meaning, chart units, state distinction, and destructive-action clarity.",
          visibleHeadingCount: headings.length,
          visibleStateTextCount,
        },
      },
    };
  }, {
    metadata: {
      id: entry.id,
      family: entry.family,
      owner: entry.owner,
      mode: entry.mode,
      state: entry.state,
      appearance: entry.appearance,
    },
    rootSelector: entry.root,
    roleHeights: ROLE_HEIGHTS,
  });

  return classifyDashboardDensitySnapshot(snapshot);
}

export function classifyDashboardDensitySnapshot(snapshot) {
  const findings = [];
  const add = (category, priority, evidence, recommendation) => {
    findings.push({
      id: `${snapshot.surface.id}:${category}:${findings.length + 1}`,
      surfaceId: snapshot.surface.id,
      owner: snapshot.surface.owner,
      category,
      priority,
      evidence,
      recommendation,
    });
  };

  for (const control of snapshot.controls ?? []) {
    if (!Number.isFinite(control.expectedHeight) || !Number.isFinite(control.rect?.height)) continue;
    const delta = Math.abs(control.rect.height - control.expectedHeight);
    if (delta > SIZE_TOLERANCE) {
      add(
        "role-size",
        delta >= 10 ? "P1" : "P2",
        `${control.id} is ${control.rect.height}px high; ${control.role} expects ${control.expectedHeight}px (±${SIZE_TOLERANCE}px).`,
        `Move ${control.id} to the shared ${control.role} height instead of preserving a local minimum.`,
      );
    }
  }

  const byRole = new Map();
  for (const control of snapshot.controls ?? []) {
    if (!Number.isFinite(control.rect?.height) || control.role === "content") continue;
    const values = byRole.get(control.role) ?? [];
    values.push(control);
    byRole.set(control.role, values);
  }
  for (const [role, controls] of byRole) {
    if (controls.length < 2) continue;
    const heights = controls.map(({ rect }) => rect.height);
    const variance = Math.max(...heights) - Math.min(...heights);
    if (variance > SIZE_TOLERANCE * 2) {
      add(
        "same-role-variance",
        "P1",
        `${controls.length} ${role} controls vary by ${round(variance)}px (${round(Math.min(...heights))}–${round(Math.max(...heights))}px).`,
        `Use one shared ${role} geometry and document any content-specific exception.`,
      );
    }
  }

  for (const choice of snapshot.choices ?? []) {
    const badGlyph = [choice.glyphWidth, choice.glyphHeight]
      .some((value) => Number.isFinite(value) && Math.abs(value - ROLE_HEIGHTS.glyph) > SIZE_TOLERANCE);
    const badRow = Number.isFinite(choice.rowHeight) && (
      choice.rowHeight < ROLE_HEIGHTS.compact - SIZE_TOLERANCE
      || (
        choice.singleLine
        && !choice.hasSupplementalCopy
        && Math.abs(choice.rowHeight - ROLE_HEIGHTS.compact) > SIZE_TOLERANCE
      )
    );
    const badCentre = Number.isFinite(choice.centrelineDelta) && choice.centrelineDelta > 1;
    if (badGlyph || badRow || badCentre) {
      add(
        "centreline",
        "P1",
        `${choice.id}: glyph ${choice.glyphWidth ?? "unmeasured"}×${choice.glyphHeight}px, row ${choice.rowHeight}px, centre-line delta ${choice.centrelineDelta ?? "unmeasured"}px.`,
        "Apply the shared 16px glyph / 28px row / 8px text-gap choice geometry.",
      );
    }
  }

  for (const rhythm of snapshot.rhythms ?? []) {
    const measuredAdjacentGaps = (rhythm.gaps ?? [])
      .filter((value) => value <= Math.max(...SPACING_SCALE) + SIZE_TOLERANCE);
    const values = [rhythm.declaredGap, ...measuredAdjacentGaps, ...(rhythm.panelPadding ?? [])]
      .filter((value) => Number.isFinite(value) && value > 0);
    const offScale = [...new Set(values.filter((value) => (
      !SPACING_SCALE.some((scaleValue) => Math.abs(value - scaleValue) <= 0.5)
    )).map(round))];
    if (offScale.length) {
      add(
        "rhythm",
        "P2",
        `${rhythm.id} uses off-scale spacing: ${offScale.join(", ")}px.`,
        "Map visible group gaps and padding to the shared 2/4/8/12/16/24/32px scale.",
      );
    }
  }

  for (const wrap of snapshot.wraps ?? []) {
    if (!wrap.unexpected) continue;
    add(
      "wrap",
      "P1",
      `${wrap.id} breaks into ${wrap.rowCount} rows without an intentional wrap contract.`,
      "Stack the task group deliberately or give it a balanced grid; do not let individual controls wrap accidentally.",
    );
  }

  for (const region of snapshot.whitespace ?? []) {
    if (!region.crowded || region.strandedInlineSpace < 64) continue;
    add(
      "whitespace",
      "P1",
      `${region.id} is crowded while leaving ${region.strandedInlineSpace}px of inline space unused.`,
      "Redistribute the whole control group into a compact stack or balanced grid.",
    );
  }

  for (const overlap of snapshot.overlaps ?? []) {
    add(
      "overlap",
      overlap.area >= 64 ? "P0" : "P1",
      `${overlap.first} overlaps ${overlap.second} by ${overlap.area}px².`,
      "Restore non-overlapping control geometry at the owning layout container.",
    );
  }

  for (const clipped of snapshot.clippedElements ?? []) {
    const effectiveAxes = clipped.axes.filter((axis) => (
      axis !== "viewport-block" || !clipped.scrollReachable
    ));
    if (!effectiveAxes.length) continue;
    add(
      "clipping",
      effectiveAxes.some((axis) => axis.startsWith("viewport")) ? "P0" : "P1",
      `${clipped.id} is clipped on ${effectiveAxes.join(", ")}.`,
      "Keep the visible label/control rectangle inside its viewport and clipping owner.",
    );
  }

  for (const container of snapshot.scrollContainers ?? []) {
    const horizontalFailure = container.overflowX > 2 && !container.allowsHorizontal;
    const hiddenVerticalFailure = container.overflowY > 2 && ["hidden", "clip"].includes(container.modeY);
    const unreachableVertical = container.overflowY > 2
      && ["auto", "scroll"].includes(container.modeY)
      && (container.topReachable === false || container.bottomReachable === false);
    if (!horizontalFailure && !hiddenVerticalFailure && !unreachableVertical) continue;
    add(
      "overflow",
      horizontalFailure || unreachableVertical ? "P1" : "P2",
      `${container.id} overflows by ${container.overflowX}px inline and ${container.overflowY}px block; scroll endpoints reachable=${container.topReachable ?? "n/a"}/${container.bottomReachable ?? "n/a"}.`,
      "Remove unintended horizontal overflow and keep content-specific scrolling reachable at both endpoints on an explicit owner.",
    );
  }

  for (const repeated of snapshot.repeatedTitles ?? []) {
    add(
      "repeated-title",
      "P1",
      `“${repeated.text}” appears ${repeated.ids.length} times in one visible region (${repeated.ids.join(", ")}).`,
      "Keep one region title; suppress a duplicate field legend or replace a subtitle with added scope.",
    );
  }

  for (const occupancy of snapshot.occupancies ?? []) {
    if (!occupancy.crowded || (occupancy.occupiedRatio >= 0.5 && occupancy.occupiedRatio <= 0.94)) continue;
    add(
      "occupancy",
      "P2",
      `${occupancy.id} has ${round(occupancy.occupiedRatio * 100)}% inline occupancy while its children are crowded.`,
      "Use the available panel width intentionally without stretching the controls themselves.",
    );
  }

  for (const candidate of snapshot.operationalContrastCandidates ?? []) {
    add(
      "operational-contrast",
      candidate.ratio < 1.5 ? "P1" : "P2",
      `${candidate.id} renders “${candidate.text}” at ${candidate.ratio}:1 (${candidate.foreground} on ${candidate.background}; ${candidate.state}).`,
      "Restore immediate operational legibility and state hierarchy within the existing colour profile without increasing the approved control geometry.",
    );
  }

  for (const candidate of snapshot.visibleSemanticsCandidates ?? []) {
    add(
      "visible-semantics",
      "P1",
      `${candidate.id} exposes ${candidate.signal} in visible copy: “${candidate.text}”.`,
      "Replace implementation or placeholder language with concise, task-specific visible copy.",
    );
  }

  const categoryCounts = {};
  const priorityCounts = { P0: 0, P1: 0, P2: 0 };
  for (const finding of findings) {
    categoryCounts[finding.category] = (categoryCounts[finding.category] ?? 0) + 1;
    priorityCounts[finding.priority] += 1;
  }
  return { ...snapshot, findings, categoryCounts, priorityCounts };
}

export function collapseDashboardDensityFindings(findings = []) {
  const groups = new Map();
  for (const finding of findings) {
    const key = [
      finding.owner,
      finding.category,
      finding.priority,
      normalizedFindingPattern(finding.evidence),
      normalizedFindingPattern(finding.recommendation),
    ].join("\u0000");
    const group = groups.get(key) ?? [];
    group.push(finding);
    groups.set(key, group);
  }
  return [...groups.values()].map((group, index) => {
    const first = group[0];
    const surfaceIds = [...new Set(group.map(({ surfaceId }) => surfaceId).filter(Boolean))];
    if (group.length === 1) {
      return {
        ...first,
        occurrenceCount: 1,
        surfaceIds,
        instanceIds: [first.id],
      };
    }
    return {
      ...first,
      id: `systemic:${first.owner}:${first.category}:${index + 1}`,
      surfaceId: surfaceIds.length === 1 ? surfaceIds[0] : null,
      systemic: true,
      occurrenceCount: group.length,
      surfaceIds,
      instanceIds: group.map(({ id }) => id),
      evidence: `${group.length} matching instances across ${surfaceIds.length} surface${surfaceIds.length === 1 ? "" : "s"}; example: ${first.evidence}`,
    };
  });
}

function normalizedFindingPattern(value) {
  return String(value ?? "")
    .replace(/#[\w:.-]+/g, "#<instance>")
    .replace(/\[data-[^\]]+\]/g, "[data-instance]")
    .replace(/:nth\(\d+\)/g, ":nth(*)")
    .replace(/\s+/g, " ")
    .trim();
}

function round(value) {
  return Math.round(value * 100) / 100;
}
