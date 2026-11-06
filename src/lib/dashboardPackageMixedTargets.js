import { dashboardPackageSectionKey } from "./dashboardPackageSelection.js";

const pageName = page => (page.label || page.title || "Untitled page").trim();
const sectionName = section => (section.title || "Untitled section").trim();
const eligible = page => !page.landing && page.pageType !== "landing";

/** Resolve all container identities before copying any panels or their drills. */
export function planMixedPackageTargets({ current, source, selected, destination, resolutions, map }) {
  const pages = [], sections = [], placements = [], requirements = [];
  const receivingPages = current.pages.filter(eligible);
  const createdPages = new Map();
  const createdSections = new Map();
  const desired = (kind, id, fallback) => resolutions.names?.[kind]?.[id]?.trim() || fallback;
  const pageOptions = items => items.map(page => ({ id: page.id, name: pageName(page),
    label: items.filter(other => pageName(other) === pageName(page)).length > 1
      ? `${pageName(page)} (page ${current.pages.indexOf(page) + 1})` : pageName(page) }));
  const sectionOptions = items => items.map((section, index) => ({ id: section.id, name: sectionName(section),
    label: items.filter(other => sectionName(other) === sectionName(section)).length > 1
      ? `${sectionName(section)} (match ${index + 1}, ${section.panels.length} panels)` : sectionName(section) }));
  const targetPage = (choice, key) => {
    if (choice?.newPageTitle !== undefined) {
      const title = choice.newPageTitle.trim();
      if (!title) return null;
      const matches = receivingPages.filter(page => pageName(page) === title);
      if (matches.length === 1) return matches[0];
      if (matches.length > 1) return null;
      const shared = [...createdPages.values()].find(page => pageName(page) === title);
      if (shared) return shared;
      const id = map.targetPages[key];
      if (!createdPages.has(id)) createdPages.set(id, { id, title, label: title, sections: [] });
      return createdPages.get(id);
    }
    return receivingPages.find(page => page.id === choice?.pageId) ?? null;
  };

  for (const incoming of source.pages.filter(page => selected.pageIds.includes(page.id))) {
    const title = desired("pages", incoming.id, pageName(incoming));
    const matches = receivingPages.filter(page => pageName(page) === title);
    let target = matches.length === 1 ? matches[0] : null;
    if (matches.length > 1) {
      target = matches.find(page => page.id === destination.pageTargets?.[incoming.id]) ?? null;
      requirements.push({ kind: "page", key: incoming.id, name: title,
        pageOptions: pageOptions(matches), pageId: target?.id, resolved: Boolean(target) });
    } else if (matches.length === 0) {
      target = { ...incoming, id: map.pages[incoming.id], title, label: title, sections: [] };
      createdPages.set(target.id, target);
    }
    if (!target) continue;
    const existing = receivingPages.includes(target);
    map.pages[incoming.id] = target.id;
    pages.push({ incoming, target, existing });
  }

  for (const incomingPage of source.pages) for (const incoming of incomingPage.sections) {
    const key = dashboardPackageSectionKey(incomingPage.id, incoming.id);
    if (!selected.sectionIds.includes(key)) continue;
    const parentSelected = selected.pageIds.includes(incomingPage.id);
    const choice = destination.sectionTargets?.[key];
    const page = parentSelected ? pages.find(row => row.incoming.id === incomingPage.id)?.target : targetPage(choice, key);
    const title = desired("sections", key, sectionName(incoming));
    const matches = page?.sections.filter(section => sectionName(section) === title) ?? [];
    const target = matches.length === 1 ? matches[0] : matches.find(section => section.id === choice?.sectionId);
    const resolved = Boolean(page) && (matches.length < 2 || Boolean(target));
    if (!parentSelected || matches.length > 1) requirements.push({ kind: "section", key, name: title,
      breadcrumb: pageName(incomingPage), pageOptions: pageOptions(receivingPages), pageId: page?.id,
      pageFixed: parentSelected, matchingSections: sectionOptions(matches), sectionId: target?.id, resolved });
    if (!resolved) continue;
    const id = target?.id ?? map.sections[key];
    map.sections[key] = id;
    sections.push({ incoming, incomingPageId: incomingPage.id, key, pageId: page.id, sectionId: id,
      existing: Boolean(target), target, title });
  }

  for (const incomingPage of source.pages) for (const incoming of incomingPage.sections) {
    const key = dashboardPackageSectionKey(incomingPage.id, incoming.id);
    if (selected.sectionIds.includes(key)) continue;
    const panels = incoming.panels.filter(panel => selected.placementIds.includes(panel.id));
    if (!panels.length) continue;
    const choice = destination.placementTargets?.[key];
    const page = targetPage(choice, key);
    let section = page?.sections.find(section => section.id === choice?.sectionId);
    let createSection = false;
    if (page && (choice?.newSectionTitle !== undefined || choice?.newPageTitle !== undefined)) {
      const title = (choice.newSectionTitle ?? "Imported charts").trim();
      const matches = page.sections.filter(section => sectionName(section) === title);
      const sharedKey = JSON.stringify([page.id, title]);
      const shared = createdSections.get(sharedKey);
      section = title && matches.length === 0 ? shared ?? { id: map.targetSections[key], title, panels: [] }
        : matches.length === 1 ? matches[0] : null;
      createSection = Boolean(section) && !page.sections.includes(section) && !shared;
      if (createSection) createdSections.set(sharedKey, section);
    }
    const resolved = Boolean(page && section);
    requirements.push({ kind: "placements", key, name: `${panels.length} ${panels.length === 1 ? "panel" : "panels"}`,
      breadcrumb: `${pageName(incomingPage)} / ${sectionName(incoming)}`, pageOptions: pageOptions(receivingPages),
      pageId: page?.id, sectionId: section?.id, sectionOptions: sectionOptions(page?.sections ?? []), resolved });
    if (resolved) placements.push({ panels, pageId: page.id, section, createSection });
  }
  // New destinations and imported pages share the existing transaction identity.
  const referenced = new Set([...sections, ...placements].map(row => row.pageId));
  const destinationPages = [...createdPages.values()].filter(page => referenced.has(page.id) && !pages.some(row => row.target.id === page.id));
  return { pages, sections, placements, destinationPages, requirements };
}
