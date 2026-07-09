import React from "react";

import { buildChartSearchIndex } from "../lib/chartSearchIndex.js";
import {
  clampFocusPanelLimit,
  createFocusState,
  normalizeJudgeDecision,
  updateSemanticFocusState,
} from "../lib/focusController.js";
import { rankChartMatches } from "../lib/conversationMatcher.js";
import {
  addVoiceFeedback,
  clearVoiceFeedback,
  readVoiceFeedback,
} from "../lib/voiceFeedbackStore.js";
import {
  createLogEntry,
  createVoiceFocusSession,
  saveVoiceFocusLog,
  visibleLogEntries,
} from "../lib/voiceFocusLogStore.js";

const DEFAULT_SERVICE_URL = "http://127.0.0.1:8766";
const TRANSCRIPT_WINDOW_SIZE = 8;
const SEGMENT_DURATION_MS = 12000;
const DEFAULT_MAX_FOCUS_PANELS = "2";
const DEFAULT_CAPTURE_SETTINGS = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: "1",
  sampleRate: "48000",
  audioBitsPerSecond: "128000",
  segmentSeconds: "12",
};

export default function VoiceFocusControl({ dashboard, onOpenFocus }) {
  const serviceUrl = import.meta.env.VITE_SIMEX_VOICE_SERVICE_URL || DEFAULT_SERVICE_URL;
  const [serviceState, setServiceState] = React.useState("checking");
  const [recording, setRecording] = React.useState(false);
  const [autoFocus, setAutoFocus] = React.useState(true);
  const [aliases, setAliases] = React.useState({});
  const [transcriptionBackend, setTranscriptionBackend] = React.useState("whisper");
  const [focusMode, setFocusMode] = React.useState("semantic");
  const [maxFocusPanels, setMaxFocusPanels] = React.useState(DEFAULT_MAX_FOCUS_PANELS);
  const [audioDevices, setAudioDevices] = React.useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = React.useState("");
  const [captureSettings, setCaptureSettings] = React.useState(DEFAULT_CAPTURE_SETTINGS);
  const [transcriptParts, setTranscriptParts] = React.useState([]);
  const [matches, setMatches] = React.useState([]);
  const [feedbackRecords, setFeedbackRecords] = React.useState(() => readVoiceFeedback());
  const [statusMessage, setStatusMessage] = React.useState("Checking local voice service.");
  const [segmentState, setSegmentState] = React.useState("idle");
  const [segmentStats, setSegmentStats] = React.useState({
    recorded: 0,
    sent: 0,
    completed: 0,
    failed: 0,
  });
  const [lastAudioUrl, setLastAudioUrl] = React.useState("");
  const [lastAudioMeta, setLastAudioMeta] = React.useState(null);
  const [topicSummary, setTopicSummary] = React.useState("Waiting for a stable discussion topic.");
  const [focusDecision, setFocusDecision] = React.useState(null);
  const [focusLogEntries, setFocusLogEntries] = React.useState([]);
  const [logSaveMessage, setLogSaveMessage] = React.useState("");
  const recorderRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const segmentTimerRef = React.useRef(null);
  const recordingRequestedRef = React.useRef(false);
  const lastAudioUrlRef = React.useRef("");
  const lastFocusedSignatureRef = React.useRef("");
  const focusStateRef = React.useRef(createFocusState());
  const focusLogRef = React.useRef([]);
  const focusModeRef = React.useRef(focusMode);
  const maxFocusPanelsRef = React.useRef(DEFAULT_MAX_FOCUS_PANELS);
  const activeSessionRef = React.useRef(null);
  const pendingTranscriptionsRef = React.useRef(0);

  const chartIndex = React.useMemo(
    () => buildChartSearchIndex(dashboard, aliases),
    [dashboard, aliases],
  );
  const transcriptText = transcriptParts.join(" ");
  const activeSegmentCount = Math.max(0, segmentStats.sent - segmentStats.completed - segmentStats.failed);
  const maxFocusPanelCount = clampFocusPanelLimit(maxFocusPanels);

  React.useEffect(() => {
    let cancelled = false;
    let timer = null;

    function updateHealth() {
      checkServiceHealth(serviceUrl)
      .then((health) => {
        if (cancelled) {
          return;
        }
        const warmupState = health?.warmup?.state;
        if (warmupState === "warming" || warmupState === "pending") {
          setServiceState("warming");
          setStatusMessage("Voice service is warming up the transcription model.");
          timer = window.setTimeout(updateHealth, 1500);
          return;
        }
        if (warmupState === "error") {
          setServiceState("available");
          setStatusMessage(`Voice focus ready, but warm-up failed: ${health?.warmup?.error}`);
          return;
        }
        setServiceState("available");
        setStatusMessage("Voice focus ready.");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setServiceState("unavailable");
        setStatusMessage("Local voice service is not running.");
      });
    }

    updateHealth();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [serviceUrl]);

  React.useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}config/chart-aliases.json`)
      .then((response) => (response.ok ? response.json() : {}))
      .then((loadedAliases) => setAliases(loadedAliases ?? {}))
      .catch(() => setAliases({}));
  }, []);

  React.useEffect(() => {
    refreshAudioDevices();
  }, []);

  React.useEffect(() => {
    focusModeRef.current = focusMode;
  }, [focusMode]);

  React.useEffect(() => {
    maxFocusPanelsRef.current = maxFocusPanels;
  }, [maxFocusPanels]);

  React.useEffect(() => () => {
    stopRecording();
    revokeLastAudioUrl();
  }, []);

  async function toggleRecording() {
    if (recording) {
      stopRecording();
      return;
    }
    if (serviceState !== "available") {
      setStatusMessage(serviceState === "warming" ? "Wait for the voice service warm-up to finish." : "Start the local voice service before using the mic.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setStatusMessage("This browser does not support live mic recording.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints(selectedDeviceId, captureSettings),
      });
      streamRef.current = stream;
      recordingRequestedRef.current = true;
      startVoiceFocusSession();
      refreshAudioDevices();
      startRecordingSegment(stream);
      setRecording(true);
      setSegmentState("recording");
      setStatusMessage("Listening for discussion topics.");
    } catch (error) {
      setStatusMessage(`Microphone unavailable: ${error.message}`);
    }
  }

  function stopRecording() {
    recordingRequestedRef.current = false;
    window.clearTimeout(segmentTimerRef.current);
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
    setSegmentState("idle");
    queueVoiceFocusSessionFinish();
    setStatusMessage(serviceState === "available" ? "Voice focus ready." : "Local voice service is not running.");
  }

  function startRecordingSegment(stream) {
    if (!recordingRequestedRef.current || stream.getAudioTracks().every((track) => track.readyState === "ended")) {
      return;
    }

    const chunks = [];
    const recorder = new MediaRecorder(stream, recorderOptions(captureSettings));
    recorderRef.current = recorder;
    setSegmentState("recording");
    recorder.ondataavailable = (event) => {
      if (event.data?.size > 0) {
        chunks.push(event.data);
      }
    };
    recorder.onstop = () => {
      if (chunks.length > 0) {
        const audioBlob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        rememberLastAudio(audioBlob);
        setSegmentStats((current) => ({
          ...current,
          recorded: current.recorded + 1,
        }));
        transcribeAudioChunk(audioBlob);
      }
      if (recordingRequestedRef.current) {
        window.setTimeout(() => startRecordingSegment(stream), 50);
        return;
      }
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
    };
    recorder.start();
    segmentTimerRef.current = window.setTimeout(() => {
      if (recorder.state !== "inactive") {
        setSegmentState("sending");
        recorder.stop();
      }
    }, segmentDurationMs(captureSettings));
  }

  async function transcribeAudioChunk(blob) {
    const formData = new FormData();
    formData.append("audio", blob, `voice-focus-${Date.now()}.webm`);
    formData.append("backend", transcriptionBackend);
    setSegmentState("transcribing");
    appendLog("transcribe-request", {
      transcriptionBackend,
      mimeType: blob.type,
      sizeKb: Math.round(blob.size / 1024),
    });
    pendingTranscriptionsRef.current += 1;
    setSegmentStats((current) => ({
      ...current,
      sent: current.sent + 1,
    }));
    try {
      const response = await fetch(`${serviceUrl}/transcribe`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const result = await response.json();
      appendLog("transcribe-response", {
        textLength: String(result.text ?? "").trim().length,
        textPreview: String(result.text ?? "").trim().slice(0, 240),
      });
      appendTranscript(result.text);
      setSegmentStats((current) => ({
        ...current,
        completed: current.completed + 1,
      }));
      setSegmentState(recordingRequestedRef.current ? "recording" : "idle");
    } catch (error) {
      setSegmentStats((current) => ({
        ...current,
        failed: current.failed + 1,
      }));
      setSegmentState(recordingRequestedRef.current ? "recording" : "idle");
      appendLog("transcribe-error", {
        message: error.message,
      });
      setStatusMessage(`Transcription paused: ${error.message}`);
    } finally {
      pendingTranscriptionsRef.current = Math.max(0, pendingTranscriptionsRef.current - 1);
      queueVoiceFocusSessionFinish();
    }
  }

  function rememberLastAudio(blob) {
    revokeLastAudioUrl();
    const nextUrl = URL.createObjectURL(blob);
    lastAudioUrlRef.current = nextUrl;
    setLastAudioUrl(nextUrl);
    setLastAudioMeta({
      sizeKb: Math.round(blob.size / 1024),
      recordedAt: new Date().toLocaleTimeString(),
      durationSeconds: Math.round(segmentDurationMs(captureSettings) / 1000),
      bitrateKbps: Math.round(Number(captureSettings.audioBitsPerSecond) / 1000),
      micLabel: selectedMicLabel(audioDevices, selectedDeviceId),
    });
  }

  function revokeLastAudioUrl() {
    if (lastAudioUrlRef.current) {
      URL.revokeObjectURL(lastAudioUrlRef.current);
      lastAudioUrlRef.current = "";
    }
  }

  function appendTranscript(text) {
    const cleanText = String(text ?? "").trim();
    if (!cleanText) {
      appendLog("empty-transcript", {
        message: "The transcription service returned no text for this segment.",
      });
      setStatusMessage("Transcription returned no text for the last segment.");
      return;
    }
    setStatusMessage("Transcript received; updating chart focus.");
    setTranscriptParts((current) => {
      const nextParts = [...current, cleanText].slice(-TRANSCRIPT_WINDOW_SIZE);
      processFocusSegment(cleanText, nextParts);
      return nextParts;
    });
  }

  async function processFocusSegment(cleanText, nextParts) {
    const nextTranscript = nextParts.join(" ");
    const maxPanelCount = clampFocusPanelLimit(maxFocusPanelsRef.current);
    appendLog("transcript", {
      text: cleanText,
      rollingTranscript: nextTranscript,
      transcriptionBackend,
    });

    const semanticUpdate = updateSemanticFocusState(
      focusStateRef.current,
      cleanText,
      chartIndex,
      feedbackRecords,
      Date.now(),
      { maxPanels: maxPanelCount },
    );
    focusStateRef.current = semanticUpdate.state;
    setTopicSummary(semanticUpdate.state.summary);
    setMatches(semanticUpdate.matches);
    appendLog("topic", {
      summary: semanticUpdate.state.summary,
      topicTerms: semanticUpdate.state.topicTerms,
    });
    appendLog("embedding", semanticUpdate.embedding);

    let decision = semanticUpdate.decision;
    if (focusModeRef.current === "llm" && semanticUpdate.candidates.length > 0) {
      appendLog("llm-request", {
        candidatePanelIds: semanticUpdate.candidates.map((match) => match.panelId),
        maxSelectedCharts: maxPanelCount,
      });
      try {
        const judgeResult = await requestFocusJudge(semanticUpdate, nextTranscript, maxPanelCount);
        decision = normalizeJudgeDecision(
          judgeResult,
          semanticUpdate.matches,
          focusStateRef.current.selectedPanelIds,
          { maxPanels: maxPanelCount },
        );
        focusStateRef.current = {
          ...focusStateRef.current,
          selectedPanelIds: decision.panelIds,
          selectedSince: Date.now(),
          pendingSignature: "",
          pendingCount: 0,
        };
        appendLog("llm-response", judgeResult);
      } catch (error) {
        decision = {
          ...semanticUpdate.decision,
          reason: `${semanticUpdate.decision.reason} LLM judge unavailable: ${error.message}`,
        };
        appendLog("llm-error", { message: error.message });
      }
    }

    setFocusDecision(decision);
    appendLog("decision", decision);
    maybeOpenFocus(decision, semanticUpdate.matches, nextTranscript, semanticUpdate.state.summary);
  }

  function maybeOpenFocus(decision, nextMatches, nextTranscript, summary) {
    if (!autoFocus || !decision?.panelIds?.length) {
      return;
    }
    if (decision.action === "hold") {
      return;
    }
    const signature = decision.panelIds.join("|");
    if (signature === lastFocusedSignatureRef.current) {
      return;
    }
    lastFocusedSignatureRef.current = signature;
    onOpenFocus(
      decision.panelIds,
      focusReason(nextMatches, nextTranscript, decision, summary),
    );
  }

  function focusCurrentMatches() {
    if (matches.length === 0) {
      return;
    }
    const visibleMatches = matches.slice(0, maxFocusPanelCount);
    onOpenFocus(
      visibleMatches.map((match) => match.panelId),
      focusReason(visibleMatches, transcriptText, focusDecision, topicSummary),
    );
  }

  function submitFeedback(match, vote) {
    const nextRecords = addVoiceFeedback({
      panelId: match.panelId,
      vote,
      transcriptSnippet: transcriptText,
      score: match.score,
      reason: match.reason,
    });
    setFeedbackRecords(nextRecords);
    setMatches(rankChartMatches(transcriptText, chartIndex, nextRecords, { limit: maxFocusPanelCount }));
  }

  function resetFeedback() {
    clearVoiceFeedback();
    setFeedbackRecords([]);
    setMatches(rankChartMatches(transcriptText, chartIndex, [], { limit: maxFocusPanelCount }));
  }

  function clearTranscript() {
    setTranscriptParts([]);
    setMatches([]);
    lastFocusedSignatureRef.current = "";
  }

  async function refreshAudioDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices.filter((device) => device.kind === "audioinput"));
    } catch {
      setAudioDevices([]);
    }
  }

  function updateCaptureSetting(key, value) {
    setCaptureSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function startVoiceFocusSession() {
    const session = createVoiceFocusSession(focusModeRef.current);
    activeSessionRef.current = session;
    focusStateRef.current = createFocusState();
    focusLogRef.current = [
      createLogEntry("session-start", {
        sessionId: session.id,
        focusMode: focusModeRef.current,
        maxFocusPanels: clampFocusPanelLimit(maxFocusPanelsRef.current),
        transcriptionBackend,
      }),
    ];
    setFocusLogEntries(focusLogRef.current);
    setLogSaveMessage("");
    setTranscriptParts([]);
    setMatches([]);
    setTopicSummary("Waiting for a stable discussion topic.");
    setFocusDecision(null);
    lastFocusedSignatureRef.current = "";
  }

  function queueVoiceFocusSessionFinish() {
    if (recordingRequestedRef.current || !activeSessionRef.current) {
      return;
    }
    window.setTimeout(() => {
      if (!recordingRequestedRef.current && pendingTranscriptionsRef.current === 0) {
        finishVoiceFocusSession();
      } else {
        queueVoiceFocusSessionFinish();
      }
    }, 600);
  }

  function finishVoiceFocusSession() {
    const session = activeSessionRef.current;
    if (!session) {
      return;
    }
    appendLog("session-stop", {
      sessionId: session.id,
      focusMode: focusModeRef.current,
    });
    const entries = [...focusLogRef.current];
    activeSessionRef.current = null;
    saveVoiceFocusLog(serviceUrl, session, entries)
      .then((result) => {
        setLogSaveMessage(result?.path ? `Saved log: ${result.path}` : "Saved voice focus log.");
      })
      .catch((error) => {
        setLogSaveMessage(`Log save failed: ${error.message}`);
      });
  }

  function appendLog(type, payload) {
    const entry = createLogEntry(type, payload);
    focusLogRef.current = [...focusLogRef.current, entry];
    setFocusLogEntries(visibleLogEntries(focusLogRef.current));
  }

  async function requestFocusJudge(semanticUpdate, nextTranscript, maxPanelCount) {
    const response = await fetch(`${serviceUrl}/focus-decision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationSummary: semanticUpdate.state.summary,
        recentTranscript: nextTranscript,
        currentPanelIds: focusStateRef.current.selectedPanelIds,
        maxSelectedCharts: maxPanelCount,
        candidateCharts: semanticUpdate.candidates.map((match) => ({
          panelId: match.panelId,
          title: match.title,
          pageLabel: match.pageLabel,
          sectionTitle: match.sectionTitle,
          score: match.score,
          reason: match.reason,
          matchedTerms: match.matchedTerms,
        })),
      }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response.json();
  }

  return (
    <section className={`voice-focus-control voice-focus-${serviceState}`} aria-label="Voice-guided chart focus">
      <div className="voice-focus-main">
        <div>
          <p className="eyebrow">Voice focus</p>
          <h2>Discussion-guided charts</h2>
          <p>{statusMessage}</p>
        </div>
        <div className="voice-focus-actions">
          <button type="button" onClick={toggleRecording} disabled={serviceState !== "available"}>
            {recording ? "Stop mic" : "Start mic"}
          </button>
          <label className="voice-focus-toggle">
            <input
              type="checkbox"
              checked={autoFocus}
              onChange={(event) => setAutoFocus(event.target.checked)}
            />
            Auto focus
          </label>
          <button type="button" className="secondary" disabled={matches.length === 0} onClick={focusCurrentMatches}>
            Focus charts
          </button>
          <button type="button" className="secondary" disabled={transcriptParts.length === 0} onClick={clearTranscript}>
            Clear
          </button>
        </div>
      </div>
      <div className="voice-focus-details">
        <details className="voice-capture-settings">
          <summary>Audio capture settings</summary>
          <div className="voice-capture-grid">
            <label className="voice-capture-field">
              Transcription
              <select
                value={transcriptionBackend}
                onChange={(event) => setTranscriptionBackend(event.target.value)}
              >
                <option value="whisper">Local Whisper</option>
                <option value="gemini">Gemini online</option>
              </select>
            </label>
            <label className="voice-capture-field">
              Focus mode
              <select
                value={focusMode}
                onChange={(event) => setFocusMode(event.target.value)}
                disabled={recording}
              >
                <option value="semantic">Semantic controller</option>
                <option value="llm">LLM chart judge</option>
              </select>
            </label>
            <label className="voice-capture-field">
              Max focus charts
              <select
                value={maxFocusPanels}
                onChange={(event) => setMaxFocusPanels(event.target.value)}
              >
                <option value="1">1 chart</option>
                <option value="2">2 charts</option>
                <option value="3">3 charts</option>
                <option value="4">4 charts</option>
              </select>
            </label>
            <label className="voice-capture-field voice-capture-device">
              Microphone
              <span>
                <select
                  value={selectedDeviceId}
                  onChange={(event) => setSelectedDeviceId(event.target.value)}
                  disabled={recording}
                >
                  <option value="">Browser default</option>
                  {audioDevices.map((device, index) => (
                    <option key={device.deviceId || index} value={device.deviceId}>
                      {device.label || `Microphone ${index + 1}`}
                    </option>
                  ))}
                </select>
                <button type="button" className="secondary" onClick={refreshAudioDevices} disabled={recording}>
                  Refresh
                </button>
              </span>
            </label>
            <label className="voice-capture-toggle">
              <input
                type="checkbox"
                checked={captureSettings.echoCancellation}
                onChange={(event) => updateCaptureSetting("echoCancellation", event.target.checked)}
                disabled={recording}
              />
              Echo cancellation
            </label>
            <label className="voice-capture-toggle">
              <input
                type="checkbox"
                checked={captureSettings.noiseSuppression}
                onChange={(event) => updateCaptureSetting("noiseSuppression", event.target.checked)}
                disabled={recording}
              />
              Noise suppression
            </label>
            <label className="voice-capture-toggle">
              <input
                type="checkbox"
                checked={captureSettings.autoGainControl}
                onChange={(event) => updateCaptureSetting("autoGainControl", event.target.checked)}
                disabled={recording}
              />
              Auto gain
            </label>
            <label className="voice-capture-field">
              Bitrate
              <select
                value={captureSettings.audioBitsPerSecond}
                onChange={(event) => updateCaptureSetting("audioBitsPerSecond", event.target.value)}
              >
                <option value="64000">64 kbps</option>
                <option value="96000">96 kbps</option>
                <option value="128000">128 kbps</option>
                <option value="192000">192 kbps</option>
              </select>
            </label>
            <label className="voice-capture-field">
              Segment length
              <select
                value={captureSettings.segmentSeconds}
                onChange={(event) => updateCaptureSetting("segmentSeconds", event.target.value)}
              >
                <option value="5">5 seconds</option>
                <option value="8">8 seconds</option>
                <option value="12">12 seconds</option>
                <option value="16">16 seconds</option>
              </select>
            </label>
            <label className="voice-capture-field">
              Sample rate hint
              <select
                value={captureSettings.sampleRate}
                onChange={(event) => updateCaptureSetting("sampleRate", event.target.value)}
                disabled={recording}
              >
                <option value="">Browser default</option>
                <option value="16000">16 kHz</option>
                <option value="44100">44.1 kHz</option>
                <option value="48000">48 kHz</option>
              </select>
            </label>
            <label className="voice-capture-field">
              Channels
              <select
                value={captureSettings.channelCount}
                onChange={(event) => updateCaptureSetting("channelCount", event.target.value)}
                disabled={recording}
              >
                <option value="">Browser default</option>
                <option value="1">Mono</option>
                <option value="2">Stereo</option>
              </select>
            </label>
          </div>
          <p className="voice-capture-note">
            Microphone, processing, sample rate, and channel changes apply after restarting the mic. Bitrate, segment length, and transcription backend apply to the next segment.
            Gemini sends audio segments to Google through the local voice service and requires GEMINI_API_KEY.
          </p>
        </details>
        <div className="voice-segment-debug" aria-label="Voice segment diagnostics">
          <div className={`voice-segment-indicator segment-${segmentState}`}>
            <span />
            {segmentStatusText(segmentState)}
          </div>
          <div className="voice-segment-counts">
            <span>Recorded {segmentStats.recorded}</span>
            <span>Sent {segmentStats.sent}</span>
            <span>Active {activeSegmentCount}</span>
            <span>Done {segmentStats.completed}</span>
            <span>Failed {segmentStats.failed}</span>
          </div>
          <div className="voice-audio-playback">
            {lastAudioUrl ? (
              <>
                <audio controls src={lastAudioUrl} />
                <small>
                  Last segment: {lastAudioMeta?.durationSeconds}s, {lastAudioMeta?.sizeKb} KB, {lastAudioMeta?.bitrateKbps} kbps, {lastAudioMeta?.recordedAt}
                  {lastAudioMeta?.micLabel ? `, ${lastAudioMeta.micLabel}` : ""}
                </small>
              </>
            ) : (
              <small>No audio segment recorded yet.</small>
            )}
          </div>
        </div>
        <p className="voice-transcript-preview">
          {transcriptText || "Transcript preview will appear here while the mic is active."}
        </p>
        <div className="voice-topic-state">
          <div>
            <strong>Topic summary</strong>
            <span>{topicSummary}</span>
          </div>
          <div>
            <strong>Last decision</strong>
            <span>
              {focusDecision
                ? `${focusDecision.action}: ${focusDecision.reason}`
                : "No chart focus decision yet."}
            </span>
          </div>
        </div>
        <div className="voice-match-list">
          {matches.length === 0 ? (
            <span>No chart matches yet.</span>
          ) : (
            matches.map((match) => (
              <article className="voice-match-card" key={match.panelId}>
                <div>
                  <strong>{match.title}</strong>
                  <small>{match.pageLabel} / {match.sectionTitle} / {match.confidence}</small>
                  <span>{match.reason}</span>
                </div>
                <div className="voice-feedback-actions">
                  <button type="button" className="secondary" onClick={() => submitFeedback(match, "up")}>Up</button>
                  <button type="button" className="secondary" onClick={() => submitFeedback(match, "down")}>Down</button>
                </div>
              </article>
            ))
          )}
        </div>
        <button type="button" className="secondary voice-reset-button" onClick={resetFeedback} disabled={feedbackRecords.length === 0}>
          Reset voice learning
        </button>
        <details className="voice-focus-log" open>
          <summary>Focus log</summary>
          <div>
            {focusLogEntries.length === 0 ? (
              <span>No focus log entries yet.</span>
            ) : (
              focusLogEntries.map((entry, index) => (
                <article key={`${entry.at}-${entry.type}-${index}`}>
                  <strong>{entry.type}</strong>
                  <small>{new Date(entry.at).toLocaleTimeString()}</small>
                  <pre>{JSON.stringify(logEntryPreview(entry), null, 2)}</pre>
                </article>
              ))
            )}
          </div>
          {logSaveMessage ? <p>{logSaveMessage}</p> : null}
        </details>
      </div>
    </section>
  );
}

