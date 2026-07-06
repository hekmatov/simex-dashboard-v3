import { normalizeText, tokenize } from "./chartSearchIndex.js";
import { rankChartMatches } from "./conversationMatcher.js";

const MAX_SEGMENTS = 24;
const MAX_SUMMARY_TERMS = 14;
const SWITCH_MARGIN = 1.18;
const MIN_SWITCH_SECONDS = 28;

export function createFocusState() {
  return {
    segments: [],
    summary: "",
    topicTerms: [],
    selectedPanelIds: [],
    selectedSince: 0,
    pendingSignature: "",
    pendingCount: 0,
  };
}

export function updateSemanticFocusState(previousState, transcriptSegment, chartIndex, feedbackRecords = [], now = Date.now()) {
  const cleanSegment = String(transcriptSegment ?? "").trim();
  const segments = cleanSegment
    ? [...previousState.segments, { text: cleanSegment, at: now }].slice(-MAX_SEGMENTS)
    : previousState.segments;
  const recentText = segments.slice(-5).map((segment) => segment.text).join(" ");
  const fullText = segments.map((segment) => segment.text).join(" ");
  const topicTerms = topicTermsFromText(fullText, chartIndex);
  const summary = topicSummary(topicTerms, recentText);
  const contextText = [
    topicTerms.join(" "),
    topicTerms.join(" "),
    segments.slice(-10).map((segment) => segment.text).join(" "),
    recentText,
  ].join(" ");
  const candidates = rankChartMatches(contextText, chartIndex, feedbackRecords, {
    limit: 8,
    minimumScore: 1,
  });
  const focusCandidates = candidates.slice(0, 4);
  const decision = stableDecision(previousState, focusCandidates, now);

  return {
    state: {
      ...previousState,
      segments,
      summary,
      topicTerms,
      selectedPanelIds: decision.panelIds,
      selectedSince: decision.selectedSince,
      pendingSignature: decision.pendingSignature,
      pendingCount: decision.pendingCount,
    },
    matches: focusCandidates,
    candidates,
    decision,
    embedding: {
      model: "local-topic-vector",
      terms: topicTerms.slice(0, MAX_SUMMARY_TERMS),
      candidateScores: candidates.map((candidate) => ({
        panelId: candidate.panelId,
        title: candidate.title,
        score: candidate.score,
        matchedTerms: candidate.matchedTerms,
      })),
    },
  };
}

export function normalizeJudgeDecision(result, fallbackMatches, previousPanelIds = []) {
  const fallbackIds = fallbackMatches.map((match) => match.panelId).slice(0, 4);
  const panelIds = Array.isArray(result?.selectedPanelIds)
    ? result.selectedPanelIds.map(String).filter(Boolean).slice(0, 4)
    : fallbackIds;
  return {
    panelIds: panelIds.length ? panelIds : previousPanelIds.slice(0, 4),
    action: result?.action ?? (sameSignature(panelIds, previousPanelIds) ? "keep" : "update"),
    confidence: Number(result?.confidence ?? fallbackMatches[0]?.score ?? 0),
    reason: result?.reason ?? "Used fallback semantic candidates.",
  };
}

function stableDecision(previousState, candidates, now) {
  const candidateIds = candidates.map((candidate) => candidate.panelId);
  if (candidateIds.length === 0) {
    return {
      action: "keep",
      panelIds: previousState.selectedPanelIds,
      selectedSince: previousState.selectedSince,
      pendingSignature: "",
      pendingCount: 0,
      reason: "No strong chart candidates yet.",
    };
  }

  if (previousState.selectedPanelIds.length === 0) {
    return {
      action: "initial",
      panelIds: candidateIds,
      selectedSince: now,
      pendingSignature: signature(candidateIds),
      pendingCount: 0,
      reason: "Initial focus from rolling discussion context.",
    };
  }

  const currentSignature = signature(previousState.selectedPanelIds);
  const nextSignature = signature(candidateIds);
  if (currentSignature === nextSignature) {
    return {
      action: "keep",
      panelIds: previousState.selectedPanelIds,
      selectedSince: previousState.selectedSince,
      pendingSignature: "",
      pendingCount: 0,
      reason: "Current charts still match the rolling discussion.",
    };
  }

  const topScore = candidates[0]?.score ?? 0;
  const currentScore = candidates
    .filter((candidate) => previousState.selectedPanelIds.includes(candidate.panelId))
    .reduce((total, candidate) => total + candidate.score, 0);
  const enoughMargin = topScore >= Math.max(1.4, currentScore * SWITCH_MARGIN);
  const enoughTime = now - previousState.selectedSince >= MIN_SWITCH_SECONDS * 1000;
  const pendingCount = previousState.pendingSignature === nextSignature ? previousState.pendingCount + 1 : 1;

  if (enoughMargin && (enoughTime || pendingCount >= 2)) {
    return {
      action: "switch",
      panelIds: candidateIds,
      selectedSince: now,
      pendingSignature: "",
      pendingCount: 0,
      reason: pendingCount >= 2
        ? "Two consecutive updates supported a topic shift."
        : "New topic evidence is stronger than the current focus.",
    };
  }

  return {
    action: "hold",
    panelIds: previousState.selectedPanelIds,
    selectedSince: previousState.selectedSince,
    pendingSignature: nextSignature,
    pendingCount,
    reason: "Possible topic shift detected, waiting for more evidence.",
  };
}

function topicTermsFromText(text, chartIndex) {
  const chartFrequency = chartTokenFrequency(chartIndex);
  const counts = new Map();
  for (const token of tokenize(text)) {
    if (token.length < 3) {
      continue;
    }
    const chartCount = chartFrequency.get(token) ?? 0;
    if (chartCount === 0 || chartCount > Math.max(3, chartIndex.length * 0.24)) {
      continue;
    }
    counts.set(token, (counts.get(token) ?? 0) + 1 + 1 / chartCount);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, MAX_SUMMARY_TERMS)
    .map(([token]) => token);
}

function topicSummary(topicTerms, recentText) {
  if (topicTerms.length === 0) {
    return "Waiting for a stable discussion topic.";
  }
  const compactRecent = normalizeText(recentText).slice(0, 180);
  return `Current discussion appears centered on ${topicTerms.slice(0, 6).join(", ")}.${compactRecent ? ` Recent context: ${compactRecent}` : ""}`;
}

function chartTokenFrequency(chartIndex) {
  const frequency = new Map();
  for (const record of chartIndex ?? []) {
    for (const token of record.tokens ?? []) {
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }
  }
  return frequency;
}

function signature(panelIds) {
  return panelIds.slice(0, 4).join("|");
}

function sameSignature(left, right) {
  return signature(left) === signature(right);
}
