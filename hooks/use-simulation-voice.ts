"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AgentId, AgentMessage, AgentRole } from "@/lib/simulation/types";

export interface SimulationVoiceNarration {
  title: string;
  description: string;
  /** Authored documentary-style scene copy, when the scenario provides it. */
  story?: string;
  why: string;
}

/** The display data needed to turn an AgentMessage into an identifiable voice. */
export interface SimulationVoiceSpeaker {
  id: AgentId;
  name: string;
  role: AgentRole;
}

/**
 * One complete simulation beat. A beat is read as a single uninterrupted unit:
 * the neutral narration first, then each in-world message in order.
 */
export interface SimulationVoiceBeat {
  id: string;
  narrator: SimulationVoiceNarration;
  messages: readonly AgentMessage[];
  speakers: readonly SimulationVoiceSpeaker[];
}

export interface UseSimulationVoiceOptions {
  /** The language requested from the browser when it has no selected voice. */
  language?: string;
  /** The initial restrained multiplier used for narration. */
  rateMultiplier?: number;
}

export interface SimulationVoiceController {
  /** True while a narration or character line is being voiced. */
  isSpeaking: boolean;
  /**
   * The exact subtitle line currently being voiced. `null` means that the
   * voice queue is idle. Consumers can use `kind` to distinguish the neutral
   * storyteller from an in-world character without parsing the text.
   */
  activeSegment: SimulationVoiceActiveSegment | null;
  /** The currently spoken AgentMessage, or null while the narrator is speaking. */
  activeMessageId: string | null;
  /** The agent currently speaking, or null while the narrator is speaking. */
  activeSpeakerId: AgentId | null;
  /** The most recently completed narration beat, used to advance the world safely. */
  completedBeatId: string | null;
  /** Browser voices in deterministic display order. Empty means speech is unavailable or not loaded. */
  voicesAvailable: readonly SpeechSynthesisVoice[];
  /** Adds a beat after the current beat without interrupting it. */
  enqueueBeat: (beat: SimulationVoiceBeat) => void;
  /** Stops the current beat, clears pending beats, and immediately starts this beat. */
  replayBeat: (beat: SimulationVoiceBeat) => void;
  /** Pauses the current spoken segment without discarding its place. */
  pause: () => void;
  /** Resumes a paused spoken segment without replaying the beat. */
  resume: () => void;
  /**
   * Updates narration speed immediately. Browser speech cannot mutate a live
   * utterance, so an active line resumes from its latest word boundary.
   */
  setRateMultiplier: (rateMultiplier: number) => void;
  /** Stops the current beat and discards every pending beat. */
  cancel: () => void;
}

export interface SimulationVoiceActiveSegment {
  /** The words passed to `SpeechSynthesisUtterance` for this segment. */
  text: string;
  /** `narrator` is an explanatory subtitle; `character` is in-world dialogue. */
  kind: "narrator" | "character";
  messageId: string | null;
  speakerId: AgentId | null;
}

type SpeechSegment = {
  text: string;
  messageId: string | null;
  speakerId: AgentId | null;
  role?: AgentRole;
  voiceSeed: string;
  isNarrator: boolean;
};

type SpeechProfile = {
  rate: number;
  pitch: number;
};

type ActiveSpeechPlayback = {
  runId: number;
  segmentIndex: number;
  /** First character included in the current utterance. */
  segmentStart: number;
  /** Latest browser-reported word boundary within the full segment. */
  boundaryIndex: number;
};

const NARRATOR_PROFILE: SpeechProfile = { rate: 0.88, pitch: 0.96 };

const ROLE_SPEECH_PROFILES: Record<AgentRole, SpeechProfile> = {
  ruler: { rate: 0.86, pitch: 0.9 },
  strategist: { rate: 0.88, pitch: 0.96 },
  commander: { rate: 0.91, pitch: 0.92 },
  diplomat: { rate: 0.9, pitch: 1.02 },
  officer: { rate: 0.94, pitch: 0.94 },
  messenger: { rate: 1.02, pitch: 1.08 },
  scout: { rate: 1, pitch: 1.04 },
  merchant: { rate: 0.96, pitch: 1.02 },
  farmer: { rate: 0.9, pitch: 1 },
  soldier: { rate: 0.95, pitch: 0.9 },
  medic: { rate: 0.88, pitch: 1.06 },
  civilian: { rate: 0.92, pitch: 1 },
};

function clampRateMultiplier(rateMultiplier: number) {
  return Math.min(1.32, Math.max(0.8, rateMultiplier));
}

function canUseSpeechSynthesis() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