function recorderOptions(captureSettings) {
  const mimeType = "audio/webm;codecs=opus";
  const options = {
    audioBitsPerSecond: Number(captureSettings.audioBitsPerSecond) || 128000,
  };
  if (MediaRecorder.isTypeSupported?.(mimeType)) {
    options.mimeType = mimeType;
  }
  return options;
}

function audioConstraints(deviceId, captureSettings) {
  return {
    deviceId: deviceId ? { exact: deviceId } : undefined,
    echoCancellation: captureSettings.echoCancellation,
    noiseSuppression: captureSettings.noiseSuppression,
    autoGainControl: captureSettings.autoGainControl,
    channelCount: numberConstraint(captureSettings.channelCount),
    sampleRate: numberConstraint(captureSettings.sampleRate),
  };
}

function numberConstraint(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? { ideal: number } : undefined;
}

function segmentDurationMs(captureSettings) {
  const seconds = Number(captureSettings.segmentSeconds);
  return Math.max(3, Math.min(30, Number.isFinite(seconds) ? seconds : SEGMENT_DURATION_MS / 1000)) * 1000;
}

function selectedMicLabel(audioDevices, selectedDeviceId) {
  if (!selectedDeviceId) {
    return "Browser default microphone";
  }
  const device = audioDevices.find((candidate) => candidate.deviceId === selectedDeviceId);
  return device?.label ?? "Selected microphone";
}

