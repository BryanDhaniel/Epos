"use client";

import dynamic from "next/dynamic";
import {
  Activity,
  BrainCircuit,
  Check,
  CircleAlert,
  CloudSun,
  Compass,
  Gauge,
  MapPin,
  MessageCircle,
  Menu,
  Pause,
  Play,
  RotateCcw,
  Send,
  SkipForward,
  Sparkles,
  StepForward,
  Volume2,
  VolumeX,
  Waves,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { type CSSProperties, type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import type { WorldEventCue, WorldSceneProps } from "@/components/epos/world-scene";
import { type BattlefieldAmbienceCue, useBattlefieldAudio } from "@/hooks/use-battlefield-audio";
import { type SimulationVoiceBeat, useSimulationVoice } from "@/hooks/use-simulation-voice";
import { getScenarioProgress, getSimulationOutcome } from "@/lib/simulation/engine";
import { getScenarioPack, SCENARIO_CATALOG, type PreviewScenarioPack, type ScenarioPack } from "@/lib/simulation/scenario-catalog";
import type {
  AgentMessage,
  AgentRuntimeState,
  EvidenceKind,
  SimulationLogEntry,
  WorldSceneTheme,
} from "@/lib/simulation/types";
import { useEposStore } from "@/stores/epos-store";

const WorldScene = dynamic<WorldSceneProps>(
  () => import("@/components/epos/world-scene").then((module) => module.WorldScene),
  {
    ssr: false,
    loading: () => <div className="world-loading">Building the historical landscape…</div>,
  },
);

const phaseNames: Record<string, string> = {
  dawn: "Dawn",
  morning: "Morning",
  afternoon: "Afternoon",
  dusk: "Dusk",
  night: "Night",
};

const eventColors: Record<SimulationLogEntry["kind"], string> = {
  event: "#4a91cb",
  modifier: "#e1a441",
  outcome: "#bd5b57",
  system: "#5e708e",
};

const factionColors: Record<string, string> = {
  wei: "#c85b47",
  "sun-liu": "#359c87",
  neutral: "#c49857",
};

const evidenceLabel: Record<EvidenceKind, string> = {
  "historical-fact": "Historical anchor",
  "historical-inference": "Modeled inference",
  speculation: "Speculative run",
};

const EMPTY_AGENT_MESSAGES: readonly AgentMessage[] = [];

function sentenceCase(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getAgentVoice(agent: AgentRuntimeState) {
  return `I am ${agent.emotionalState.primary}. ${agent.currentObjective} I can only speak from reports, memories, and observations available to me.`;
}

function resolveWhatIfPreset(
  prompt: string,
  presets: readonly { id: string; label: string; description: string; type: string }[],
) {
  const normalized = prompt.toLowerCase();
  const searchable = (preset: (typeof presets)[number]) =>
    `${preset.id} ${preset.label} ${preset.description}`.toLowerCase();
  const find = (predicate: (preset: (typeof presets)[number], text: string) => boolean) =>
    presets.find((preset) => predicate(preset, searchable(preset)));

  if (/(wind|breeze|rain|mud|ground|weather|dry)/.test(normalized)) {
    return find((preset) => preset.type === "weather");
  }
  if (/(water|cistern|thirst|drought)/.test(normalized)) {
    return find((preset, text) => preset.type === "resource" || preset.type === "infrastructure" || /(water|cistern)/.test(text));
  }
  if (/(supply|supplies|food|provisions|ammunition|ammo)/.test(normalized)) {
    return find((preset, text) => preset.type === "resource" || /(supply|food|ammo|ammunition)/.test(text));
  }
  if (/(ceasefire|truce|ultimatum|negotia|renewed talks|talks|parley|ransom|surrender|passage)/.test(normalized)) {
    return find((preset, text) => preset.type === "event" && /(ceasefire|truce|ultimatum|talk|parley|ransom|surrender|passage)/.test(text));
  }
  if (/(radio|broadcast|signal|message|communicat|rumou?r)/.test(normalized)) {
    return find((preset, text) => preset.type === "infrastructure" && /(radio|message|communication|signal)/.test(text));
  }
  if (/(evacuat|corridor|shelter|aid|medic|civilian|safe route)/.test(normalized)) {
    return find((preset, text) => preset.type === "infrastructure" && /(aid|evacuat|route|corridor|shelter)/.test(text));
  }
  if (/(reinforcement|reinforce|arrive|arrival|prussian|blücher|blucher|troops)/.test(normalized)) {
    return find((preset, text) => preset.type === "reinforcement" || /(reinforce|arriv|prussian|blucher)/.test(text));
  }
  if (/(hold|farm|fort|bridge|la haye|siege|wall|tower|engine|gate|breach)/.test(normalized)) {
    return find((preset) => preset.type === "event" || preset.type === "infrastructure");
  }

  return undefined;
}

function getSceneAmbienceCue(
  sceneTheme: WorldSceneTheme | undefined,
  tick: number,
): BattlefieldAmbienceCue | undefined {
  if (sceneTheme === "surabaya") {
    if (tick <= 1) return "surabaya-harbour";
    if (tick === 2 || tick === 5) return "surabaya-radio-room";
    if (tick === 3 || tick === 4) return "surabaya-street-lull";
    if (tick === 6) return "surabaya-urban-pressure";
    if (tick === 7) return "surabaya-aid-route";

    return "surabaya-aftermath";
  }

  if (sceneTheme === "jerusalem") {
    if (tick <= 1) return "jerusalem-dry-morning";
    if (tick === 2) return "jerusalem-city-strain";
    if (tick === 3 || tick === 4) return "jerusalem-siege-camp";
    if (tick === 5) return "jerusalem-assault-pressure";
    if (tick === 6) return "jerusalem-parley";
    if (tick === 7) return "jerusalem-departure";

    return "jerusalem-aftermath";
  }

  if (sceneTheme === "montgisard") {
    if (tick <= 1) return "montgisard-dry-road";
    if (tick === 2) return "montgisard-scout-line";
    if (tick === 3 || tick === 4) return "montgisard-field-tension";
    if (tick === 5) return "montgisard-charge-field";
    if (tick === 6) return "montgisard-rally";
    if (tick === 7) return "montgisard-withdrawal";

    return "montgisard-aftermath";
  }

  return undefined;
}

export function EposExperience() {
  const simulation = useEposStore((state) => state.simulation);
  const selectedAgentId = useEposStore((state) => state.selectedAgentId);
  const speed = useEposStore((state) => state.speed);
  const followSelected = useEposStore((state) => state.followSelected);
  const selectAgent = useEposStore((state) => state.selectAgent);
  const setSpeed = useEposStore((state) => state.setSpeed);
  const toggleFollowSelected = useEposStore((state) => state.toggleFollowSelected);
  const togglePlayback = useEposStore((state) => state.togglePlayback);
  const advanceOneTick = useEposStore((state) => state.advanceOneTick);
  const jumpToTick = useEposStore((state) => state.jumpToTick);
  const loadScenario = useEposStore((state) => state.loadScenario);
  const applyModifier = useEposStore((state) => state.applyModifier);
  const removeModifier = useEposStore((state) => state.removeModifier);
  const restart = useEposStore((state) => state.restart);

  const [inspectorView, setInspectorView] = useState<"profile" | "memory" | "network">("profile");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [narrationAudioEnabled, setNarrationAudioEnabled] = useState(true);
  const [selectedPreview, setSelectedPreview] = useState<PreviewScenarioPack | null>(null);
  const [delegationActive, setDelegationActive] = useState(false);
  const [whatIfPrompt, setWhatIfPrompt] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(
    "Ask why a decision was made, trace a supply route, or test a counterfactual. I will separate historical anchors from the model’s inference.",
  );
  const [isAsking, setIsAsking] = useState(false);
  const [manualSpeechMessage, setManualSpeechMessage] = useState<AgentMessage | null>(null);
  const lastQueuedNarrationId = useRef<string | undefined>(undefined);
  const lastBattlefieldEventId = useRef<string | undefined>(undefined);
  const lastBattlefieldAmbienceId = useRef<string | undefined>(undefined);
  const [skippedNarrationId, setSkippedNarrationId] = useState<string | undefined>(undefined);
  const [battlefieldAudioRevision, setBattlefieldAudioRevision] = useState(0);
  const {
    isSpeaking,
    activeSegment,
    activeMessageId,
    completedBeatId,
    enqueueBeat,
    replayBeat,
    pause: pauseVoice,
    resume: resumeVoice,
    setRateMultiplier: setVoiceRateMultiplier,
    cancel: cancelVoice,
  } = useSimulationVoice({ language: "en-US" });
  const {
    unlock: unlockBattlefieldAudio,
    playCue: playBattlefieldCue,
    playAmbience: playBattlefieldAmbience,
    stop: stopBattlefieldAudio,
  } = useBattlefieldAudio(narrationAudioEnabled);

  const selectedAgent =
    simulation.agents.find((agent) => agent.id === selectedAgentId) ?? simulation.agents[0];
  const selectedLocation = simulation.scenario.locations.find(
    (location) => location.id === selectedAgent?.currentLocationId,
  );
  const progress = getScenarioProgress(simulation);
  const outcome = getSimulationOutcome(simulation);
  const activeScenarioPack = getScenarioPack(simulation.scenario.id);
  const scenarioPresentation = simulation.scenario.presentation;
  const sceneAmbienceCue = getSceneAmbienceCue(scenarioPresentation?.scene, simulation.tick);
  const metricLabels = scenarioPresentation?.metricLabels ?? {
    morale: "Coalition morale",
    supplies: "Supply resilience",
    mobility: "Operational mobility",
    cohesion: "Coordination",
  };
  const causalThread = scenarioPresentation?.causalThread ?? {
    title: "Conditions → decisions → consequences",
    description:
      "Use the timeline to connect changing conditions with decisions, while treating no single number as a complete explanation.",
  };
  const mission = scenarioPresentation?.mission ?? {
    title: "Trace the evidence trail",
    description:
      "Compare reports, conditions, and decisions before drawing conclusions about the outcome.",
    steps: ["Observe", "Compare reports", "Test a premise"],
  };
  const whatIfPresets = activeScenarioPack?.status === "playable" ? activeScenarioPack.whatIfPresets : [];
  const activeModifiers = simulation.modifiers.filter((modifier) =>
    whatIfPresets.some((preset) => preset.id === modifier.id),
  );
  const activeModifier = activeModifiers[activeModifiers.length - 1];
  const recentEvents = simulation.timelineLog.slice(-4).reverse();
  const nextHistoricalMoment = simulation.scenario.timeline.find((event) => event.tick > simulation.tick);
  const visibleEvents: readonly SimulationLogEntry[] = recentEvents.length
    ? recentEvents
    : [
        {
          id: "waiting",
          tick: 0,
          title: "Awaiting first decision",
          description: "The timeline will populate as the scenario advances.",
          kind: "system",
          evidence: "historical-inference",
          participantIds: [],
        },
      ];
  const latestNarrationEntry = [...simulation.timelineLog]
    .reverse()
    .find((entry) => entry.kind === "event" || entry.kind === "outcome");
  const narrationTitle = latestNarrationEntry?.title ?? "The campaign is about to unfold";
  const narrationDescription =
    latestNarrationEntry?.description ??
    "The simulation begins with incomplete reports, uneven resources, and a coalition that must decide how to coordinate.";
  const narrationStory = latestNarrationEntry?.narration?.story;
  const narrationWhy =
    latestNarrationEntry?.narration?.why ??
    "Historical outcomes emerge from connected choices and conditions. Advance the timeline to trace the evidence behind the next decision.";
  const narrationMessages = latestNarrationEntry?.messages ?? EMPTY_AGENT_MESSAGES;
  const narrationBeat = useMemo<SimulationVoiceBeat>(
    () => ({
      id: latestNarrationEntry?.id ?? `opening-${simulation.scenario.id}`,
      narrator: {
        title: narrationTitle,
        description: narrationDescription,
        story: narrationStory,
        why: narrationWhy,
      },
      messages: narrationMessages,
      speakers: simulation.agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
      })),
    }),
    [latestNarrationEntry?.id, narrationDescription, narrationMessages, narrationStory, narrationTitle, narrationWhy, simulation.agents, simulation.scenario.id],
  );
  const activeSpeechBubbles = useMemo(() => {
    if (!activeMessageId) return [];

    return [...narrationMessages, ...(manualSpeechMessage ? [manualSpeechMessage] : [])].filter(
      (message) => message.id === activeMessageId,
    );
  }, [activeMessageId, manualSpeechMessage, narrationMessages]);
  const activeWorldEvent = useMemo<WorldEventCue | null>(
    () =>
      latestNarrationEntry?.worldAction
        ? {
            id: latestNarrationEntry.id,
            action: latestNarrationEntry.worldAction,
            title: latestNarrationEntry.title,
            locationId: latestNarrationEntry.locationId,
          }
        : null,
    [latestNarrationEntry],
  );
  const activeSubtitleSpeaker = activeSegment?.speakerId
    ? simulation.agents.find((agent) => agent.id === activeSegment.speakerId)
    : undefined;
  const subtitleFallback = narrationStory ?? narrationDescription;
  const subtitleText = activeSegment?.text ?? subtitleFallback;
  const subtitleSpeakerName = activeSegment?.kind === "character"
    ? activeSubtitleSpeaker?.name ?? "Field report"
    : "Narrator";
  const subtitleKey = activeSegment
    ? `${activeSegment.kind}-${activeSegment.messageId ?? latestNarrationEntry?.id ?? "opening"}-${activeSegment.text}`
    : `idle-${latestNarrationEntry?.id ?? "opening"}-${subtitleFallback}`;
  const captionWordCount = useMemo(
    () => [narrationStory ?? narrationDescription, ...narrationMessages.map((message) => message.text)]
      .join(" ")
      .trim()
      .split(/\s+/).filter(Boolean).length,
    [narrationDescription, narrationMessages, narrationStory],
  );
  const captionDwellMs = latestNarrationEntry
    ? Math.max(6_500, Math.min(16_000, captionWordCount * 260))
    : 4_500;
  const browserSpeechAvailable =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;
  const currentNarrationIsMuted = skippedNarrationId === narrationBeat.id;
  const shouldAwaitNarrationCompletion =
    browserSpeechAvailable &&
    narrationAudioEnabled &&
    latestNarrationEntry !== undefined &&
    !currentNarrationIsMuted &&
    completedBeatId !== narrationBeat.id;
  const voicePlaybackActive =
    narrationAudioEnabled &&
    !currentNarrationIsMuted &&
    completedBeatId === narrationBeat.id &&
    latestNarrationEntry?.tick === simulation.tick &&
    browserSpeechAvailable;
  const nextTickDelay = voicePlaybackActive
    ? Math.max(300, Math.round(1_200 / speed))
    : Math.max(1_250, Math.round(captionDwellMs / speed));

  const relationshipRows = useMemo(
    () =>
      selectedAgent
        ? Object.entries(selectedAgent.trust).map(([agentId, trust]) => ({
            agent: simulation.agents.find((candidate) => candidate.id === agentId),
            trust,
          }))
        : [],
    [selectedAgent, simulation.agents],
  );

  useEffect(() => {
    if (!narrationAudioEnabled) return;
    if (skippedNarrationId === narrationBeat.id) return;
    if (lastQueuedNarrationId.current === narrationBeat.id) return;

    lastQueuedNarrationId.current = narrationBeat.id;
    enqueueBeat(narrationBeat);
  }, [enqueueBeat, narrationAudioEnabled, narrationBeat, skippedNarrationId]);

  useEffect(() => {
    if (!activeWorldEvent?.action) {
      lastBattlefieldEventId.current = undefined;
      return;
    }
    if (!narrationAudioEnabled || lastBattlefieldEventId.current === activeWorldEvent.id) return;

    if (playBattlefieldCue(activeWorldEvent.action)) {
      lastBattlefieldEventId.current = activeWorldEvent.id;
    }
  }, [activeWorldEvent, battlefieldAudioRevision, narrationAudioEnabled, playBattlefieldCue]);

  useEffect(() => {
    if (!sceneAmbienceCue) {
      lastBattlefieldAmbienceId.current = undefined;
      return;
    }

    // Pausing stops Web Audio immediately. Reset only the finite environment
    // bed so resuming can restore place without replaying narration or the
    // historical event cue.
    if (simulation.status === "paused" || simulation.status === "ready") {
      lastBattlefieldAmbienceId.current = undefined;
      return;
    }

    const ambienceId = `${simulation.scenario.id}:${simulation.tick}:${sceneAmbienceCue}`;
    if (!narrationAudioEnabled || lastBattlefieldAmbienceId.current === ambienceId) return;

    if (playBattlefieldAmbience(sceneAmbienceCue)) {
      lastBattlefieldAmbienceId.current = ambienceId;
    }
  }, [
    battlefieldAudioRevision,
    narrationAudioEnabled,
    playBattlefieldAmbience,
    sceneAmbienceCue,
    simulation.scenario.id,
    simulation.status,
    simulation.tick,
  ]);

  useEffect(() => {
    if (simulation.status !== "running" || isSpeaking || shouldAwaitNarrationCompletion) return;

    // Each event waits for its matching beat to complete, then advances at
    // the selected pace. This avoids racing the narration queue at high speed.
    const timer = window.setTimeout(advanceOneTick, nextTickDelay);
    return () => window.clearTimeout(timer);
  }, [advanceOneTick, isSpeaking, nextTickDelay, shouldAwaitNarrationCompletion, simulation.status, simulation.tick]);

  useEffect(() => {
    if (!workspaceOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setWorkspaceOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [workspaceOpen]);

  const prepareBattlefieldAudio = () => {
    if (!narrationAudioEnabled) return;

    // This runs directly from a learner's button click. Browsers only permit
    // Web Audio to start after such a gesture, never from the timeline effect.
    void unlockBattlefieldAudio().then((unlocked) => {
      if (unlocked) setBattlefieldAudioRevision((revision) => revision + 1);
    });
  };

  const speakAgent = () => {
    if (!selectedAgent) return;

    const message: AgentMessage = {
      id: `agent-perspective-${selectedAgent.id}-${simulation.tick}-${Date.now()}`,
      speakerId: selectedAgent.id,
      text: getAgentVoice(selectedAgent),
      channel: "spoken",
      evidence: "historical-inference",
    };

    setManualSpeechMessage(message);
    setSkippedNarrationId(narrationBeat.id);
    replayBeat({
      id: message.id,
      narrator: { title: "", description: "", why: "" },
      messages: [message],
      speakers: [{ id: selectedAgent.id, name: selectedAgent.name, role: selectedAgent.role }],
    });
  };

  const toggleNarrationAudio = () => {
    // Keep the current narration marked as handled. Turning sound back on
    // should only affect future parts, never restart the line just muted.
    lastQueuedNarrationId.current = narrationBeat.id;
    setSkippedNarrationId(narrationBeat.id);

    if (narrationAudioEnabled) {
      setNarrationAudioEnabled(false);
      cancelVoice();
      stopBattlefieldAudio();
      lastBattlefieldEventId.current = undefined;
      lastBattlefieldAmbienceId.current = undefined;
      return;
    }

    setNarrationAudioEnabled(true);
    // Do not fire a battle cue merely because a learner unmutes while the
    // timeline is paused. The next manual step or Play action schedules it.
    lastBattlefieldEventId.current = simulation.status === "paused"
      ? activeWorldEvent?.id
      : undefined;
    lastBattlefieldAmbienceId.current = undefined;
    // This is still a direct speaker-button gesture, so it can resume Web
    // Audio without restarting the narration the learner just muted.
    void unlockBattlefieldAudio().then((unlocked) => {
      if (unlocked) setBattlefieldAudioRevision((revision) => revision + 1);
    });
  };

  const togglePlaybackWithNarration = () => {
    if (simulation.status === "complete") return;

    if (simulation.status === "running") {
      pauseVoice();
      stopBattlefieldAudio();
      lastBattlefieldEventId.current = undefined;
      lastBattlefieldAmbienceId.current = undefined;
      togglePlayback();
      return;
    }

    if (simulation.status === "paused") {
      lastBattlefieldEventId.current = undefined;
      lastBattlefieldAmbienceId.current = undefined;
    }

    prepareBattlefieldAudio();

    if (narrationAudioEnabled && isSpeaking) {
      resumeVoice();
    } else if (
      simulation.status === "ready" &&
      narrationAudioEnabled &&
      completedBeatId !== narrationBeat.id
    ) {
      // A direct replay inside the Play click unlocks speech on browsers that
      // reject synthesis started only from an effect or timer. Resuming a
      // paused simulation never takes this path, so it cannot repeat a part.
      setSkippedNarrationId(undefined);
      lastQueuedNarrationId.current = narrationBeat.id;
      replayBeat(narrationBeat);
    }

    togglePlayback();
  };

  const changeSimulationSpeed = (value: typeof speed) => {
    // Web Speech freezes an utterance's rate when it starts. Updating the
    // voice controller first lets it continue this exact subtitle at the new
    // rate rather than waiting for the next historical part.
    setVoiceRateMultiplier(value === 1 ? 1 : value === 2 ? 1.09 : value === 3 ? 1.18 : 1.3);
    setSpeed(value);
  };

  const changeModifier = (presetId: string) => {
    const preset = whatIfPresets.find((candidate) => candidate.id === presetId);
    if (!preset) return;

    prepareBattlefieldAudio();
    cancelVoice();
    stopBattlefieldAudio();
    setManualSpeechMessage(null);
    lastQueuedNarrationId.current = undefined;
    lastBattlefieldEventId.current = undefined;
    lastBattlefieldAmbienceId.current = undefined;
    setSkippedNarrationId(undefined);

    if (simulation.modifiers.some((modifier) => modifier.id === preset.id)) {
      removeModifier(preset.id);
      return;
    }

    for (const modifier of activeModifiers) {
      removeModifier(modifier.id);
    }
    applyModifier(preset);
  };

  const chooseScenario = (pack: ScenarioPack) => {
    if (pack.status === "preview") {
      setSelectedPreview(pack);
      return;
    }

    prepareBattlefieldAudio();
    cancelVoice();
    stopBattlefieldAudio();
    setManualSpeechMessage(null);
    lastQueuedNarrationId.current = undefined;
    lastBattlefieldEventId.current = undefined;
    lastBattlefieldAmbienceId.current = undefined;
    setSkippedNarrationId(undefined);
    loadScenario(pack.scenario, pack.defaultAgentId);
    setSelectedPreview(null);
    setWorkspaceOpen(false);
  };

  const restartSimulation = () => {
    cancelVoice();
    stopBattlefieldAudio();
    setManualSpeechMessage(null);
    lastQueuedNarrationId.current = undefined;
    lastBattlefieldEventId.current = undefined;
    lastBattlefieldAmbienceId.current = undefined;
    setSkippedNarrationId(undefined);
    restart();
  };

  const advanceSimulationStep = () => {
    if (isSpeaking) return;
    prepareBattlefieldAudio();
    advanceOneTick();
  };

  const jumpToHistoricalMoment = () => {
    if (!nextHistoricalMoment) return;
    prepareBattlefieldAudio();
    cancelVoice();
    stopBattlefieldAudio();
    setManualSpeechMessage(null);
    lastQueuedNarrationId.current = undefined;
    lastBattlefieldEventId.current = undefined;
    lastBattlefieldAmbienceId.current = undefined;
    setSkippedNarrationId(undefined);
    jumpToTick(nextHistoricalMoment.tick);
  };

  const submitNaturalLanguageWhatIf = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = whatIfPrompt.trim().toLowerCase();
    if (!prompt) return;

    const preset = resolveWhatIfPreset(prompt, whatIfPresets);
    if (preset) {
      changeModifier(preset.id);
    } else {
      setAnswer(
        `This classroom slice can currently test: ${whatIfPresets.map((candidate) => candidate.label.toLowerCase()).join(", ")}. Try one of those variables, then compare the causal chain.`,
      );
      setChatOpen(true);
    }
    setWhatIfPrompt("");
  };

  const askBriefing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || !selectedAgent) return;

    setIsAsking(true);
    try {
      const response = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmedQuestion,
          tick: simulation.tick,
          selectedAgent: {
            name: selectedAgent.name,
            role: selectedAgent.role,
            objective: selectedAgent.currentObjective,
            knowledge: selectedAgent.knowledge.map((item) => item.statement),
          },
          world: {
            weather: simulation.world.weather,
            pressures: simulation.world.pressures,
            modifiers: simulation.modifiers.map((modifier) => modifier.label),
          },
        }),
      });
      const payload = (await response.json()) as { answer?: string };
      setAnswer(payload.answer ?? "I could not assemble a briefing from the current evidence.");
    } catch {
      setAnswer(
        `${selectedAgent.name} cannot receive a new briefing right now. Their current evidence is: ${selectedAgent.knowledge[0]?.statement ?? "no verified report yet"}`,
      );
    } finally {
      setIsAsking(false);
      setQuestion("");
    }
  };

  const currentOutcomeText = activeModifier
    ? `${activeModifier.description} Continue the timeline to compare this speculative premise with the historical baseline.`
    : `${simulation.scenario.historicalNote} Advance the timeline to trace the connected conditions and choices.`;
  const causalDescription = causalThread.description
    .replace("{diseaseRisk}", String(simulation.world.pressures.diseaseRisk))
    .replace("{groundMobility}", String(simulation.world.pressures.riverMobility));

  const selectedColor = selectedAgent
    ? simulation.world.factions[selectedAgent.factionId]?.color ?? factionColors[selectedAgent.factionId] ?? factionColors.neutral
    : factionColors.neutral;
  const statusText = simulation.status === "running" ? "Simulation live" : simulation.status === "complete" ? "Checkpoint complete" : "Simulation paused";
  const reportAgents = simulation.agents.filter((agent) => agent.id !== selectedAgent?.id);
  const delegationSteps = [
    { label: `${selectedAgent?.name ?? "The commander"} frames the question`, complete: delegationActive },
    { label: `${reportAgents[0]?.name ?? "A field observer"} gathers local reports`, complete: delegationActive && simulation.tick >= 1 },
    { label: `${reportAgents[1]?.name ?? "A second witness"} cross-checks the evidence`, complete: delegationActive && simulation.tick >= 2 },
    { label: "A source-aware report returns", complete: delegationActive && simulation.tick >= 3 },
  ];

  return (
    <main className="epos-shell">
      <div className="epos-app">
        <header className="app-header app-header--minimal">
          <div className="brand-area">
            <div className="brand-mark" aria-hidden="true">
              <Waves size={17} strokeWidth={2.25} />
            </div>
            <div>
              <span className="brand-word">epos</span>
              <span className="brand-tagline">living history lab</span>
            </div>
            <span className="watch-scenario-title">{simulation.scenario.title}</span>
          </div>

          <div className="header-actions header-actions--minimal">
            <span className="status-indicator" role="status" aria-label={statusText} title={statusText}>
              <span className="live-dot" />
            </span>
            <button
              className="icon-button menu-trigger"
              type="button"
              aria-label="Open simulation controls"
              aria-expanded={workspaceOpen}
              aria-controls="simulation-command-deck"
              onClick={() => setWorkspaceOpen(true)}
            >
              <Menu size={18} />
            </button>
          </div>
        </header>

        <section className="world-card world-card--fullscreen" aria-label="Three-dimensional historical world">
          <WorldScene
            agents={simulation.agents}
            locations={simulation.scenario.locations}
            factions={simulation.world.factions}
            sceneTheme={scenarioPresentation?.scene ?? "red-cliffs"}
            selectedAgentId={selectedAgentId}
            weather={simulation.world.weather}
            followSelected={followSelected}
            speechBubbles={activeSpeechBubbles}
            activeEvent={activeWorldEvent}
            onSelectAgent={selectAgent}
          />
          <div className={`world-overlay world-topline world-topline--minimal${simulation.status === "running" ? " is-running" : ""}`}>
            <span className="world-location">
              <Compass size={13} />
              {activeScenarioPack?.locationLabel ?? "Historical simulation"}
            </span>
          </div>
          <section className="world-overlay live-narration" aria-label="Live historical narration">
            <div className={`live-narration__cue${isSpeaking ? " is-speaking" : ""}`} aria-live="polite" aria-atomic="true">
              <div className="live-narration__meta">
                <span className="live-narration__speaker">
                  {isSpeaking && <Volume2 size={11} aria-hidden="true" />}
                  {subtitleSpeakerName}
                </span>
              </div>
              <AnimatePresence initial={false} mode="wait">
                <motion.p
                  key={subtitleKey}
                  className="live-narration__subtitle"
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {subtitleText}
                </motion.p>
              </AnimatePresence>
            </div>
          </section>
          <nav className="world-overlay watch-controls" aria-label="Primary simulation controls">
            <div className="watch-control-surface">
              <div className="watch-control-group watch-control-group--audio">
                <button
                  className={`watch-control-button watch-audio-button${narrationAudioEnabled ? " is-active" : ""}`}
                  type="button"
                  aria-label={narrationAudioEnabled ? "Turn off narration and battlefield sound" : "Turn on narration and battlefield sound"}
                  aria-pressed={narrationAudioEnabled}
                  title={narrationAudioEnabled ? "Narration and battlefield sound on" : "Narration and battlefield sound off"}
                  onClick={toggleNarrationAudio}
                >
                  {narrationAudioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>
              </div>
              <div className="watch-control-group watch-control-group--playback">
                <button
                  className="watch-control-button"
                  type="button"
                  aria-label={simulation.status === "running" ? "Pause simulation" : "Play simulation"}
                  aria-pressed={simulation.status === "running"}
                  title={simulation.status === "running" ? "Pause simulation" : "Play simulation"}
                  onClick={togglePlaybackWithNarration}
                  disabled={simulation.status === "complete"}
                >
                  {simulation.status === "running" ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>
              </div>
              <div className="watch-control-group watch-control-group--navigation">
                <button
                  className="watch-control-button"
                  type="button"
                  aria-label="Advance one simulation step"
                  title="Advance one simulation step"
                  onClick={advanceSimulationStep}
                  disabled={isSpeaking}
                >
                  <StepForward size={15} />
                </button>
                <button
                  className="watch-control-button"
                  type="button"
                  aria-label="Jump to next historical moment"
                  title="Jump to next historical moment"
                  disabled={!nextHistoricalMoment}
                  onClick={jumpToHistoricalMoment}
                >
                  <SkipForward size={15} />
                </button>
                <button
                  className={`watch-control-button${followSelected ? " is-active" : ""}`}
                  type="button"
                  aria-label={followSelected ? "Stop following selected agent" : "Follow selected agent"}
                  aria-pressed={followSelected}
                  title={followSelected ? "Stop following selected agent" : "Follow selected agent"}
                  onClick={toggleFollowSelected}
                >
                  <MapPin size={15} />
                </button>
              </div>
              <div className="watch-control-group watch-control-group--speed">
                <div className="watch-speed-set" aria-label="Simulation speed">
                  {([1, 2, 3, 5] as const).map((value) => (
                    <button
                      className={`watch-speed-button${speed === value ? " is-active" : ""}`}
                      type="button"
                      key={value}
                      aria-pressed={speed === value}
                      onClick={() => changeSimulationSpeed(value)}
                    >
                      {value}×
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </nav>
        </section>

        <AnimatePresence>
          {workspaceOpen && (
            <>
              <motion.aside
                id="simulation-command-deck"
                className="workspace-popout"
                role="dialog"
                aria-label="Simulation command deck"
                initial={{ opacity: 0, x: 40, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className="workspace-popout__header">
                  <div>
                    <p className="eyebrow">{simulation.scenario.title}</p>
                    <h2 className="workspace-popout__title">Controls &amp; study tools</h2>
                  </div>
                  <div className="workspace-popout__actions">
                    <button className="workspace-chat-button" type="button" onClick={() => setChatOpen(true)}>
                      <MessageCircle size={14} /> Ask the world
                    </button>
                    <button className="icon-button" type="button" aria-label="Restart simulation" title="Restart simulation" onClick={restartSimulation}>
                      <RotateCcw size={16} />
                    </button>
                    <button className="icon-button" type="button" aria-label="Close simulation controls" onClick={() => setWorkspaceOpen(false)} autoFocus>
                      <X size={17} />
                    </button>
                  </div>
                </div>
                <div className="workspace-popout__scroll">
                  <section className="scenario-library" aria-labelledby="scenario-library-title">
                    <div className="scenario-library__head">
                      <div>
                        <p className="eyebrow">Scenario library</p>
                        <h3 id="scenario-library-title">Choose a historical world</h3>
                      </div>
                      <span>
                        {SCENARIO_CATALOG.filter((pack) => pack.status === "playable").length} playable · {SCENARIO_CATALOG.filter((pack) => pack.status === "preview").length} in research
                      </span>
                    </div>
                    <div className="scenario-library__grid">
                      {SCENARIO_CATALOG.map((pack) => (
                        <button
                          className={`scenario-card${pack.id === simulation.scenario.id ? " is-active" : ""}${pack.status === "preview" ? " is-preview" : ""}`}
                          type="button"
                          key={pack.id}
                          onClick={() => chooseScenario(pack)}
                        >
                          <span className="scenario-card__status">{pack.status === "playable" ? "Play now" : "Preview"}</span>
                          <strong>{pack.title}</strong>
                          <span>{pack.era}</span>
                          <small>{pack.learningFocus.slice(0, 2).join(" · ")}</small>
                        </button>
                      ))}
                    </div>
                    {selectedPreview ? (
                      <div className="scenario-preview-note">
                        <div>
                          <span className="tiny-label">{selectedPreview.title}</span>
                          <strong>{selectedPreview.previewNote}</strong>
                          <p>{selectedPreview.scopeNote}</p>
                        </div>
                        <button className="icon-button" type="button" aria-label="Dismiss scenario preview" onClick={() => setSelectedPreview(null)}><X size={14} /></button>
                      </div>
                    ) : (
                      <p className="scenario-library__note">Preview cards explain the next models in development. They are not presented as simulated history until their source pack and causal rules are ready.</p>
                    )}
                  </section>
                  <section className="workspace-grid workspace-grid--popout" aria-label="Historical simulation workspace">
          <aside className="panel left-panel" aria-label="World state">
            <div className="briefing-head">
              <div>
                <p className="eyebrow">World state</p>
                <h2 className="panel-title">At a glance</h2>
              </div>
              <Gauge size={16} color="#6b88aa" />
            </div>

            <section className="weather-card">
              <div className="weather-main">
                <CloudSun className="weather-symbol" size={27} strokeWidth={1.7} />
                <div>
                  <p className="weather-value">{sentenceCase(simulation.world.weather.condition)}</p>
                  <p className="weather-subtitle">
                    {simulation.world.weather.windStrength}/100 wind · {sentenceCase(simulation.world.weather.windDirection)}
                  </p>
                </div>
              </div>
              <p className="weather-time">
                {phaseNames[simulation.world.phase]} · Campaign day {simulation.world.day + 1}
              </p>
            </section>

            <div className="metric-stack">
              {[
                {
                  label: metricLabels.morale,
                  value: simulation.world.factions["sun-liu"].resources.morale,
                  start: "#50b99d",
                  end: "#278875",
                },
                {
                  label: metricLabels.supplies,
                  value: simulation.world.factions["sun-liu"].resources.supplies,
                  start: "#e8ba52",
                  end: "#d18a2a",
                },
                {
                  label: metricLabels.mobility,
                  value: simulation.world.pressures.riverMobility,
                  start: "#64aede",
                  end: "#287bc4",
                },
                {
                  label: metricLabels.cohesion,
                  value: simulation.world.pressures.diplomaticCohesion,
                  start: "#9f89c9",
                  end: "#7457a9",
                },
              ].map((metric) => (
                <div key={metric.label}>
                  <div className="metric-top">
                    <span className="metric-label">{metric.label}</span>
                    <span className="metric-value">{metric.value}</span>
                  </div>
                  <div className="meter" style={{ "--meter-start": metric.start, "--meter-end": metric.end } as CSSProperties}>
                    <span style={{ width: `${metric.value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <section className="cause-card">
              <span className="tiny-label">Current causal thread</span>
              <strong>{causalThread.title}</strong>
              <p>{causalDescription}</p>
            </section>

            <div>
              <p className="eyebrow">Live signals</p>
              <div className="signal-list">
                {Object.values(simulation.world.infrastructure)
                  .slice(0, 3)
                  .map((infrastructure, index) => (
                    <div className="signal-row" key={infrastructure.id}>
                      <span className={`signal-dot${infrastructure.status === "strained" || infrastructure.status === "damaged" ? " amber" : index === 1 ? " blue" : ""}`} />
                      <span>{infrastructure.name}</span>
                      <span className="signal-meta">{infrastructure.status}</span>
                    </div>
                  ))}
              </div>
            </div>
          </aside>

          <aside className="panel right-panel" aria-label="Agent inspector">
            <div className="mode-tabs">
              {(["profile", "memory", "network"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`mode-tab${inspectorView === tab ? " is-active" : ""}`}
                  type="button"
                  onClick={() => setInspectorView(tab)}
                >
                  {sentenceCase(tab)}
                </button>
              ))}
            </div>

            {selectedAgent && inspectorView === "profile" && (
              <section className="agent-card">
                <div className="agent-heading">
                  <div className="agent-avatar" style={{ background: selectedColor }}>
                    {selectedAgent.name.charAt(0)}
                  </div>
                  <div>
                    <p className="eyebrow">Selected agent</p>
                    <h2 className="agent-name">{selectedAgent.name}</h2>
                    <p className="agent-location"><MapPin size={10} />{selectedLocation?.name ?? "In transit"}</p>
                  </div>
                </div>
                <div className="role-line">
                  <span className="status-badge"><Activity size={11} />{sentenceCase(selectedAgent.status)}</span>
                  <span>{selectedAgent.title ?? sentenceCase(selectedAgent.role)}</span>
                </div>
                <p className="agent-summary">{selectedAgent.biography}</p>
                <div className="agent-facts">
                  <div className="agent-fact"><span className="agent-fact-label">Emotion</span><span className="agent-fact-value">{sentenceCase(selectedAgent.emotionalState.primary)} · {selectedAgent.emotionalState.intensity}/100</span></div>
                  <div className="agent-fact"><span className="agent-fact-label">Knows</span><span className="agent-fact-value">{selectedAgent.knowledge.length} reported facts</span></div>
                  <div className="agent-fact"><span className="agent-fact-label">Traits</span><span className="agent-fact-value">{selectedAgent.personality.traits.slice(0, 2).join(", ")}</span></div>
                </div>
                <div className="agent-objective">
                  <span className="tiny-label">Current objective</span>
                  <strong>{selectedAgent.currentObjective}</strong>
                </div>
                <button className="speak-button" type="button" onClick={speakAgent}>
                  <Volume2 size={14} /> Hear perspective
                </button>
                <button className="delegation-button" type="button" onClick={() => setDelegationActive(true)}>
                  <Compass size={13} /> Delegate inquiry
                </button>
              </section>
            )}

            {selectedAgent && inspectorView === "memory" && (
              <section className="agent-card">
                <div>
                  <p className="eyebrow">Limited knowledge</p>
                  <h2 className="agent-name">What {selectedAgent.name} knows</h2>
                </div>
                {selectedAgent.knowledge.slice(-3).reverse().map((knowledge) => (
                  <div className="agent-objective" key={knowledge.id}>
                    <span className="tiny-label">{evidenceLabel[knowledge.evidence]} · {knowledge.confidence}%</span>
                    <strong>{knowledge.statement}</strong>
                  </div>
                ))}
                <div>
                  <p className="eyebrow">Memory trail</p>
                  {selectedAgent.memory.slice(-3).reverse().map((memory) => (
                    <p className="agent-summary" key={memory.id}>{memory.summary}</p>
                  ))}
                </div>
              </section>
            )}

            {selectedAgent && inspectorView === "network" && (
              <section className="agent-card">
                <div>
                  <p className="eyebrow">Trust network</p>
                  <h2 className="agent-name">Known relationships</h2>
                </div>
                {relationshipRows.length ? relationshipRows.map(({ agent, trust }) => (
                  <div className="agent-objective" key={agent?.id ?? trust}>
                    <span className="tiny-label">Trust · {trust}/100</span>
                    <strong>{agent?.name ?? "Unidentified contact"}</strong>
                  </div>
                )) : <p className="agent-summary">This agent has no modeled trust relationships yet.</p>}
              </section>
            )}

            <div className="agent-list">
              <p className="agent-list-title">Active agents · {simulation.agents.length}</p>
              {simulation.agents.slice(0, 6).map((agent) => (
                <button
                  className={`agent-row${agent.id === selectedAgentId ? " is-selected" : ""}`}
                  type="button"
                  key={agent.id}
                  onClick={() => selectAgent(agent.id)}
                >
                  <span className="agent-row-avatar" style={{ background: simulation.world.factions[agent.factionId]?.color ?? factionColors[agent.factionId] }}>{agent.name.charAt(0)}</span>
                  <span className="agent-row-name">{agent.name}</span>
                  <span className="agent-row-state">{agent.status}</span>
                </button>
              ))}
            </div>
          </aside>
        </section>

        <section className="bottom-dock bottom-dock--popout" aria-label="Simulation controls and learning tools">
          <section className="bottom-card timeline-card">
            <div className="timeline-card__head">
              <div>
                <p className="eyebrow">Event timeline</p>
                <strong>{phaseNames[progress.phase]} · step {progress.tick}/{progress.maxTicks}</strong>
              </div>
              <span>Transport below narration</span>
            </div>
            <div className="events-list">
              {visibleEvents.map((entry) => (
                <button
                  type="button"
                  className={`event-row${entry.tick === simulation.tick ? " is-current" : ""}`}
                  key={entry.id}
                  onClick={() => entry.participantIds[0] && selectAgent(entry.participantIds[0])}
                >
                  <span className="event-time">{entry.tick === 0 ? "NOW" : `T+${entry.tick}`}</span>
                  <span className="event-dot" style={{ background: eventColors[entry.kind] }} />
                  <span className="event-title">{entry.title}</span>
                </button>
              ))}
            </div>
          </section>

          <motion.section className="bottom-card mission-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="mission-number">01</div>
            <div>
              <p className="task-overline">{delegationActive ? "Autonomous delegation" : "Guided investigation"}</p>
              <h2 className="mission-title">{delegationActive ? "Find why readiness is changing" : mission.title}</h2>
              <p className="mission-description">{delegationActive ? "Agents are separating observation from inference before returning a report. The plan remains visible so students can challenge each handoff." : mission.description}</p>
              <div className="task-steps">
                {delegationActive
                  ? delegationSteps.map((step) => <span className={`task-step${step.complete ? " is-done" : ""}`} key={step.label}><Check size={10} />{step.label}</span>)
                  : <>
                      {mission.steps.slice(0, 3).map((step, index) => (
                        <span className={`task-step${progress.tick >= [1, 2, 4][index] ? " is-done" : ""}`} key={step}>
                          <Check size={10} />{step}
                        </span>
                      ))}
                    </>}
              </div>
            </div>
            <div className="mission-footer">
              <span className="mission-caption">{delegationActive ? `Plan confidence: ${Math.min(92, 48 + simulation.tick * 12)}%` : progress.tick < 4 ? "Follow the evidence trail" : "Compare outcomes"}</span>
              <div className="progress-track"><span style={{ width: `${Math.min(100, Math.max(18, progress.percentage))}%` }} /></div>
            </div>
          </motion.section>

          <section className="bottom-card whatif-card">
            <div className="whatif-heading">
              <div>
                <p className="eyebrow">Counterfactual lab</p>
                <h2 className="whatif-title">What changes if…</h2>
              </div>
              <Sparkles size={17} color="#f4d77c" />
            </div>
            <div className="whatif-options">
              {whatIfPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`whatif-option${activeModifier?.id === preset.id ? " is-active" : ""}`}
                  onClick={() => changeModifier(preset.id)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <form className="whatif-form" onSubmit={submitNaturalLanguageWhatIf}>
              <input className="whatif-input" value={whatIfPrompt} onChange={(event) => setWhatIfPrompt(event.target.value)} placeholder={scenarioPresentation?.whatIfPromptHint ?? "Try: What if supplies doubled?"} maxLength={120} />
              <button className="whatif-submit" type="submit" aria-label="Apply what-if prompt"><Send size={12} /></button>
            </form>
            <div className="whatif-result">
              <CircleAlert size={15} color="#f3ce71" />
              <p>{currentOutcomeText}</p>
            </div>
            <p className="whatif-note">{activeModifier ? "Speculative model — compare its causal logic with the historical record." : "Select a premise to recompute the same timeline under a transparent alternate condition."}</p>
          </section>
        </section>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {chatOpen && (
          <motion.section
            className="chat-drawer"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            aria-label="Ask a contextual historical question"
          >
            <div className="chat-drawer-head">
              <div>
                <p className="eyebrow">Contextual briefing</p>
                <h2 className="chat-drawer-title">Ask from this moment</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close briefing" onClick={() => setChatOpen(false)}><X size={15} /></button>
            </div>
            <p className="chat-response">{answer}</p>
            <form className="chat-form" onSubmit={askBriefing}>
              <input
                className="chat-input"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Why is morale falling?"
                maxLength={280}
              />
              <button className="chat-submit" type="submit" aria-label="Send question" disabled={isAsking || !question.trim()}>
                {isAsking ? <SkipForward size={15} /> : <Send size={15} />}
              </button>
            </form>
            <p className="source-line"><BrainCircuit size={11} /> Grounded in agent-limited context · {evidenceLabel[outcome.evidence]}</p>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
