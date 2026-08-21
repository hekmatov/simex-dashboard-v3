export function resolveDestination({ pageId, sectionId, proposedStructure = null } = {}, dashboard = {}) {
  const pages = Array.isArray(dashboard?.pages) ? dashboard.pages : [];
  const errors = [];
  const savedPage = pages.find((page) => page?.id === pageId) ?? null;
  const proposal = isRecord(proposedStructure) ? proposedStructure : null;
  const proposedPage = isRecord(proposal?.page) ? proposal.page : null;
  const proposedSection = isRecord(proposal?.section) ? proposal.section : null;

  let page = savedPage;
  let section = null;
  let source = "saved";

  if (proposedPage) {
    if (savedPage || pages.some(({ id }) => id === proposedPage.id)) {
      errors.push(issue(
        "PROPOSED_PAGE_ID_DUPLICATE",
        `Proposed page identity "${String(proposedPage.id)}" already exists.`,
      ));
    } else if (!validIdentity(proposedPage.id) || proposedPage.id !== pageId) {
      errors.push(issue(
        "PROPOSED_PAGE_ID_INVALID",
        "The proposed page requires a valid identity matching the selected destination.",
      ));
    } else if (!validLabel(proposedPage.label ?? proposedPage.title)) {
      errors.push(issue("PROPOSED_PAGE_NAME_REQUIRED", "Name the proposed destination page."));
    }
    if (!proposedSection) {
      errors.push(issue(
        "PROPOSED_SECTION_REQUIRED",
        "A new page must include its initial section proposal.",
      ));
    }
    page = proposedPage;
    section = proposedSection;
    source = "proposed-page-and-section";
  } else if (!savedPage) {
    errors.push(issue(
      "DESTINATION_PAGE_MISSING",
      `Destination page "${String(pageId)}" no longer exists. Choose or propose an eligible page.`,
    ));
  }

  if (page && !proposedPage) {
    const sections = Array.isArray(page.sections) ? page.sections : [];
    const savedSection = sections.find((entry) => entry?.id === sectionId) ?? null;
    if (proposedSection) {
      if (savedSection || sections.some(({ id }) => id === proposedSection.id)) {
        errors.push(issue(
          "PROPOSED_SECTION_ID_DUPLICATE",
          `Proposed section identity "${String(proposedSection.id)}" already exists on the destination page.`,
        ));
      } else if (!validIdentity(proposedSection.id) || proposedSection.id !== sectionId) {
        errors.push(issue(
          "PROPOSED_SECTION_ID_INVALID",
          "The proposed section requires a valid identity matching the selected destination.",
        ));
      } else if (!validLabel(proposedSection.title ?? proposedSection.label)) {
        errors.push(issue("PROPOSED_SECTION_NAME_REQUIRED", "Name the proposed destination section."));
      }
      section = proposedSection;
      source = "proposed-section";
    } else if (savedSection) {
      section = savedSection;
    } else {
      errors.push(issue(
        "DESTINATION_SECTION_MISSING",
        `Destination section "${String(sectionId)}" no longer exists. Choose or propose an eligible section.`,
      ));
    }
  }

  if (proposedPage && proposedSection) {
    if (!validIdentity(proposedSection.id) || proposedSection.id !== sectionId) {
      errors.push(issue(
        "PROPOSED_SECTION_ID_INVALID",
        "The proposed initial section requires a valid identity matching the selected destination.",
      ));
    } else if (!validLabel(proposedSection.title ?? proposedSection.label)) {
      errors.push(issue("PROPOSED_SECTION_NAME_REQUIRED", "Name the proposed initial section."));
    }
  }

  if (page && section && !eligibleDestination(page, section)) {
    errors.push(issue(
      "DESTINATION_UNSUPPORTED",
      "This destination cannot expose one canonical panel and Structure identity. Choose an eligible dashboard section.",
    ));
  }

  const pageLabel = destinationLabel(
    page?.label ?? page?.title,
    pageId,
    "page",
  );
  const sectionLabel = destinationLabel(
    section?.title ?? section?.label,
    sectionId,
    "section",
  );
  const orderedText = `Page: ${pageLabel}. Section: ${sectionLabel}.`;
  const status = errors.length === 0 ? "valid" : "invalid";
  const revision = revisionFor("destination", {
    pageId: pageId ?? null,
    sectionId: sectionId ?? null,
    pageLabel,
    sectionLabel,
    pageType: page?.pageType ?? null,
    pageSupportsCanonicalPanels: page?.supportsCanonicalPanels ?? null,
    sectionSupportsCanonicalPanels: section?.supportsCanonicalPanels ?? null,
    sectionSurfaceType: section?.surfaceType ?? null,
    panelChartIds: panelChartIds(section),
    source,
    status,
    errorCodes: errors.map(({ code }) => code),
  });

  return {
    status,
    editable: true,
    revision,
    destination: {
      pageId: pageId ?? null,
      sectionId: sectionId ?? null,
      pageLabel,
      sectionLabel,
      source,
      orderedText,
      proposedStructure: proposal ? structuredClone(proposal) : null,
    },
    errors,
  };
}

export function destinationIdentity(value) {
  const resolution = value?.destination && value?.revision ? value : null;
  const destination = resolution?.destination ?? value ?? {};
  return {
    pageId: destination.pageId ?? null,
    sectionId: destination.sectionId ?? null,
    pageLabel: destination.pageLabel ?? null,
    sectionLabel: destination.sectionLabel ?? null,
    revision: resolution?.revision ?? destination.revision ?? null,
    status: resolution?.status ?? destination.status ?? null,
  };
}

function eligibleDestination(page, section) {
  if (page.pageType === "landing" || page.landing !== undefined) return false;
  if (page.supportsCanonicalPanels === false || section.supportsCanonicalPanels === false) return false;
  return !["custom", "home", "landing"].includes(section.surfaceType);
}

function panelChartIds(section) {
  if (!Array.isArray(section?.panels)) return [];
  return section.panels.map((panel) => panel?.chart?.id ?? panel?.id ?? null);
}

function destinationLabel(label, id, kind) {
  if (validLabel(label)) return label.trim();
  return `Missing ${kind} (${String(id)})`;
}

function validIdentity(value) {
  return typeof value === "string"
    && value.trim() !== ""
    && /^[A-Za-z][A-Za-z0-9_-]*$/.test(value);
}

function validLabel(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function issue(code, message) {
  return { code, message, retryable: true };
}

function revisionFor(prefix, value) {
  const source = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
