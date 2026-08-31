const DEFINITIONS = Object.freeze({
  "dashboard.look.saved": definition("Dashboard appearance", "Dashboard appearance saved."),
  "dashboard.settings.updated": definition("Dashboard settings", "Dashboard settings updated."),
  "dashboard.reset": definition("Dashboard", "Dashboard changes discarded."),
  "dashboard.content.deleted": definition("Dashboard content", "Dashboard content deleted.", "warning"),
  "package.imported": definition("Dashboard package", "Dashboard package imported."),
  "package.exported": definition("Dashboard package", "Dashboard package exported."),
  "dashboard.restored": definition("Online dashboard", "Online dashboard restored."),
  "layout.draft.created": definition("Layout draft", "Layout draft created."),
  "layout.draft.updated": definition("Layout draft", "Updating layout draft."),
  "layout.saved": definition("Layout", "Layout changes saved."),
  "layout.discarded": definition("Layout draft", "Layout changes discarded."),
  "chart.draft.created": definition("Chart draft", subjectMessage("Chart draft created", "Chart draft created for")),
  "chart.draft.reset": definition("Chart draft", subjectMessage("Chart draft reset", "Chart draft reset for")),
  "chart.draft.suspended": definition("Chart draft", subjectMessage("Chart draft suspended", "Chart draft suspended for")),
  "chart.draft.resumed": definition("Chart draft", subjectMessage("Chart draft resumed", "Chart draft resumed for")),
  "chart.draft.discarded": definition("Chart draft", subjectMessage("Chart draft discarded", "Chart draft discarded for")),
  "chart.created": definition("Chart", subjectMessage("Chart created", "Chart created")),
  "chart.saved": definition("Chart", subjectMessage("Chart saved", "Chart saved")),
  "chart.deleted": definition("Chart", subjectMessage("Chart deleted", "Chart deleted"), "warning"),
  "panel.moved": definition("Panel", subjectMessage("Panel moved", "Panel moved")),
  "page.created": definition("Page", subjectMessage("Page created", "Page created")),
  "page.updated": definition("Page", subjectMessage("Updating page", "Updating page")),
  "page.reordered": definition("Page", subjectMessage("Page reordered", "Page reordered")),
  "page.deleted": definition("Page", subjectMessage("Page deleted", "Page deleted"), "warning"),
  "section.created": definition("Section", subjectMessage("Section created", "Section created")),
  "section.updated": definition("Section", subjectMessage("Updating section", "Updating section")),
  "section.reordered": definition("Section", subjectMessage("Section reordered", "Section reordered")),
  "section.deleted": definition("Section", subjectMessage("Section deleted", "Section deleted"), "warning"),
  "static.draft.created": definition("Content draft", subjectMessage("Content draft created", "Content draft created for")),
  "static.draft.suspended": definition("Content draft", subjectMessage("Content draft suspended", "Content draft suspended for")),
  "static.draft.resumed": definition("Content draft", subjectMessage("Content draft resumed", "Content draft resumed for")),
  "static.draft.discarded": definition("Content draft", subjectMessage("Content draft discarded", "Content draft discarded for")),
  "static.saved": definition("Dashboard content", subjectMessage("Dashboard content saved", "Dashboard content saved for")),
  "source.draft.created": definition("Data-source draft", subjectMessage("Data-source draft created", "Data-source draft created for")),
  "source.draft.discarded": definition("Data-source draft", subjectMessage("Data-source draft discarded", "Data-source draft discarded for")),
  "source.saved": definition("Data source", subjectMessage("Data source saved", "Data source saved")),
  "source.deleted": definition("Data source", subjectMessage("Data source deleted", "Data source deleted"), "warning"),
  "chrono.draft.created": definition("Chrono Group draft", subjectMessage("Chrono Group draft created", "Chrono Group draft created for")),
  "chrono.draft.updated": definition("Chrono Group draft", subjectMessage("Updating Chrono Group draft", "Updating Chrono Group draft")),
  "chrono.draft.suspended": definition("Chrono Group draft", subjectMessage("Chrono Group draft suspended", "Chrono Group draft suspended for")),
  "chrono.draft.resumed": definition("Chrono Group draft", subjectMessage("Chrono Group draft resumed", "Chrono Group draft resumed for")),
  "chrono.draft.discarded": definition("Chrono Group draft", subjectMessage("Chrono Group draft discarded", "Chrono Group draft discarded for")),
  "chrono.saved": definition("Chrono Group", subjectMessage("Chrono Group saved", "Chrono Group saved")),
  "chrono.deleted": definition("Chrono Group", subjectMessage("Chrono Group deleted", "Chrono Group deleted"), "warning"),
  "scene.draft.created": definition("Scene draft", subjectMessage("Scene draft created", "Scene draft created for")),
  "scene.draft.updated": definition("Scene draft", subjectMessage("Updating scene draft", "Updating scene draft")),
  "scene.draft.suspended": definition("Scene draft", subjectMessage("Scene draft suspended", "Scene draft suspended for")),
  "scene.draft.resumed": definition("Scene draft", subjectMessage("Scene draft resumed", "Scene draft resumed for")),
  "scene.draft.discarded": definition("Scene draft", subjectMessage("Scene draft discarded", "Scene draft discarded for")),
  "scene.saved": definition("Scene", subjectMessage("Scene saved", "Scene saved")),
  "scene.deleted": definition("Scene", subjectMessage("Scene deleted", "Scene deleted"), "warning"),
});