function compareVoices(left: SpeechSynthesisVoice, right: SpeechSynthesisVoice) {
  return `${left.lang}\u0000${left.voiceURI}\u0000${left.name}`.localeCompare(
    `${right.lang}\u0000${right.voiceURI}\u0000${right.name}`,
  );
}

function getVoices() {
  if (!canUseSpeechSynthesis()) return [] as SpeechSynthesisVoice[];

  return Array.from(window.speechSynthesis.getVoices()).sort(compareVoices);
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getLanguageBase(language: string) {
  return language.trim().toLowerCase().split("-")[0] ?? "";
}

function selectVoice(
  voices: readonly SpeechSynthesisVoice[],
  seed: string,
  preferredLanguage: string,
) {
  if (voices.length === 0) return undefined;

  const preferredBase = getLanguageBase(preferredLanguage);
  const preferredVoices = preferredBase
    ? voices.filter((voice) => getLanguageBase(voice.lang) === preferredBase)
    : [];
  const englishVoices = voices.filter((voice) => getLanguageBase(voice.lang) === "en");
  const candidates = preferredVoices.length > 0 ? preferredVoices : englishVoices.length > 0 ? englishVoices : voices;

  return candidates[hashString(seed) % candidates.length];
}

function withSentenceEnd(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function lowerCaseFirstLetter(value: string) {
  if (!value) return value;
  return `${value.slice(0, 1).toLocaleLowerCase()}${value.slice(1)}`;
}

function buildNarrationLines(narrator: SimulationVoiceNarration) {
  const story = withSentenceEnd(narrator.story ?? "");
  const description = withSentenceEnd(narrator.description);
  const why = withSentenceEnd(narrator.why);

  // An authored scene is already written as narration. Prefer it over the
  // explanatory fields so the voice-over tells a moment instead of reading a
  // textbook annotation aloud.
  if (story) return [story];

  if (description && why) {
    return [description, `That matters because ${lowerCaseFirstLetter(why)}`];
  }

  return [description || why || withSentenceEnd(narrator.title)].filter(Boolean);
}

function cloneBeat(beat: SimulationVoiceBeat): SimulationVoiceBeat {
  return {
    id: beat.id,
    narrator: { ...beat.narrator },
    messages: beat.messages.map((message) => ({ ...message })),
    speakers: beat.speakers.map((speaker) => ({ ...speaker })),
  };
}

function buildSegments(beat: SimulationVoiceBeat): SpeechSegment[] {
  const speakersById = new Map(beat.speakers.map((speaker) => [speaker.id, speaker]));
  const segments: SpeechSegment[] = [];

  for (const narrationLine of buildNarrationLines(beat.narrator)) {
    segments.push({
      text: narrationLine,
      messageId: null,
      speakerId: null,
      voiceSeed: "epos-narrator",
      isNarrator: true,
    });
  }

  for (const message of beat.messages) {
    const text = message.text.trim();
    if (!text) continue;

    const speaker = speakersById.get(message.speakerId);

    segments.push({
      // The visible subtitle supplies the name. Keeping the spoken line to
      // dialogue makes it read as a scene instead of a roster being read.
      text: withSentenceEnd(text),
      messageId: message.id,
      speakerId: message.speakerId,
      role: speaker?.role,
      voiceSeed: speaker?.id ?? message.speakerId,
      isNarrator: false,
    });
  }

  return segments;
}

/**
 * Queues browser-native narration for simulation events. It deliberately owns
 * one SpeechSynthesis queue so a newly-arrived event never truncates a line
 * that the learner is still hearing.
 */
export function useSimulationVoice(
  options: UseSimulationVoiceOptions = {},
): SimulationVoiceController {
  const language = options.language ?? "en-US";
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSegment, setActiveSegment] = useState<SimulationVoiceActiveSegment | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [activeSpeakerId, setActiveSpeakerId] = useState<AgentId | null>(null);
  const [completedBeatId, setCompletedBeatId] = useState<string | null>(null);
  const [voicesAvailable, setVoicesAvailable] = useState<readonly SpeechSynthesisVoice[]>([]);
  const queueRef = useRef<SimulationVoiceBeat[]>([]);
  const voicesRef = useRef<readonly SpeechSynthesisVoice[]>([]);
  const runIdRef = useRef(0);
  // A speech engine can fire onend after cancel(). A per-utterance token lets
  // us ignore that stale callback without throwing away the rest of its beat.
  const utteranceTokenRef = useRef(0);
  const processingRef = useRef(false);
  const mountedRef = useRef(false);
  const pausedRef = useRef(false);
  const restartAfterResumeRef = useRef(false);
  const rateMultiplierRef = useRef(clampRateMultiplier(options.rateMultiplier ?? 1));
  const activePlaybackRef = useRef<ActiveSpeechPlayback | null>(null);
  const processNextBeatRef = useRef<() => void>(() => undefined);
  const restartSegmentRef = useRef<((segmentIndex: number, characterIndex: number) => void) | null>(null);

  const resetPlaybackState = useCallback(() => {
    if (!mountedRef.current) return;

    setIsSpeaking(false);
    setActiveSegment(null);
    setActiveMessageId(null);
    setActiveSpeakerId(null);
  }, []);

  const restartActiveSegment = useCallback(() => {
    if (!canUseSpeechSynthesis()) return false;

    const activePlayback = activePlaybackRef.current;
    const restartSegment = restartSegmentRef.current;

    if (
      !activePlayback ||
      !restartSegment ||
      activePlayback.runId !== runIdRef.current
    ) {
      return false;
    }

    // Invalidate the callback belonging to the cancelled utterance, but keep
    // the beat's run ID intact so its remaining segments can still continue.
    utteranceTokenRef.current += 1;
    activePlaybackRef.current = null;
    restartSegmentRef.current = null;
    window.speechSynthesis.cancel();
    restartSegment(activePlayback.segmentIndex, activePlayback.boundaryIndex);
    return true;
  }, []);

  const processNextBeat = useCallback(() => {
    if (!canUseSpeechSynthesis() || processingRef.current) return;

    let beat = queueRef.current.shift();
    let segments: SpeechSegment[] = [];

    while (beat) {
      segments = buildSegments(beat);
      if (segments.length > 0) break;
      beat = queueRef.current.shift();
    }

    if (!beat || segments.length === 0) {
      resetPlaybackState();
      return;
    }

    processingRef.current = true;
    const runId = runIdRef.current;

    const finishBeat = () => {
      if (runId !== runIdRef.current) return;

      processingRef.current = false;
      pausedRef.current = false;
      restartAfterResumeRef.current = false;
      activePlaybackRef.current = null;
      restartSegmentRef.current = null;

      if (mountedRef.current) setCompletedBeatId(beat.id);

      if (queueRef.current.length > 0) {
        processNextBeatRef.current();
        return;
      }

      resetPlaybackState();
    };

    const playSegment = (index: number, requestedCharacterIndex = 0) => {
      if (runId !== runIdRef.current) return;

      const segment = segments[index];
      if (!segment) {
        finishBeat();
        return;
      }

      // When the learner changes speed, resume at the last word boundary.
      // Trim any leading space so the browser receives a clean continuation.
      const boundedCharacterIndex = Math.min(
        segment.text.length,
        Math.max(0, requestedCharacterIndex),
      );
      const remainingText = segment.text.slice(boundedCharacterIndex);
      const leadingWhitespace = remainingText.length - remainingText.trimStart().length;
      const segmentStart = boundedCharacterIndex + leadingWhitespace;
      const spokenText = segment.text.slice(segmentStart);

      if (!spokenText) {
        playSegment(index + 1);
        return;
      }

      if (mountedRef.current) {
        setIsSpeaking(true);
        setActiveSegment({
          text: segment.text,
          kind: segment.isNarrator ? "narrator" : "character",
          messageId: segment.messageId,
          speakerId: segment.speakerId,
        });
        setActiveMessageId(segment.messageId);
        setActiveSpeakerId(segment.speakerId);
      }

      const utteranceToken = ++utteranceTokenRef.current;
      activePlaybackRef.current = {
        runId,
        segmentIndex: index,
        segmentStart,
        boundaryIndex: segmentStart,
      };
      restartSegmentRef.current = (segmentIndex, characterIndex) => {
        if (runId !== runIdRef.current) return;
        playSegment(segmentIndex, characterIndex);
      };

      const utterance = new SpeechSynthesisUtterance(spokenText);
      const voice = selectVoice(voicesRef.current, segment.voiceSeed, language);
      const profile = segment.isNarrator
        ? NARRATOR_PROFILE
        : segment.role
          ? ROLE_SPEECH_PROFILES[segment.role]
          : ROLE_SPEECH_PROFILES.civilian;

      utterance.rate = Math.min(1.5, profile.rate * rateMultiplierRef.current);
      utterance.pitch = profile.pitch;
      utterance.lang = voice?.lang || language;
      if (voice) utterance.voice = voice;

      const continueToNextSegment = () => {
        if (runId !== runIdRef.current || utteranceToken !== utteranceTokenRef.current) return;

        activePlaybackRef.current = null;
        restartSegmentRef.current = null;
        playSegment(index + 1);
      };

      utterance.onend = continueToNextSegment;
      utterance.onerror = continueToNextSegment;
      utterance.onboundary = (event) => {
        if (runId !== runIdRef.current || utteranceToken !== utteranceTokenRef.current) return;
        if (typeof event.charIndex !== "number") return;

        const activePlayback = activePlaybackRef.current;
        if (!activePlayback || activePlayback.segmentIndex !== index) return;

        activePlaybackRef.current = {
          ...activePlayback,
          boundaryIndex: Math.min(segment.text.length, segmentStart + Math.max(0, event.charIndex)),
        };
      };

      try {
        // Browsers can leave the engine paused after a tab switch. Do not
        // resume here when the learner deliberately paused the simulation.
        if (!pausedRef.current) window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
        if (pausedRef.current) window.speechSynthesis.pause();
      } catch {
        continueToNextSegment();
      }
    };

    playSegment(0);
  }, [language, resetPlaybackState]);

  useEffect(() => {
    processNextBeatRef.current = processNextBeat;
  }, [processNextBeat]);

  const cancel = useCallback(() => {
    runIdRef.current += 1;
    utteranceTokenRef.current += 1;
    queueRef.current = [];
    processingRef.current = false;
    pausedRef.current = false;
    restartAfterResumeRef.current = false;
    activePlaybackRef.current = null;
    restartSegmentRef.current = null;

    if (mountedRef.current) setCompletedBeatId(null);

    if (canUseSpeechSynthesis()) window.speechSynthesis.cancel();
    resetPlaybackState();
  }, [resetPlaybackState]);

  const pause = useCallback(() => {
    if (!canUseSpeechSynthesis() || !activePlaybackRef.current) return;

    pausedRef.current = true;
    window.speechSynthesis.pause();
  }, []);

  const resume = useCallback(() => {
    if (!canUseSpeechSynthesis()) return;

    const shouldRestartAtNewRate = pausedRef.current && restartAfterResumeRef.current;
    pausedRef.current = false;
    restartAfterResumeRef.current = false;

    if (shouldRestartAtNewRate && restartActiveSegment()) return;
    window.speechSynthesis.resume();
  }, [restartActiveSegment]);

  const setRateMultiplier = useCallback(
    (rateMultiplier: number) => {
      const nextRateMultiplier = clampRateMultiplier(rateMultiplier);
      if (rateMultiplierRef.current === nextRateMultiplier) return;

      rateMultiplierRef.current = nextRateMultiplier;

      const activePlayback = activePlaybackRef.current;
      if (
        !activePlayback ||
        !processingRef.current ||
        activePlayback.runId !== runIdRef.current ||
        !canUseSpeechSynthesis()
      ) {
        return;
      }

      // A paused native utterance cannot have its rate changed. Preserve its
      // place and swap it for a new-rate utterance when Play is pressed.
      if (pausedRef.current) {
        restartAfterResumeRef.current = true;
        return;
      }

      restartActiveSegment();
    },
    [restartActiveSegment],
  );

  const enqueueBeat = useCallback(
    (beat: SimulationVoiceBeat) => {
      if (!canUseSpeechSynthesis()) return;

      if (mountedRef.current) setCompletedBeatId(null);
      queueRef.current.push(cloneBeat(beat));
      processNextBeat();
    },
    [processNextBeat],
  );

  const replayBeat = useCallback(
    (beat: SimulationVoiceBeat) => {
      if (!canUseSpeechSynthesis()) return;

      cancel();
      queueRef.current = [cloneBeat(beat)];

      // The run identifier already prevents stale cancellation callbacks from
      // advancing this replacement beat. Starting synchronously preserves the
      // user gesture needed by stricter browser TTS policies.
      processNextBeat();
    },
    [cancel, processNextBeat],
  );

  useEffect(() => {
    mountedRef.current = true;

    if (!canUseSpeechSynthesis()) {
      return () => {
        mountedRef.current = false;
      };
    }

    const refreshVoices = () => {
      const nextVoices = getVoices();
      voicesRef.current = nextVoices;
      if (mountedRef.current) setVoicesAvailable(nextVoices);
    };

    refreshVoices();
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);

    return () => {
      mountedRef.current = false;
      runIdRef.current += 1;
      utteranceTokenRef.current += 1;
      queueRef.current = [];
      processingRef.current = false;
      pausedRef.current = false;
      restartAfterResumeRef.current = false;
      activePlaybackRef.current = null;
      restartSegmentRef.current = null;

      window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  return {
    isSpeaking,
    activeSegment,
    activeMessageId,
    activeSpeakerId,
    completedBeatId,
    voicesAvailable,
    enqueueBeat,
    replayBeat,
    pause,
    resume,
    setRateMultiplier,
    cancel,
  };
}
