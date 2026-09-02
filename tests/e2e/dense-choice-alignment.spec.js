import { expect, test } from "@playwright/test";

import { DASHBOARD_SURFACE_MANIFEST } from "./support/dashboard-surface-manifest.js";

const CHOICE_GLYPH = 16;
const CHOICE_GAP = 8;
const FIRST_LINE_TOLERANCE = 1;

const cases = [
  {
    name: "Text/Image content types align radios to the first line and place helper copy below",
    surfaceId: "text-image-type-picker",
    labelSelector: "label:has(> input[name='static-content-type'])",
    expectedCount: 2,
  },
  {
    name: "dashboard deletion aligns its acknowledgement checkbox to the first line",
    surfaceId: "delete-dashboard-content-dialog",
    labelSelector: ".delete-dashboard-content-acknowledgement",
    expectedCount: 1,
  },
  {
    name: "Audience options align each checkbox to its fact label instead of the helper block",
    surfaceId: "present-audience-options",
    labelSelector: ".present-audience-fact",
    expectedCount: 4,
  },
  {
    name: "image title choices keep one compact row while neighboring fields are taller",
    surfaceId: "static-image-source-editor",
    labelSelector: "[data-image-title-presentation='true'] .dashboard-authoring-boolean-row",
    expectedCount: 3,
    expectedRowHeight: 28,
    expectedSingleRow: true,
  },
];

test.describe("dense desktop choice alignment", () => {
  test.describe.configure({ timeout: 120_000 });

  for (const choiceCase of cases) {
    test(choiceCase.name, async ({ context, page }) => {
      const entry = DASHBOARD_SURFACE_MANIFEST.find(({ id }) => id === choiceCase.surfaceId);
      expect(entry, `${choiceCase.surfaceId} must remain in the surface manifest`).toBeTruthy();
      await page.setViewportSize(entry.viewport);

      const setup = await entry.setup({ page, browserContext: context, entry });
      const activePage = setup?.page ?? page;
      const labels = activePage.locator(choiceCase.labelSelector);
      await expect(labels).toHaveCount(choiceCase.expectedCount);

      const geometry = await labels.evaluateAll((elements) => elements.map((label) => {
        const glyph = label.querySelector(":scope > input:is([type='checkbox'], [type='radio'])");
        if (!glyph) throw new Error("Choice row is missing its direct checkbox or radio glyph.");

        const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
        let firstTextNode = null;
        while (walker.nextNode()) {
          const candidate = walker.currentNode;
          if (/\S/u.test(candidate.textContent ?? "")) {
            firstTextNode = candidate;
            break;
          }
        }
        if (!firstTextNode) throw new Error("Choice row is missing visible label copy.");

        const firstCharacter = firstTextNode.textContent.search(/\S/u);
        const firstLineRange = document.createRange();
        firstLineRange.setStart(firstTextNode, firstCharacter);
        firstLineRange.setEnd(firstTextNode, firstCharacter + 1);

        const glyphRect = glyph.getBoundingClientRect();
        const firstLineRect = firstLineRange.getBoundingClientRect();
        const rowRect = label.getBoundingClientRect();
        const helper = label.querySelector("small");
        const helperRect = helper?.getBoundingClientRect() ?? null;

        return {
          glyphWidth: glyphRect.width,
          glyphHeight: glyphRect.height,
          glyphToLabelGap: firstLineRect.left - glyphRect.right,
          firstLineDelta: (
            glyphRect.top + glyphRect.height / 2
            - firstLineRect.top - firstLineRect.height / 2
          ),
          rowHeight: rowRect.height,
          rowTop: rowRect.top,
          helperBelowFirstLine: helperRect
            ? helperRect.top >= firstLineRect.bottom - 0.5
            : null,
        };
      }));

      for (const row of geometry) {
        expect(row.glyphWidth).toBe(CHOICE_GLYPH);
        expect(row.glyphHeight).toBe(CHOICE_GLYPH);
        expect(row.glyphToLabelGap).toBeCloseTo(CHOICE_GAP, 0);
        expect(Math.abs(row.firstLineDelta)).toBeLessThanOrEqual(FIRST_LINE_TOLERANCE);
        if (row.helperBelowFirstLine !== null) expect(row.helperBelowFirstLine).toBe(true);
        if (choiceCase.expectedRowHeight !== undefined) {
          expect(row.rowHeight).toBe(choiceCase.expectedRowHeight);
        }
      }

      if (choiceCase.expectedSingleRow) {
        const rowTops = new Set(geometry.map(({ rowTop }) => Math.round(rowTop)));
        expect(rowTops.size).toBe(1);
      }
    });
  }
});
