import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";

test.beforeEach(async ({ request, page }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await page.addInitScript((storageKey) => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function patchedSetItem(key, value) {
      if (key === storageKey && globalThis.__SIMEX_FAIL_SAVE_NON_QUOTA__ === true) {
        globalThis.__SIMEX_SAVE_ATTEMPTS__ = (globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0) + 1;
        throw new Error("Dashboard persistence is temporarily unavailable.");
      }
      if (key === storageKey && globalThis.__SIMEX_FAIL_SAVE_LONG__ === true) {
        globalThis.__SIMEX_SAVE_ATTEMPTS__ = (globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0) + 1;
        throw new Error(`Dashboard persistence is unavailable: ${"x".repeat(600)}`);
      }
      if (key === storageKey && globalThis.__SIMEX_FAIL_SAVE_ONCE__ === true) {
        globalThis.__SIMEX_FAIL_SAVE_ONCE__ = false;
        globalThis.__SIMEX_SAVE_ATTEMPTS__ = (globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0) + 1;
        throw new DOMException("Storage full", "QuotaExceededError");
      }
      if (key === storageKey && globalThis.__SIMEX_FAIL_SAVE__ === true) {
        globalThis.__SIMEX_SAVE_ATTEMPTS__ = (globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0) + 1;
        throw new DOMException("Storage full", "QuotaExceededError");
      }
      if (key === storageKey) {
        globalThis.__SIMEX_SAVE_ATTEMPTS__ = (globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0) + 1;
      }
      return setItem.call(this, key, value);
    };
  }, STORAGE_KEY);
});

async function openDashboardEditMode(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByRole("button", { name: "Build" }).click();
}

async function openFirstChartEditor(page) {
  await openDashboardEditMode(page);
  await page.locator(".chart-panel").first()
    .getByRole("button", { name: "Edit chart" }).click();
}

async function storedDashboard(page) {
  return page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)), STORAGE_KEY);
}

test("rendered version-3 layouts drive desktop spans and a taller phone full canvas", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await page.getByRole("button", { name: "Biomedical", exact: true }).click();
  const expected = [
    ["bio_current_cases_kpi", "compact", "span 1", "span 1", "360px"],
    ["bio_r_values", "standard", "span 2", "span 1", "360px"],
    ["bio_confirmed_cases", "wide", "span 4", "span 1", "360px"],
    ["bio_municipality_choropleth_animation", "full", "span 4", "span 2", "736px"],
  ];
  for (const [panelId, size, columnEnd, rowEnd, minHeight] of expected) {
    const panel = page.locator(`[data-panel-id="${panelId}"]`);
    await expect(panel).toHaveClass(new RegExp(`\\bchart-panel-${size}\\b`));
    const style = await panel.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        gridColumnStart: computed.gridColumnStart,
        gridRowStart: computed.gridRowStart,
        minHeight: computed.minHeight,
      };
    });
    expect(style).toEqual({
      gridColumnStart: columnEnd,
      gridRowStart: rowEnd,
      minHeight,
    });
  }

  const obsoleteProbes = await page.locator(".layout-grid").first().evaluate((grid) => {
    return ["half", "normal", "tall", "large"].map((size) => {
      const probe = document.createElement("article");
      probe.className = `chart-panel chart-size-${size}`;
      grid.append(probe);
      const computed = getComputedStyle(probe);
      const result = {
        className: `chart-size-${size}`,
        gridColumnStart: computed.gridColumnStart,
        gridRowStart: computed.gridRowStart,
        minHeight: computed.minHeight,
      };
      probe.remove();
      return result;
    });
  });
  expect(obsoleteProbes).toEqual(["half", "normal", "tall", "large"].map((size) => ({
    className: `chart-size-${size}`,
    gridColumnStart: "span 2",
    gridRowStart: "span 1",
    minHeight: "360px",
  })));
  const obsoleteRenderedClasses = await page.locator(".chart-panel").evaluateAll((panels) => (
    panels.flatMap((panel) => [...panel.classList])
      .filter((name) => /^chart-size-(half|normal|tall|large)$/.test(name))
  ));
  expect(obsoleteRenderedClasses).toEqual([]);

  await page.getByRole("button", { name: "Phone", exact: true }).click();
  const phoneHeights = await page.evaluate(() => {
    const measure = (panelId) => {
      const panel = document.querySelector(`[data-panel-id="${panelId}"]`);
      const probe = document.createElement("div");
      probe.className = "chart-canvas";
      panel.append(probe);
      const height = Number.parseFloat(getComputedStyle(probe).height);
      probe.remove();
      return height;
    };
    return {
      standard: measure("bio_r_values"),
      full: measure("bio_municipality_choropleth_animation"),
    };
  });
  expect(phoneHeights.full).toBeGreaterThan(phoneHeights.standard);
  expect(phoneHeights.full).toBeGreaterThanOrEqual(420);
  expect(await page.evaluate(() => (
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  ))).toBe(true);
});

