const ENDED_PROJECTION = Object.freeze({
  kind: "ended",
  heading: "Presentation ended",
  body: "This display is no longer active.",
});

const UNACCEPTED_REASON = Object.freeze({
  code: "unaccepted_audience_message",
  message: "Audience projection requires a validated V3 state or ended message.",
});

const SRGB_COMPONENT = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?%?`;
const CSS_SRGB_COLOR = new RegExp(
  String.raw`color\(\s*srgb\s+(${SRGB_COMPONENT})\s+(${SRGB_COMPONENT})\s+(${SRGB_COMPONENT})(?:\s*\/\s*(${SRGB_COMPONENT}))?\s*\)`,
  "gi",
);

export function projectAudienceSnapshot(message, lastValid = null) {
  const retained = clone(lastValid);
  if (message?.accepted === false) {
    return immutableResult({
      accepted: false,
      projection: retained,
      lastValid: retained,
      reason: clone(message.reason ?? UNACCEPTED_REASON),
    });
  }
  if (!isAcceptedEnvelope(message)) {
    return immutableResult({
      accepted: false,
      projection: retained,
      lastValid: retained,
      reason: clone(UNACCEPTED_REASON),
    });
  }
  if (message.type === "ended") {
    return immutableResult({
      accepted: true,
      projection: clone(ENDED_PROJECTION),
      lastValid: retained,
      reason: null,
    });
  }

  const projection = projectPresentationState(message.payload);
  return immutableResult({
    accepted: true,
    projection,
    lastValid: projection,
    reason: null,
  });
}

export function projectPresentationState(state) {
  const snapshot = clone(state);
  return deepFreeze({
    kind: "output",
    mode: snapshot.output_mode,
    blackout: snapshot.blackout,
    dashboardRevision: snapshot.dashboard_revision,
    theme: snapshot.theme,
    source: snapshot.source,
    composition: snapshot.composition,
    timeline: snapshot.timeline,
    matching: snapshot.matching,
    audience: snapshot.audience,
    payload: snapshot.payload,
  });
}

export function sanitizeAudienceSnapshotCloneColors(
  clonedDocument,
  _clonedReferenceElement,
  readComputedStyle,
) {
  const source = clonedDocument?.querySelector?.(".audience-snapshot-source");
  if (!source) return 0;
  const styleReader = readComputedStyle
    ?? clonedDocument.defaultView?.getComputedStyle?.bind(clonedDocument.defaultView);
  if (typeof styleReader !== "function") return 0;

  let normalizedPropertyCount = 0;
  for (const element of [source, ...source.querySelectorAll("*")]) {
    const computedStyle = styleReader(element);
    for (const property of computedStyle) {
      const currentValue = computedStyle.getPropertyValue(property);
      const compatibleValue = normalizeCssSrgbColors(currentValue);
      if (compatibleValue === currentValue) continue;
      element.style.setProperty(property, compatibleValue);
      normalizedPropertyCount += 1;
    }
  }
  return normalizedPropertyCount;
}

function isAcceptedEnvelope(message) {
  return message?.protocol_version === 3
    && typeof message.session_id === "string"
    && Number.isSafeInteger(message.sequence)
    && message.sequence > 0
    && (
      (message.type === "state" && message.payload && typeof message.payload === "object")
      || (message.type === "ended" && message.payload === null)
    );
}

function immutableResult(result) {
  return deepFreeze(clone(result));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function normalizeCssSrgbColors(value) {
  return value.replace(CSS_SRGB_COLOR, (_match, red, green, blue, alpha = "1") => (
    `rgba(${toByte(red)}, ${toByte(green)}, ${toByte(blue)}, ${toUnitInterval(alpha)})`
  ));
}

function toByte(value) {
  return Math.round(toUnitInterval(value) * 255);
}

function toUnitInterval(value) {
  const numeric = value.endsWith("%")
    ? Number.parseFloat(value) / 100
    : Number.parseFloat(value);
  return Math.min(1, Math.max(0, numeric));
}
