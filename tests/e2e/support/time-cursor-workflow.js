import { expect } from "@playwright/test";

export async function revealCanonicalPanel(page, chartId) {
  const placement = page.locator(`[data-canonical-panel-id=${JSON.stringify(chartId)}]`);
  await expect(placement).toHaveCount(1);
  await placement.scrollIntoViewIfNeeded();
  const painted = page.locator(`[data-panel-id=${JSON.stringify(chartId)}]`);
  await expect(painted).toHaveCount(1);
  await expect(painted).toBeVisible();
  return painted;
}

export function timeCursor(page) {
  const bar = page.getByRole("region", { name: "Dashboard time", exact: true });
  const instant = bar.locator(".time-bar__instant");
  const scope = bar.getByRole("combobox", { name: /^(Time scope|Apply time to)$/ });
  const frame = bar.getByRole("slider", { name: "Selected time", exact: true });
  const play = bar.getByRole("button", { name: "Play time", exact: true });
  const pause = bar.getByRole("button", { name: "Pause time", exact: true });
  return {
    bar, instant, scope, frame, play, pause,
    previous: bar.getByRole("button", { name: "Previous time", exact: true }),
    next: bar.getByRole("button", { name: "Next time", exact: true }),
    async open() {
      await expect(bar).toBeVisible();
      if (!await frame.isVisible()) await instant.click();
      await expect(frame).toBeVisible();
      return bar;
    },
    async settings() {
      const settings = bar.getByRole("region", { name: "Time settings", exact: true });
      if (!await settings.isVisible()) await bar.getByRole("button", { name: "Time settings", exact: true }).click();
      await expect(settings).toBeVisible();
      return settings;
    },
    async seekFrameIndex(index) {
      expect(Number.isSafeInteger(index) && index >= 0).toBe(true);
      await expect(bar).toBeVisible();
      if (!await frame.isVisible()) await instant.click();
      await expect(frame).toBeEnabled();
      await frame.press("Home");
      for (let step = 0; step < index; step++) {
        const previousEpoch = await frame.inputValue();
        await frame.press("ArrowRight");
        await expect(frame).not.toHaveValue(previousEpoch);
      }
      return Number(await frame.inputValue());
    },
    async selectScope({ id, name, kind } = {}) {
      await expect(bar).toBeVisible();
      if (!await scope.isVisible()) await instant.click();
      await expect(scope).toBeVisible();
      const options = await scope.locator("option").evaluateAll(nodes => nodes.map(node => ({ value: node.value, name: node.textContent.trim() })));
      const matches = options.filter(option => kind === "page" || kind === "dashboard"
        ? option.value === kind
        : name ? option.name === name : option.value.split(":").slice(1).join(":") === id);
      expect(matches, `one actual saved time scope for ${name ?? id ?? kind}`).toHaveLength(1);
      await scope.selectOption(matches[0].value);
      await expect(scope).toHaveValue(matches[0].value);
      return matches[0].value;
    },
  };
}