test("edit-mode panel drag reorders through the memoized chart boundary", async ({ page }) => {
  await openDashboardEditMode(page);
  const panels = page.locator(".chart-panel");
  const initial = await panels.evaluateAll((items) => items.slice(0, 2).map((item) => (
    item.getAttribute("data-panel-id")
  )));

  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await panels.nth(1).dispatchEvent("dragstart", { dataTransfer });
  expect(await dataTransfer.evaluate((transfer) => transfer.getData("text/plain")))
    .not.toBe("");
  await expect(panels.nth(1)).toHaveClass(/\bdragging\b/);
  await panels.nth(0).dispatchEvent("dragover", { dataTransfer });
  await expect(panels.nth(0)).toHaveClass(/\bdrag-target\b/);
  await panels.nth(0).dispatchEvent("drop", { dataTransfer });
  await panels.nth(1).dispatchEvent("dragend", { dataTransfer });

  await expect.poll(() => panels.evaluateAll((items) => items.slice(0, 2).map((item) => (
    item.getAttribute("data-panel-id")
  )))).toEqual([initial[1], initial[0]]);
});

async function armPendingMutationSurfaceObservation(
  page,
  pendingLabel,
  { requireDisabled = false } = {},
) {
  await page.evaluate(({ label, requireDisabled: disabledOnly }) => {
    globalThis.__SIMEX_PENDING_OBSERVATION__ = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error(`Pending label "${label}" was not rendered.`)),
        10_000,
      );
      const inspect = () => {
        const pending = [...document.querySelectorAll("button")]
          .find((button) => (
            button.getAttribute("aria-label") === label
            || button.textContent?.trim() === label
          ));
        if (!pending || (disabledOnly && !pending.matches(":disabled"))) return;
        clearTimeout(timeoutId);
        observer.disconnect();
        const controls = [...document.querySelectorAll([
          ".header-text-edit-fields input",
          ".dashboard-meta input",
          ".edit-command-banner button",
          ".edit-command-banner input",
          ".page-tabs button",
          ".page-tabs input",
          ".section-edit-field input",
          ".section-actions button",
          ".panel-actions button",
        ].join(","))];
        resolve({
          pendingDisabled: pending.matches(":disabled"),
          controlCount: controls.length,
          enabledControls: controls
            .filter((control) => !control.matches(":disabled"))
            .map((control) => control.getAttribute("aria-label") ?? control.textContent?.trim()),
          draggablePanelIds: [...document.querySelectorAll(".chart-panel")]
            .filter((panel) => panel.draggable)
            .map((panel) => panel.getAttribute("data-panel-id")),
        });
      };
      const observer = new MutationObserver(inspect);
      observer.observe(document.body, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true,
      });
      inspect();
    });
  }, { label: pendingLabel, requireDisabled });
}

async function readPendingMutationSurfaceObservation(page) {
  return page.evaluate(() => globalThis.__SIMEX_PENDING_OBSERVATION__);
}