function segmentStatusText(segmentState) {
  if (segmentState === "recording") {
    return "Recording segment";
  }
  if (segmentState === "sending") {
    return "Sending segment";
  }
  if (segmentState === "transcribing") {
    return "Transcribing segment";
  }
  return "Idle";
}

function focusReason(matches, transcriptText, decision, topicSummary) {
  const terms = matches.flatMap((match) => match.matchedTerms).slice(0, 5);
  return {
    title: "Voice focus",
    detail: decision?.reason
      ?? (terms.length ? `Matched discussion terms: ${[...new Set(terms)].join(", ")}` : "Matched the recent discussion."),
    transcriptSnippet: transcriptText.slice(-280),
    topicSummary,
  };
}

function logEntryPreview(entry) {
  const { at, ...preview } = entry;
  if (preview.rollingTranscript && preview.rollingTranscript.length > 260) {
    preview.rollingTranscript = `${preview.rollingTranscript.slice(-260)}`;
  }
  if (preview.text && preview.text.length > 260) {
    preview.text = `${preview.text.slice(0, 260)}...`;
  }
  if (preview.rawText && preview.rawText.length > 320) {
    preview.rawText = `${preview.rawText.slice(0, 320)}...`;
  }
  return preview;
}

async function checkServiceHealth(serviceUrl) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 900);
  try {
    const response = await fetch(`${serviceUrl}/health`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error("Voice service is not healthy.");
    }
    return response.json();
  } finally {
    window.clearTimeout(timer);
  }
}
