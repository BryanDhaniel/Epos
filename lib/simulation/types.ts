/**
 * Shared, framework-free types for Epos simulations.
 *
 * Values in this module deliberately use simple JSON-compatible structures so
 * they can be rendered by a client component, persisted later, or passed to a
 * server-side model without adapters.
 */

export const FACTION_IDS = ["wei", "sun-liu", "neutral"] as const;

export type FactionId = (typeof FACTION_IDS)[number];
export type AgentId = string;
export type LocationId = string;
export type InfrastructureId = string;

export type AgentRole =
  | "ruler"
  | "strategist"
  | "commander"
  | "diplomat"
  | "officer"
  | "messenger"
  | "scout"
  | "merchant"
  | "farmer"
  | "soldier"
  | "medic"
  | "civilian";

export type Emotion =
  | "calm"
  | "hopeful"
  | "resolute"
  | "wary"
  | "anxious"
  | "fatigued"
  | "confident"
  | "frustrated";

export type WeatherCondition = "clear" | "overcast" | "rain" | "fog" | "storm";
export type WindDirection =
  | "calm"
  | "north"
  | "northeast"
  | "east"
  | "southeast"
  | "south"
  | "southwest"
  | "west"
  | "northwest"
  | "variable";

export type InfrastructureStatus = "intact" | "strained" | "damaged" | "collapsed";
export type WorldSceneTheme = "red-cliffs" | "waterloo" | "surabaya" | "jerusalem";
export type EventKind =
  | "diplomacy"
  | "logistics"
  | "weather"
  | "strategy"
  | "battle"
  | "retreat"
  | "social";

/** A scene-level action that renderers and sound can play without interpreting prose. */
export type WorldActionCue =
  | "fire-attack"
  | "rain-field"
  | "artillery-barrage"
  | "farm-assault"
  | "cavalry-charge"
  | "reinforcement-arrival"
  | "final-assault"
  | "withdrawal"
  | "radio-broadcast"
  | "ceasefire"
  | "aid-corridor"
  | "urban-assault"
  | "siege-arrival"
  | "water-scarcity"
  | "siege-engine-build"
  | "siege-assault"
  | "siege-parley"
  | "siege-aftermath";
export type EvidenceKind = "historical-fact" | "historical-inference" | "speculation";
export type SimulationStatus = "ready" | "running" | "paused" | "complete";
export type SimulationPhase = "dawn" | "morning" | "afternoon" | "dusk" | "night";

export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

export interface ScenarioLocation {
  id: LocationId;
  name: string;
  kind:
    | "camp"
    | "harbor"
    | "river"
    | "village"
    | "fortress"
    | "road"
    | "forest"
    | "farm"
    | "ridge"
    | "field";
  position: WorldPosition;
  description: string;
}

export interface PersonalityProfile {
  traits: readonly string[];
  leadership: number;
  caution: number;
  adaptability: number;
}

export interface EmotionalState {
  primary: Emotion;
  intensity: number;
}

export interface AgentKnowledge {
  id: string;
  statement: string;
  confidence: number;
  learnedAtTick: number;
  sourceAgentId?: AgentId;
  evidence: EvidenceKind;
}

export interface AgentMemory {
  id: string;
  summary: string;
  tick: number;
  importance: number;
  kind: "conversation" | "observation" | "promise" | "battle" | "shortage" | "discovery";
}

/**
 * A short, source-aware line shown in the world when agents exchange information.
 * It is intentionally separate from an agent's knowledge: a message is an utterance,
 * not proof that every recipient accepts it as fact.
 */
export interface AgentMessage {
  id: string;
  speakerId: AgentId;
  recipientId?: AgentId;
  text: string;
  channel?: "spoken" | "dispatch" | "signal";
  evidence: EvidenceKind;
}