async function armPendingChartDismissal(page, dismissal) {
  await page.evaluate((kind) => {
    globalThis.__SIMEX_PENDING_DISMISSAL__ = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error("Chart save never entered its pending state.")),
        10_000,
      );
      const inspect = () => {
        const editor = document.querySelector(".chart-editor-v3");
        const saving = editor?.querySelector('button[aria-label="Saving changes"]');
        if (!saving) return;
        clearTimeout(timeoutId);
        observer.disconnect();
        if (kind === "Escape") {
          document.dispatchEvent(new KeyboardEvent("keydown", {
            bubbles: true,
            cancelable: true,
            key: "Escape",
          }));
        } else {
          document.querySelector(".chart-editor-backdrop")?.dispatchEvent(
            new PointerEvent("pointerdown", { bubbles: true, cancelable: true }),
          );
        }
        resolve({
          editorConnected: editor.isConnected
            && document.querySelector(".chart-editor-v3") === editor,
          savingDisabled: saving.matches(":disabled"),
        });
      };
      const observer = new MutationObserver(inspect);
      observer.observe(document.body, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true,
      });
      inspect();
    });
  }, dismissal);
}

async function armWizardPendingObservation(page) {
  await page.evaluate(() => {
    globalThis.__SIMEX_WIZARD_PENDING_OBSERVATION__ = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error("Chart creation never entered its pending state.")),
        10_000,
      );
      const inspect = () => {
        const wizard = document.querySelector(".chart-wizard-backdrop");
        const creating = wizard?.querySelector('button[aria-label="Creating chart"]');
        if (!creating) return;
        clearTimeout(timeoutId);
        observer.disconnect();
        const discard = [...document.querySelectorAll('[role="dialog"]')]
          .find((dialog) => dialog.getAttribute("aria-labelledby")
            ?.includes("discard-chart"));
        const discardButtons = [...(discard?.querySelectorAll("button") ?? [])];
        resolve({
          creatingDisabled: creating.matches(":disabled"),
          closeDisabled: wizard.querySelector('button[aria-label="Close"]')
            ?.matches(":disabled") ?? false,
          discardVisible: Boolean(discard),
          discardButtonsDisabled: discardButtons.length === 2
            && discardButtons.every((button) => button.matches(":disabled")),
        });
      };
      const observer = new MutationObserver(inspect);
      observer.observe(document.body, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true,
      });
      inspect();
    });
  });
}

async function preparePieWizard(page, title) {
  await page.getByRole("button", { name: "Add chart" }).first().click();
  const wizard = page.locator(".chart-wizard-backdrop");
  await wizard.getByRole("button", { name: /^Chart type\./ }).click();
  await wizard.getByLabel("Search chart types").fill("pie");
  await wizard.getByRole("button", { name: /^Pie\b/i }).click();
  await wizard.getByLabel("Managed data source").selectOption("bio_mortality");
  await wizard.getByRole("button", { name: /^Map and prepare data\./ }).click();
  await wizard.locator('[data-field-id="category"] select').selectOption("Age group");
  await wizard.locator('[data-field-id="value"] select').selectOption("deaths");
  await wizard.getByRole("button", { name: /^Configure chart\./ }).click();
  await expect(wizard.locator(".chart-authoring-preview-ready")).toBeVisible();
  await wizard.getByLabel("Chart title").fill(title);
  await wizard.getByRole("button", { name: /^Review and create\./ }).click();
  await expect(wizard.getByRole("button", { name: "Create chart" })).toBeEnabled();
  return wizard;
}

test("queued dashboard mutation survives final edit-session save", async ({ page }) => {
  test.setTimeout(120_000);
  await openDashboardEditMode(page);
  const actionState = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("button")];
    const addPage = buttons.find((button) => button.textContent?.trim() === "Add page");
    const finish = buttons.find((button) => button.textContent?.trim() === "Finish Build");
    addPage.click();
    finish.click();
    return {
      addDisabled: addPage.matches(":disabled"),
      finishDisabled: finish.matches(":disabled"),
    };
  });
  await expect(page.getByRole("button", { name: "Build", exact: true })).toBeEnabled();

  const saved = await storedDashboard(page);
  const attempts = await page.evaluate(() => globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0);
  expect({ actionState, attempts }).toEqual({
    actionState: {
      addDisabled: false,
      finishDisabled: false,
    },
    attempts: 1,
  });
  expect(saved.pages.map(({ label }) => label)).toContain("New page");
  await page.reload();
  await expect(page.getByRole("button", { name: "New page", exact: true }))
    .toBeVisible();
});