export const DASHBOARD_CONTENT_ACTIVITY_IDS = Object.freeze(Object.keys(DEFINITIONS));

export function describeDashboardContentActivity(actionId, {
  subject,
  detail,
  key,
  intent,
} = {}) {
  const activity = DEFINITIONS[actionId];
  if (!activity) throw new Error(`Unknown dashboard content activity "${String(actionId)}".`);
  const normalizedSubject = optionalText(subject);
  const baseMessage = typeof activity.message === "function"
    ? activity.message(normalizedSubject)
    : activity.message;
  return Object.freeze({
    key: optionalText(key)
      ?? `content:${actionId}${normalizedSubject ? `:${normalizedSubject}` : ""}`,
    label: activity.label,
    message: appendDetail(baseMessage, detail),
    intent: optionalText(intent) ?? activity.intent,
  });
}

export function reportDashboardContentActivity(reportActivity, actionId, options) {
  if (typeof reportActivity !== "function") {
    throw new TypeError("Dashboard content activity requires a reporter.");
  }
  return reportActivity(describeDashboardContentActivity(actionId, options));
}

export function beginDashboardContentOperation(beginOperation, actionId, {
  workingLabel,
  blocking = false,
  priority = true,
  ...options
} = {}) {
  if (typeof beginOperation !== "function") {
    throw new TypeError("Dashboard content operation requires an operation starter.");
  }
  const completed = describeDashboardContentActivity(actionId, options);
  const operation = beginOperation({
    key: completed.key,
    label: optionalText(workingLabel) ?? completed.label,
    blocking,
    priority,
    intent: completed.intent,
  });
  return Object.freeze({
    beforeWork() {
      return operation.beforeWork();
    },
    succeed(message = completed.message) {
      return operation.succeed(message);
    },
    fail(error) {
      return operation.fail(error);
    },
    dismiss() {
      return operation.dismiss();
    },
  });
}

export async function runDashboardContentOperation(operation, work) {
  if (!operation || typeof operation.beforeWork !== "function") {
    throw new TypeError("Dashboard content work requires an operation handle.");
  }
  if (typeof work !== "function") {
    throw new TypeError("Dashboard content work requires a callback.");
  }
  try {
    await operation.beforeWork();
    const result = await work();
    operation.succeed();
    return result;
  } catch (error) {
    operation.fail(error);
    throw error;
  }
}

function definition(label, message, intent = "info") {
  return Object.freeze({ label, message, intent });
}

function subjectMessage(withoutSubject, withSubject) {
  return (subject) => subject
    ? `${withSubject} “${subject}”.`
    : `${withoutSubject}.`;
}

function appendDetail(message, detail) {
  const normalized = optionalText(detail);
  return normalized ? `${message} ${normalized}` : message;
}

function optionalText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