/** Plain-language causal explanation paired with a resolved timeline event. */
export interface EventNarration {
  /** Optional documentary-style scene narration for captions or voice-over. */
  story?: string;
  why: string;
  whyEvidence: EvidenceKind;
}

export interface ScenarioAgent {
  id: AgentId;
  name: string;
  title?: string;
  role: AgentRole;
  /** A modeled formation can travel as one unit while still retaining state and knowledge. */
  renderKind?: "person" | "unit";
  factionId: FactionId;
  biography: string;
  personality: PersonalityProfile;
  currentLocationId: LocationId;
  initialObjective: string;
  emotionalState: EmotionalState;
  inventory: readonly string[];
  trust: Readonly<Record<AgentId, number>>;
  initialKnowledge: readonly AgentKnowledge[];
  initialMemory: readonly AgentMemory[];
}

export interface AgentRuntimeState extends ScenarioAgent {
  currentObjective: string;
  emotionalState: EmotionalState;
  currentLocationId: LocationId;
  knowledge: readonly AgentKnowledge[];
  memory: readonly AgentMemory[];
  status: "active" | "traveling" | "occupied" | "retreating";
  /** Allows a timeline to respectfully remove a person from the rendered world. */
  renderVisible: boolean;
}

export interface FactionResources {
  food: number;
  supplies: number;
  morale: number;
  readiness: number;
  fleet: number;
}

export type ResourceKey = keyof FactionResources;

export interface FactionState {
  id: FactionId;
  name: string;
  color: string;
  strategicGoal: string;
  resources: FactionResources;
}

export interface WeatherState {
  condition: WeatherCondition;
  windDirection: WindDirection;
  /** 0 is calm and 100 is a very strong wind. */
  windStrength: number;
  precipitation: number;
  visibility: number;
}

export interface InfrastructureState {
  id: InfrastructureId;
  name: string;
  status: InfrastructureStatus;
  capacity: number;
  locationId: LocationId;
}

export interface WorldPressures {
  diseaseRisk: number;
  supplyStrain: number;
  riverMobility: number;
  diplomaticCohesion: number;
  fireAttackEffectiveness: number;
}

export interface WorldState {
  day: number;
  phase: SimulationPhase;
  weather: WeatherState;
  factions: Record<FactionId, FactionState>;
  infrastructure: Record<InfrastructureId, InfrastructureState>;
  pressures: WorldPressures;
}

export interface TimelineEffectBase {
  type: string;
}

export type TimelineEffect =
  | (TimelineEffectBase & {
      type: "adjust-resource";
      factionId: FactionId;
      resource: ResourceKey;
      amount: number;
    })
  | (TimelineEffectBase & {
      type: "set-weather";
      weather: Partial<WeatherState>;
    })
  | (TimelineEffectBase & {
      type: "set-infrastructure";
      infrastructureId: InfrastructureId;
      status: InfrastructureStatus;
      capacity?: number;
    })
  | (TimelineEffectBase & {
      type: "adjust-pressure";
      pressure: keyof WorldPressures;
      amount: number;
    })
  | (TimelineEffectBase & {
      type: "move-agent";
      agentId: AgentId;
      locationId: LocationId;
      status?: AgentRuntimeState["status"];
    })
  | (TimelineEffectBase & {
      type: "set-agent-objective";
      agentId: AgentId;
      objective: string;
    })
  | (TimelineEffectBase & {
      type: "set-agent-emotion";
      agentId: AgentId;
      emotion: EmotionalState;
    })
  | (TimelineEffectBase & {
      type: "set-agent-visibility";
      agentId: AgentId;
      visible: boolean;
    })
  | (TimelineEffectBase & {
      type: "share-knowledge";
      agentId: AgentId;
      knowledge: AgentKnowledge;
      memory?: AgentMemory;
    })
  | (TimelineEffectBase & {
      type: "resolve-fire-attack";
      attackerFactionId: FactionId;
      defenderFactionId: FactionId;
      baseImpact: number;
      windThreshold: number;
    });