test("pending final save locks the edit mutation surface", async ({ page }) => {
  test.setTimeout(90_000);
  await openDashboardEditMode(page);
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = true; });
  await armPendingMutationSurfaceObservation(page, "Finish Build", { requireDisabled: true });
  await page.getByRole("button", { name: "Finish Build", exact: true }).click();
  const observed = await readPendingMutationSurfaceObservation(page);

  await expect(page.getByRole("button", { name: "Build", exact: true })).toBeEnabled();
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = false; });
  expect(observed.pendingDisabled).toBe(true);
  expect(observed.controlCount).toBeGreaterThan(20);
  expect(observed.enabledControls).toEqual([]);
  expect(observed.draggablePanelIds).toEqual([]);
});

test("pending reset locks the edit mutation surface", async ({ page }) => {
  test.setTimeout(90_000);
  await openDashboardEditMode(page);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Discard these edits?" });
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = true; });
  await armPendingMutationSurfaceObservation(page, "Resetting...");
  await confirmation.getByRole("button", { name: "Reset", exact: true }).click();
  const observed = await readPendingMutationSurfaceObservation(page);

  await expect(page.getByRole("button", { name: "Build", exact: true })).toBeEnabled();
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = false; });
  expect(observed.pendingDisabled).toBe(true);
  expect(observed.controlCount).toBeGreaterThan(20);
  expect(observed.enabledControls).toEqual([]);
  expect(observed.draggablePanelIds).toEqual([]);
});

test("chart save preserves session work when browser storage is full", async ({ page }) => {
  await openFirstChartEditor(page);
  const title = "Session fallback chart title";
  const editor = page.locator(".chart-editor-v3");
  await editor.getByRole("button", { name: "Appearance", exact: true }).click();
  await editor.getByLabel("Chart title").fill(title);
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = true; });
  await editor.getByRole("button", { name: "Save changes" }).click();
  await expect(editor).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: "Browser storage is full" }))
    .toBeVisible();
  await expect(page.getByLabel(`${title} actions`)).toBeVisible();
  const durable = await storedDashboard(page);
  expect((durable?.pages ?? []).flatMap(({ sections }) => sections)
    .flatMap(({ panels }) => panels)
    .some((panel) => panel.title === title)).toBe(false);

  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = false; });
});

for (const dismissal of ["Escape", "backdrop"]) {
  test(`chart modal ignores ${dismissal} while save is pending`, async ({ page }) => {
    test.setTimeout(90_000);
    await openFirstChartEditor(page);
    const editor = page.locator(".chart-editor-v3");
    await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = true; });
    await armPendingChartDismissal(page, dismissal);
    await editor.getByRole("button", { name: "Save changes" }).click();
    expect(await page.evaluate(() => globalThis.__SIMEX_PENDING_DISMISSAL__)).toEqual({
      editorConnected: true,
      savingDisabled: true,
    });
    await expect(editor).toBeHidden();
    await expect(page.getByRole("status").filter({ hasText: "Browser storage is full" }))
      .toBeVisible();
    await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = false; });
  });
}

test("chart removal preserves session work when browser storage is full", async ({ page }) => {
  test.setTimeout(120_000);
  await openFirstChartEditor(page);
  const removedPanelId = await page.locator(".chart-panel").first()
    .getAttribute("data-panel-id");
  const durableBefore = await storedDashboard(page);
  await page.locator(".chart-editor-v3").getByRole("button", { name: "Remove chart" }).click();
  const confirmation = page.getByRole("dialog", { name: "Remove this chart?" });
  await expect(confirmation).toBeVisible();

  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = true; });
  await confirmation.getByRole("button", { name: "Remove chart" }).click();
  await expect(confirmation).toBeHidden();
  await expect(page.locator(".chart-editor-v3")).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: "Browser storage is full" }))
    .toBeVisible();
  await expect(page.locator(`[data-panel-id="${removedPanelId}"]`)).toHaveCount(0);

  const durable = await storedDashboard(page);
  expect(durable).toEqual(durableBefore);

  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = false; });
});

