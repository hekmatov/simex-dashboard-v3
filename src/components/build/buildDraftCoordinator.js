const SLOT_NAMES = Object.freeze(["layout", "chart"]);
const UNRESOLVED_STATUSES = new Set(["dirty", "error", "suspended"]);

export function createBuildDraftCoordinatorState() {
  return {
    slots: { layout: null, chart: null },
    activeAuxiliary: null,
    parkedAuxiliaries: [],
    resolutionRequest: null,
  };
}

export function reduceBuildDraftCoordinator(state, action) {
  switch (action?.type) {
    case "OPEN_SLOT": {
      assertSlot(action.slot);
      return {
        ...state,
        slots: {
          ...state.slots,
          [action.slot]: action.draft,
        },
      };
    }

    case "MARK_DIRTY":
      return updateSlot(state, action.slot, (slot) => ({
        ...slot,
        status: "dirty",
        resolution: null,
        error: undefined,
      }));

    case "REQUEST_RESOLUTION":
      return requestResolution(state, action.slots, action.reason);

    case "RESOLUTION_SUCCEEDED": {
      assertSlot(action.slot);
      if (action.choice !== "save" && action.choice !== "discard") {
        throw new Error(`Unsupported Build draft resolution choice: ${action.choice}`);
      }
      const current = requireSlot(state, action.slot);
      const resolved = action.choice === "discard"
        ? null
        : withoutTransientFields({
          ...current,
          status: "clean",
          resolution: "save",
          savedValue: action.savedValue,
        });
      return finishResolution({
        ...state,
        slots: { ...state.slots, [action.slot]: resolved },
      }, action.slot);
    }

    case "RESOLUTION_FAILED": {
      assertSlot(action.slot);
      const current = requireSlot(state, action.slot);
      const failedState = {
        ...state,
        slots: {
          ...state.slots,
          [action.slot]: {
            ...current,
            status: "error",
            resolution: null,
            attemptedResolution: action.choice,
            error: action.error,
          },
        },
      };
      if (!state.resolutionRequest) return failedState;
      const remaining = state.resolutionRequest.remaining.includes(action.slot)
        ? state.resolutionRequest.remaining
        : [...state.resolutionRequest.remaining, action.slot];
      return {
        ...failedState,
        resolutionRequest: { ...state.resolutionRequest, remaining },
      };
    }

    case "SUSPEND_SLOT":
      return updateSlot(state, action.slot, (slot) => ({
        ...slot,
        statusBeforeSuspend: slot.status,
        status: "suspended",
        restoration: {
          ...slot.restoration,
          ...action.restoration,
        },
      }));

    case "RESUME_SLOT":
      return updateSlot(state, action.slot, (slot) => {
        const { statusBeforeSuspend, ...rest } = slot;
        return {
          ...rest,
          status: statusBeforeSuspend ?? "clean",
          restoration: {
            ...slot.restoration,
            ...action.restoration,
          },
        };
      });

    case "OPEN_AUXILIARY": {
      const dirtySlots = unresolvedSlots(state);
      if (action.session?.mutationCapable !== false && dirtySlots.length > 0) {
        return requestResolution(
          state,
          dirtySlots,
          `open-auxiliary:${action.session?.surface ?? "unknown"}`,
        );
      }
      return {
        ...state,
        activeAuxiliary: action.session,
        parkedAuxiliaries: state.activeAuxiliary
          ? appendParked(state.parkedAuxiliaries, state.activeAuxiliary)
          : state.parkedAuxiliaries,
      };
    }

    case "PARK_AUXILIARY": {
      const session = action.session ?? state.activeAuxiliary;
      if (!session) return state;
      return {
        ...state,
        activeAuxiliary: state.activeAuxiliary?.draftId === session.draftId
          ? null
          : state.activeAuxiliary,
        parkedAuxiliaries: appendParked(state.parkedAuxiliaries, session),
      };
    }

    case "RESUME_AUXILIARY": {
      const requestedId = action.session?.draftId;
      const resumed = state.parkedAuxiliaries.find(({ draftId }) => draftId === requestedId)
        ?? action.session;
      if (!resumed) return state;
      const parked = state.parkedAuxiliaries.filter(({ draftId }) => draftId !== resumed.draftId);
      return {
        ...state,
        activeAuxiliary: resumed,
        parkedAuxiliaries: state.activeAuxiliary
          ? appendParked(parked, state.activeAuxiliary)
          : parked,
      };
    }

    case "CLOSE_AUXILIARY": {
      if (!new Set(["save", "discard", "stay"]).has(action.choice)) {
        throw new Error(`Unsupported auxiliary resolution choice: ${action.choice}`);
      }
      if (action.choice === "stay") return state;
      return {
        ...state,
        activeAuxiliary: state.activeAuxiliary?.draftId === action.draftId
          ? null
          : state.activeAuxiliary,
        parkedAuxiliaries: state.parkedAuxiliaries.filter(
          ({ draftId }) => draftId !== action.draftId,
        ),
      };
    }

    default:
      throw new Error(`Unknown Build draft coordinator action: ${action?.type}`);
  }
}

function assertSlot(slot) {
  if (!SLOT_NAMES.includes(slot)) {
    throw new Error(`Unknown Build draft slot: ${slot}`);
  }
}

function requireSlot(state, slotName) {
  assertSlot(slotName);
  const slot = state.slots[slotName];
  if (!slot) throw new Error(`Build draft slot is not open: ${slotName}`);
  return slot;
}

function updateSlot(state, slotName, update) {
  const slot = requireSlot(state, slotName);
  return {
    ...state,
    slots: {
      ...state.slots,
      [slotName]: update(slot),
    },
  };
}

function unresolvedSlots(state) {
  return SLOT_NAMES.filter((slotName) => {
    const slot = state.slots[slotName];
    if (!slot) return false;
    if (slot.status === "suspended") {
      return UNRESOLVED_STATUSES.has(slot.statusBeforeSuspend);
    }
    return UNRESOLVED_STATUSES.has(slot.status);
  });
}

function requestResolution(state, requestedSlots = [], reason = "unspecified") {
  const slots = requestedSlots.filter((slotName, index, values) => {
    assertSlot(slotName);
    return values.indexOf(slotName) === index && unresolvedSlots(state).includes(slotName);
  });
  return {
    ...state,
    resolutionRequest: slots.length > 0
      ? { slots, remaining: slots, reason }
      : null,
  };
}

function finishResolution(state, slotName) {
  if (!state.resolutionRequest) return state;
  const remaining = state.resolutionRequest.remaining.filter((slot) => slot !== slotName);
  return {
    ...state,
    resolutionRequest: remaining.length > 0
      ? { ...state.resolutionRequest, remaining }
      : null,
  };
}

function appendParked(parked, session) {
  if (parked.some(({ draftId }) => draftId === session.draftId)) return parked;
  return [...parked, session];
}

function withoutTransientFields(slot) {
  const { error, attemptedResolution, statusBeforeSuspend, ...stable } = slot;
  return stable;
}
