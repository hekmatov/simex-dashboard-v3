import { expect, test } from "@playwright/test";

const HARNESS_URL =
  "http://127.0.0.1:4175/tests/e2e/modal-focus-harness.html";

test("wizard traps both Tab directions and Escape opens the discard lifecycle", async ({
  page,
}) => {
  await page.goto(HARNESS_URL);
  const trigger = page.getByRole("button", { name: "Open chart wizard" });
  await trigger.click();

  const wizard = page.getByRole("dialog", {
    name: "Choose the chart format",
  });
  await expect(wizard).toBeVisible();
  await expect(
    wizard.getByRole("button", { name: "Chart type", exact: true }),
  ).toBeFocused();

  const enabledButtons = wizard.locator("button:not([disabled])");
  const first = enabledButtons.first();
  const last = enabledButtons.last();
  await last.focus();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await first.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(last).toBeFocused();

  const background = page.getByRole("button", { name: "Background action" });
  await background.focus();
  await expect(background).toBeFocused();
  await page.keyboard.press("Tab");
  await expect.poll(() => activeElementIsInside(page, wizard)).toBe(true);
  expect((await modalSnapshot(page)).backgroundActivations).toBe(0);

  const selectedStep = wizard.getByRole("button", {
    name: "Chart type",
    exact: true,
  });
  await selectedStep.focus();
  await page.keyboard.press("Escape");
  const discard = page.getByRole("dialog", { name: "Discard chart?" });
  await expect(discard).toBeVisible();
  await expect(
    discard.getByRole("button", { name: "Continue editing" }),
  ).toBeFocused();
  const nestedSnapshot = await modalSnapshot(page);
  expect(nestedSnapshot.activeDocumentKeydownListeners).toBe(1);
  expect(nestedSnapshot.documentKeydownAdds).toBe(1);

  await page.keyboard.press("Escape");
  await expect(discard).toHaveCount(0);
  await expect(selectedStep).toBeFocused();

  await wizard.getByRole("button", { name: "Close" }).click();
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Discard" }).click();
  await expect(wizard).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect.poll(() => modalSnapshot(page)).toMatchObject({
    activeDocumentKeydownListeners: 0,
    documentKeydownAdds: 1,
    documentKeydownRemoves: 1,
  });
});

test("safe confirmations and conversion dialogs restore their exact triggers", async ({
  page,
}) => {
  await page.goto(HARNESS_URL);

  const resetTrigger = page.getByRole("button", { name: "Reset edits" });
  await resetTrigger.click();
  const reset = page.getByRole("dialog", { name: "Reset edits?" });
  await expect(
    reset.getByRole("button", { name: "Keep editing" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(reset).toHaveCount(0);
  await expect(resetTrigger).toBeFocused();

  const conversionTrigger = page.getByRole("button", {
    name: "Open conversion",
  });
  await conversionTrigger.click();
  const conversionDialog = page.getByRole("dialog", {
    name: "Compatible change",
  });
  const playback = conversionDialog.getByLabel("Playback time role");
  await expect(playback).toBeFocused();

  const focusables = conversionDialog.locator(
    "select:not([disabled]), button:not([disabled])",
  );
  await focusables.last().focus();
  await page.keyboard.press("Tab");
  await expect(focusables.first()).toBeFocused();
  await focusables.first().focus();
  await page.keyboard.press("Shift+Tab");
  await expect(focusables.last()).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(conversionDialog).toHaveCount(0);
  await expect(conversionTrigger).toBeFocused();
  await expect.poll(() => modalSnapshot(page)).toMatchObject({
    activeDocumentKeydownListeners: 0,
    documentKeydownAdds: 2,
    documentKeydownRemoves: 2,
  });
});

test("reopened wizard focuses the reset selected step rather than stale state", async ({
  page,
}) => {
  await page.goto(HARNESS_URL);
  const trigger = page.getByRole("button", { name: "Open chart wizard" });
  await trigger.click();
  let wizard = page.locator(".chart-wizard-backdrop[role=\"dialog\"]");
  await wizard.getByRole("button", { name: "Data roles" }).click();
  await expect(wizard).toHaveAccessibleName(
    "Tell the chart what each column means",
  );
  await wizard.getByRole("button", { name: "Close" }).click();
  await page.getByRole("dialog", { name: "Discard chart?" })
    .getByRole("button", { name: "Discard" })
    .click();
  await expect(wizard).toHaveCount(0);

  await trigger.click();
  wizard = page.locator(".chart-wizard-backdrop[role=\"dialog\"]");
  await expect(
    wizard.getByRole("button", { name: "Chart type", exact: true }),
  ).toBeFocused();
});

test("reopening a modal never duplicates or leaks the document listener", async ({
  page,
}) => {
  await page.goto(HARNESS_URL);
  const trigger = page.getByRole("button", { name: "Open conversion" });

  for (const expectedAdds of [1, 2, 3]) {
    await trigger.click();
    await expect.poll(() => modalSnapshot(page)).toMatchObject({
      activeDocumentKeydownListeners: 1,
      documentKeydownAdds: expectedAdds,
      documentKeydownRemoves: expectedAdds - 1,
    });
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect.poll(() => modalSnapshot(page)).toMatchObject({
      activeDocumentKeydownListeners: 0,
      documentKeydownAdds: expectedAdds,
      documentKeydownRemoves: expectedAdds,
    });
  }
});

test("a dialog without enabled controls keeps focus on its container", async ({
  page,
}) => {
  await page.goto(HARNESS_URL);
  const trigger = page.getByRole("button", { name: "Open empty dialog" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Empty modal" });

  await expect(dialog).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

async function modalSnapshot(page) {
  return page.evaluate(() => window.__modalFocusHarness.snapshot());
}

async function activeElementIsInside(page, locator) {
  const handle = await locator.elementHandle();
  return page.evaluate(
    ({ dialog }) => dialog.contains(document.activeElement),
    { dialog: handle },
  );
}