test("non-quota chart removal preserves session work with a bounded fallback", async ({ page }) => {
  test.setTimeout(120_000);
  await openFirstChartEditor(page);
  const removedPanelId = await page.locator(".chart-panel").first()
    .getAttribute("data-panel-id");
  const durableBefore = await storedDashboard(page);
  await page.locator(".chart-editor-v3").getByRole("button", { name: "Remove chart" }).click();
  const confirmation = page.getByRole("dialog", { name: "Remove this chart?" });
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE_NON_QUOTA__ = true; });
  await confirmation.getByRole("button", { name: "Remove chart" }).click();

  await expect(confirmation).toBeHidden();
  await expect(page.locator(".chart-editor-v3")).toBeHidden();
  await expect(page.getByRole("status").filter({
    hasText: "Dashboard changes are applied for this session but cannot be retained after reload.",
  })).toBeVisible();
  await expect(page.locator(`[data-panel-id="${removedPanelId}"]`)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Dashboard configuration error" }))
    .toHaveCount(0);

  const durable = await storedDashboard(page);
  expect(durable).toEqual(durableBefore);

  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE_NON_QUOTA__ = false; });
});

test("timer-owned pending edit uses the bounded session fallback", async ({ page }) => {
  await openDashboardEditMode(page);
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE_LONG__ = true; });
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  const map = page.getByRole("complementary", { name: "Dashboard map" });
  await map.getByRole("treeitem", { name: "Biomedical", exact: true }).click();
  await map.getByRole("button", { name: "Inspector", exact: true }).click();
  await map.getByLabel("Page title", { exact: true }).fill("Timer-owned failed edit");

  const status = page.getByRole("status").filter({
    hasText: "Dashboard changes are applied for this session but cannot be retained after reload.",
  });
  await expect(status).toBeVisible();
  await expect(page.getByRole("heading", { name: "Timer-owned failed edit", exact: true }))
    .toBeVisible();
  const message = await status.textContent();
  expect(message.length).toBeLessThanOrEqual(240);
  expect(await page.evaluate(() => globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0))
    .toBeGreaterThan(0);
});

test("cancelled panel baseline fire-and-forget failure uses the application fallback", async ({ page }) => {
  await openFirstChartEditor(page);
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE_NON_QUOTA__ = true; });
  await page.locator(".chart-editor-v3").getByRole("button", { name: "Cancel" }).click();

  await expect(page.locator(".chart-editor-v3")).toBeHidden();
  await expect(page.getByRole("heading", { name: "Dashboard configuration error" }))
    .toBeVisible();
  await expect(page.locator(".status-panel-error p"))
    .toContainText("Dashboard persistence is temporarily unavailable.");
});

test("removal followed by another editor cancel does not resurrect the chart", async ({ page }) => {
  test.setTimeout(120_000);
  await openFirstChartEditor(page);
  const removedPanelId = await page.locator(".chart-panel").first()
    .getAttribute("data-panel-id");
  const initialPanelCount = await page.locator(".chart-panel").count();

  await page.locator(".chart-editor-v3").getByRole("button", { name: "Remove chart" }).click();
  await page.getByRole("dialog", { name: "Remove this chart?" })
    .getByRole("button", { name: "Remove chart" }).click();
  await expect(page.locator(".chart-editor-v3")).toBeHidden();
  await expect(page.locator(".chart-panel")).toHaveCount(initialPanelCount - 1);

  await page.locator(".chart-panel").first()
    .getByRole("button", { name: "Edit chart" }).click();
  const attemptsBeforeCancel = await page.evaluate(() => (
    globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0
  ));
  await page.locator(".chart-editor-v3").getByRole("button", { name: "Cancel" }).click();
  await expect.poll(() => page.evaluate(() => (
    globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0
  )), { timeout: 60_000 }).toBeGreaterThan(attemptsBeforeCancel);

  const saved = await storedDashboard(page);
  const panelIds = saved.pages.flatMap(({ sections }) => (
    sections.flatMap(({ panels }) => panels.map(({ id }) => id))
  ));
  const synchronizedChartIds = (saved.chronoGroups ?? []).flatMap(({ members }) => (
    members.map(({ chartId }) => chartId)
  ));
  expect(panelIds).not.toContain(removedPanelId);
  expect(synchronizedChartIds).not.toContain(removedPanelId);

  await page.reload();
  await expect(page.locator(`[data-panel-id="${removedPanelId}"]`)).toHaveCount(0);
});