export type TimelineEventCondition =
  | {
      type: "pressure-at-least";
      pressure: keyof WorldPressures;
      value: number;
    }
  | {
      type: "resource-at-most";
      factionId: FactionId;
      resource: ResourceKey;
      value: number;
    };

export interface TimelineEvent {
  id: string;
  tick: number;
  title: string;
  description: string;
  kind: EventKind;
  evidence: EvidenceKind;
  locationId: LocationId;
  participantIds: readonly AgentId[];
  messages?: readonly AgentMessage[];
  narration?: EventNarration;
  /** Optional explicit cue for a time-bound world animation. */
  worldAction?: WorldActionCue;
  effects: readonly TimelineEffect[];
  condition?: TimelineEventCondition;
}

/**
 * Human-facing scenario language. Simulation primitives remain reusable while
 * each historical world can name the pressures students are actually seeing.
 */
export interface ScenarioPresentation {
  scene: WorldSceneTheme;
  metricLabels?: {
    morale: string;
    supplies: string;
    mobility: string;
    cohesion: string;
  };
  causalThread?: {
    title: string;
    description: string;
  };
  mission?: {
    title: string;
    description: string;
    steps: readonly string[];
  };
  whatIfPromptHint?: string;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  subtitle: string;
  era: string;
  historicalNote: string;
  presentation?: ScenarioPresentation;
  maxTicks: number;
  locations: readonly ScenarioLocation[];
  agents: readonly ScenarioAgent[];
  initialWorld: WorldState;
  timeline: readonly TimelineEvent[];
}

export interface WhatIfModifierBase {
  id: string;
  label: string;
  description: string;
  source: "user" | "teacher" | "scenario";
  /** Defaults to tick 0 when omitted. */
  startsAtTick?: number;
  endsAtTick?: number;
}

export type WhatIfModifier =
  | (WhatIfModifierBase & {
      type: "weather";
      weather: Partial<WeatherState>;
    })
  | (WhatIfModifierBase & {
      type: "resource";
      factionId: FactionId;
      resource: ResourceKey;
      amount: number;
    })
  | (WhatIfModifierBase & {
      type: "infrastructure";
      infrastructureId: InfrastructureId;
      status: InfrastructureStatus;
      capacity?: number;
    })
  | (WhatIfModifierBase & {
      type: "reinforcement";
      factionId: FactionId;
      readiness: number;
      supplies: number;
      morale?: number;
      arrivalTick: number;
    })
  | (WhatIfModifierBase & {
      type: "event";
      eventId: string;
      mode: "enable" | "disable";
    })
  | (WhatIfModifierBase & {
      type: "agent";
      agentId: AgentId;
      objective?: string;
      emotionalState?: EmotionalState;
    });

export interface SimulationLogEntry {
  id: string;
  tick: number;
  title: string;
  description: string;
  kind: "event" | "modifier" | "outcome" | "system";
  evidence: EvidenceKind;
  eventId?: string;
  modifierId?: string;
  locationId?: LocationId;
  worldAction?: WorldActionCue;
  participantIds: readonly AgentId[];
  messages?: readonly AgentMessage[];
  narration?: EventNarration;
}

export interface SimulationState {
  scenario: ScenarioDefinition;
  tick: number;
  status: SimulationStatus;
  world: WorldState;
  agents: readonly AgentRuntimeState[];
  modifiers: readonly WhatIfModifier[];
  resolvedEventIds: readonly string[];
  timelineLog: readonly SimulationLogEntry[];
}

export interface SimulationProgress {
  tick: number;
  maxTicks: number;
  percentage: number;
  phase: SimulationPhase;
  status: SimulationStatus;
}

export interface SimulationOutcome {
  leadingFactionId: FactionId;
  confidence: number;
  summary: string;
  evidence: EvidenceKind;
  causalFactors: readonly string[];
}
