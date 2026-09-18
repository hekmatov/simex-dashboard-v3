export const SECTION_ROLES = Object.freeze(["standard", "attention"]);
export const ATTENTION_STRIP_CHART_TYPES = Object.freeze(["kpi", "deltaCard"]);

const CHART_TYPE_LABELS = Object.freeze({ kpi: "KPI card", deltaCard: "Delta card" });

export function sectionRole(section) {
  return section?.role === "attention" ? "attention" : "standard";
}

export function partitionPageSections(page) {
  const sections = page?.sections ?? [];
  const attention = sections.find((section) => sectionRole(section) === "attention") ?? null;
  return {
    attention,
    body: sections.filter((section) => section !== attention),
  };
}

export function chartOfPanel(panel) {
  return panel?.chart ?? panel;
}

export function attentionRoleIssues(page, section) {
  const issues = [];
  const existing = (page?.sections ?? []).find((candidate) => (
    candidate !== section && candidate.id !== section?.id && sectionRole(candidate) === "attention"
  ));
  if (existing) issues.push(`${existing.title || existing.id} is already this page's attention strip.`);
  for (const panel of section?.panels ?? []) {
    const chart = chartOfPanel(panel);
    if (ATTENTION_STRIP_CHART_TYPES.includes(chart?.typeId)) continue;
    issues.push(`${chart?.title || chart?.id} is a ${chart?.typeId ?? "unknown"} chart. Only ${Object.values(CHART_TYPE_LABELS).join(" and ")} charts can sit in the attention strip.`);
  }
  return issues;
}

export function drillTargetsForPage(page, attentionSectionId) {
  return (page?.sections ?? [])
    .filter((section) => section.id !== attentionSectionId && sectionRole(section) !== "attention")
    .flatMap((section) => [
      { kind: "section", id: section.id, title: section.title || section.id },
      ...(section.panels ?? []).map((panel) => {
        const chart = chartOfPanel(panel);
        return { kind: "chart", id: chart.id, title: chart.title || chart.id };
      }),
    ]);
}

export function resolveDrillTarget(page, drill) {
  if (!drill || typeof drill !== "object") return null;
  const { attention } = partitionPageSections(page);
  const id = drill.kind === "section" ? drill.sectionId : drill.kind === "chart" ? drill.chartId : null;
  if (!id) return null;
  return drillTargetsForPage(page, attention?.id ?? null).find((target) => target.kind === drill.kind && target.id === id) ?? null;
}