test("failed reset reports inside its confirmation and preserves the draft for save", async ({ page }) => {
  test.setTimeout(120_000);
  await openDashboardEditMode(page);
  const editedLabel = "Draft retained after reset failure";
  await page.getByLabel("Program label").fill(editedLabel);
  await page.getByRole("button", { name: "Reset edits", exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Discard these edits?" });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "Reset edits" })
    .evaluate((button) => {
      globalThis.__SIMEX_FAIL_SAVE_ONCE__ = true;
      button.click();
    });

  await expect(confirmation).toBeVisible();
  await expect(confirmation.getByRole("alert"))
    .toContainText("Browser storage is full");
  await expect(page.getByLabel("Program label")).toHaveValue(editedLabel);
  await confirmation.getByRole("button", { name: "Keep editing" }).click();
  await expect(confirmation).toBeHidden();
  await expect(page.locator(".edit-operation-error")).toHaveCount(0);

  await page.getByRole("button", { name: "Save edits" }).click();
  await expect(page.getByRole("button", { name: "Build" })).toBeVisible();
  await page.reload();
  await expect(page.locator(".dashboard-brand-block .eyebrow")).toHaveText(
    editedLabel,
    { timeout: 60_000 },
  );
});

test("successful reset clears renderer drafts and chart baseline", async ({ page }) => {
  test.setTimeout(120_000);
  await openDashboardEditMode(page);
  const programInput = page.getByLabel("Program label");
  const pageTitleInput = page.getByLabel("Page title");
  const sectionTitleInput = page.locator(".section-edit-field input").first();
  const baseline = {
    program: await programInput.inputValue(),
    pageTitle: await pageTitleInput.inputValue(),
    sectionTitle: await sectionTitleInput.inputValue(),
  };
  await programInput.fill("Reset-only program draft");
  await pageTitleInput.fill("Reset-only page draft");
  await sectionTitleInput.fill("Reset-only section draft");
  await page.locator(".chart-panel").first()
    .getByRole("button", { name: "Edit chart" }).click();

  await page.getByRole("button", { name: "Reset edits", exact: true })
    .evaluate((button) => button.click());
  await page.getByRole("dialog", { name: "Discard these edits?" })
    .getByRole("button", { name: "Reset edits" }).click();
  await expect(page.getByRole("button", { name: "Build" })).toBeVisible();

  await page.getByRole("button", { name: "Build" }).click();
  await expect(page.getByLabel("Program label")).toHaveValue(baseline.program);
  await expect(page.getByLabel("Page title")).toHaveValue(baseline.pageTitle);
  await expect(page.locator(".section-edit-field input").first())
    .toHaveValue(baseline.sectionTitle);

  const attemptsBeforeCancel = await page.evaluate(() => (
    globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0
  ));
  await page.locator(".chart-panel").first()
    .getByRole("button", { name: "Edit chart" }).click();
  await page.locator(".chart-editor-v3").getByRole("button", { name: "Cancel" }).click();
  await expect.poll(() => page.evaluate(() => (
    globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0
  )), { timeout: 60_000 }).toBeGreaterThan(attemptsBeforeCancel);

  await page.reload();
  await expect(page.locator(".dashboard-brand-block .eyebrow")).toHaveText(baseline.program);
  await page.getByRole("button", { name: "Biomedical", exact: true }).click();
  await expect(page.getByRole("heading", { name: baseline.pageTitle, exact: true }))
    .toBeVisible();
  await expect(page.getByRole("heading", { name: baseline.sectionTitle, exact: true }))
    .toBeVisible();
});

test("wizard create transaction coalesces, locks dismissal, and preserves session work when storage is full", async ({ page }) => {
  test.setTimeout(240_000);
  await openDashboardEditMode(page);
  const title = "Retried transaction chart";
  const wizard = await preparePieWizard(page, title);
  await wizard.getByRole("button", { name: "Discard chart draft" }).click();
  const discard = page.getByRole("dialog", { name: "Discard chart?" });
  await expect(discard).toBeVisible();

  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = true; });
  await armWizardPendingObservation(page);
  await page.evaluate(() => {
    const create = document.querySelector(
      '.chart-wizard-backdrop button[aria-label="Create chart"]',
    );
    create.click();
    create.click();
    document.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Escape",
    }));
  });
  const pending = await page.evaluate(() => globalThis.__SIMEX_WIZARD_PENDING_OBSERVATION__);
  await expect(page.getByRole("status").filter({ hasText: "Browser storage is full" }))
    .toBeVisible();
  expect(await page.evaluate(() => globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0)).toBe(1);
  expect(pending).toEqual({
    creatingDisabled: true,
    closeDisabled: true,
    discardVisible: true,
    discardButtonsDisabled: true,
  });

  await expect(wizard).toBeHidden();
  await expect(discard).toHaveCount(0);
  await expect(page.getByLabel(`${title} actions`)).toBeVisible();
  const durable = await storedDashboard(page);
  expect((durable?.pages ?? []).flatMap(({ sections }) => sections)
    .flatMap(({ panels }) => panels)
    .some((panel) => panel.title === title && panel.typeId === "pie"))
    .toBe(false);
});

test("failed edit-session save and reset keep edit mode available for retry", async ({ page }) => {
  await openDashboardEditMode(page);
  await page.getByLabel("Program label").fill("Unsaved exercise label");
  await page.getByRole("button", { name: "Save edits" }).evaluate((button) => {
    globalThis.__SIMEX_FAIL_SAVE_ONCE__ = true;
    button.click();
  });
  await expect(page.getByRole("button", { name: "Save edits" })).toBeVisible();
  await expect(page.locator(".edit-operation-error")).toContainText("Browser storage is full");

  await page.getByRole("button", { name: "Reset edits" }).click();
  const confirmation = page.getByRole("dialog", { name: "Discard these edits?" });
  await confirmation.getByRole("button", { name: "Reset edits" }).evaluate((button) => {
    globalThis.__SIMEX_FAIL_SAVE_ONCE__ = true;
    button.click();
  });
  await expect(confirmation).toBeVisible();
  await expect(page.getByRole("button", { name: "Save edits" })).toBeVisible();

  await confirmation.getByRole("button", { name: "Reset edits" }).click();
  await expect(page.getByRole("button", { name: "Build" })).toBeVisible();
});

test("failed final edit-session commit keeps the chart edit context available", async ({ page }) => {
  await openFirstChartEditor(page);
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = true; });
  await page.getByRole("button", { name: "Save edits" }).evaluate((button) => button.click());
  await expect(page.getByRole("button", { name: "Save edits" })).toBeVisible();
  await expect(page.locator(".chart-editor-v3")).toBeVisible();
  await expect(page.locator(".chart-editor-v3").getByRole("button", { name: "Cancel" })).toBeVisible();
  await expect(page.locator(".edit-operation-error")).toContainText("Browser storage is full");

  const failedSaveAttempts = await page.evaluate(() => globalThis.__SIMEX_SAVE_ATTEMPTS__);
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = false; });
  await page.locator(".chart-editor-v3").getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator(".chart-editor-v3")).toBeHidden();
  await expect.poll(() => page.evaluate(() => globalThis.__SIMEX_SAVE_ATTEMPTS__), { timeout: 5_000 })
    .toBe(failedSaveAttempts + 1);
});
