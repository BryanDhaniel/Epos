import type {
  AgentRuntimeState,
  EventNarration,
  FactionId,
  FactionResources,
  InfrastructureState,
  ResourceKey,
  ScenarioAgent,
  SimulationLogEntry,
  SimulationOutcome,
  SimulationPhase,
  SimulationProgress,
  SimulationState,
  SimulationStatus,
  TimelineEffect,
  TimelineEvent,
  WhatIfModifier,
  WeatherState,
  WorldState,
} from "./types";

const PHASES: readonly SimulationPhase[] = ["dawn", "morning", "afternoon", "dusk", "night"];

const clamp = (value: number, minimum = 0, maximum = 100) =>
  Math.min(maximum, Math.max(minimum, Math.round(value)));

const modifierStartTick = (modifier: WhatIfModifier) => {
  if (modifier.type === "reinforcement") {
    return modifier.arrivalTick;
  }

  return modifier.startsAtTick ?? 0;
};

export const isModifierActiveAt = (modifier: WhatIfModifier, tick: number) => {
  const startsAtTick = modifierStartTick(modifier);
  const endsAtTick = modifier.endsAtTick;

  return tick >= startsAtTick && (endsAtTick === undefined || tick <= endsAtTick);
};

const normalizeWeather = (weather: WeatherState): WeatherState => ({
  ...weather,
  windStrength: clamp(weather.windStrength),
  precipitation: clamp(weather.precipitation),
  visibility: clamp(weather.visibility),
});

const cloneWorld = (world: WorldState): WorldState => ({
  ...world,
  weather: normalizeWeather({ ...world.weather }),
  factions: Object.fromEntries(
    Object.entries(world.factions).map(([id, faction]) => [
      id,
      { ...faction, resources: { ...faction.resources } },
    ]),
  ) as WorldState["factions"],
  infrastructure: Object.fromEntries(
    Object.entries(world.infrastructure).map(([id, infrastructure]) => [
      id,
      { ...infrastructure },
    ]),
  ) as Record<string, InfrastructureState>,
  pressures: { ...world.pressures },
});

const runtimeAgentFromScenario = (agent: ScenarioAgent): AgentRuntimeState => ({
  ...agent,
  personality: { ...agent.personality, traits: [...agent.personality.traits] },
  currentLocationId: agent.currentLocationId,
  currentObjective: agent.initialObjective,
  emotionalState: { ...agent.emotionalState },
  inventory: [...agent.inventory],
  trust: { ...agent.trust },
  initialKnowledge: agent.initialKnowledge.map((knowledge) => ({ ...knowledge })),
  initialMemory: agent.initialMemory.map((memory) => ({ ...memory })),
  knowledge: agent.initialKnowledge.map((knowledge) => ({ ...knowledge })),
  memory: agent.initialMemory.map((memory) => ({ ...memory })),
  status: "active",
});

const cloneRuntimeAgent = (agent: AgentRuntimeState): AgentRuntimeState => ({
  ...agent,
  personality: { ...agent.personality, traits: [...agent.personality.traits] },
  emotionalState: { ...agent.emotionalState },
  inventory: [...agent.inventory],
  trust: { ...agent.trust },
  initialKnowledge: agent.initialKnowledge.map((knowledge) => ({ ...knowledge })),
  initialMemory: agent.initialMemory.map((memory) => ({ ...memory })),
  knowledge: agent.knowledge.map((knowledge) => ({ ...knowledge })),
  memory: agent.memory.map((memory) => ({ ...memory })),
});

const deduplicateModifiers = (modifiers: readonly WhatIfModifier[]) => {
  const modifiersById = new Map<string, WhatIfModifier>();

  for (const modifier of modifiers) {
    modifiersById.set(modifier.id, modifier);
  }

  return [...modifiersById.values()];
};

const withLog = (state: SimulationState, entry: SimulationLogEntry): SimulationState => ({
  ...state,
  timelineLog: [...state.timelineLog, entry],
});

/**
 * Timeline entries are historical snapshots. Copy narration rather than retain
 * a scenario-data reference so a log keeps the exact voice-over text resolved
 * for that run, including any counterfactual wording.
 */
const snapshotNarration = (
  narration: EventNarration | undefined,
): EventNarration | undefined =>
  narration === undefined
    ? undefined
    : {
        story: narration.story,
        why: narration.why,
        whyEvidence: narration.whyEvidence,
      };

const withUpdatedAgent = (
  state: SimulationState,
  agentId: string,
  update: (agent: AgentRuntimeState) => AgentRuntimeState,
): SimulationState => {
  let didUpdate = false;
  const agents = state.agents.map((agent) => {
    if (agent.id !== agentId) {
      return agent;
    }

    didUpdate = true;
    return update(cloneRuntimeAgent(agent));
  });

  return didUpdate ? { ...state, agents } : state;
};

const withAdjustedResource = (
  state: SimulationState,
  factionId: FactionId,
  resource: ResourceKey,
  amount: number,
): SimulationState => {
  const faction = state.world.factions[factionId];
  const resources: FactionResources = {
    ...faction.resources,
    [resource]: clamp(faction.resources[resource] + amount),
  };

  return {
    ...state,
    world: {
      ...state.world,
      factions: {
        ...state.world.factions,
        [factionId]: { ...faction, resources },
      },
    },
  };
};

const withAdjustedPressure = (
  state: SimulationState,
  pressure: keyof WorldState["pressures"],
  amount: number,
): SimulationState => ({
  ...state,
  world: {
    ...state.world,
    pressures: {
      ...state.world.pressures,
      [pressure]: clamp(state.world.pressures[pressure] + amount),
    },
  },
});

const isEventConditionSatisfied = (state: SimulationState, event: TimelineEvent) => {
  if (!event.condition) {
    return true;
  }

  if (event.condition.type === "pressure-at-least") {
    return state.world.pressures[event.condition.pressure] >= event.condition.value;
  }

  return (
    state.world.factions[event.condition.factionId].resources[event.condition.resource] <=
    event.condition.value
  );
};

export const isTimelineEventEnabled = (state: SimulationState, event: TimelineEvent) => {
  let enabled = true;

  for (const modifier of state.modifiers) {
    if (
      modifier.type === "event" &&
      modifier.eventId === event.id &&
      isModifierActiveAt(modifier, state.tick)
    ) {
      enabled = modifier.mode === "enable";
    }
  }

  return enabled;
};

const modifierChangesWeather = (state: SimulationState) =>
  state.modifiers.some(
    (modifier) =>
      modifier.type === "weather" &&
      isModifierActiveAt(modifier, state.tick) &&
      (modifier.weather.condition !== undefined ||
        modifier.weather.windDirection !== undefined ||
        modifier.weather.windStrength !== undefined ||
        modifier.weather.precipitation !== undefined ||
        modifier.weather.visibility !== undefined),
  );

const applyPersistentModifiers = (state: SimulationState): SimulationState => {
  let world = state.world;
  let agents = state.agents;

  for (const modifier of state.modifiers) {
    if (!isModifierActiveAt(modifier, state.tick)) {
      continue;
    }

    if (modifier.type === "weather") {
      world = {
        ...world,
        weather: normalizeWeather({ ...world.weather, ...modifier.weather }),
      };
      continue;
    }

    if (modifier.type === "infrastructure") {
      const infrastructure = world.infrastructure[modifier.infrastructureId];
      if (!infrastructure) {
        continue;
      }

      world = {
        ...world,
        infrastructure: {
          ...world.infrastructure,
          [modifier.infrastructureId]: {
            ...infrastructure,
            status: modifier.status,
            capacity:
              modifier.capacity === undefined ? infrastructure.capacity : clamp(modifier.capacity),
          },
        },
      };
      continue;
    }

    if (modifier.type === "agent") {
      agents = agents.map((agent) => {
        if (agent.id !== modifier.agentId) {
          return agent;
        }

        return {
          ...cloneRuntimeAgent(agent),
          currentObjective: modifier.objective ?? agent.currentObjective,
          emotionalState: modifier.emotionalState
            ? { ...modifier.emotionalState, intensity: clamp(modifier.emotionalState.intensity) }
            : agent.emotionalState,
        };
      });
    }
  }

  return world === state.world && agents === state.agents ? state : { ...state, world, agents };
};

const applyScheduledModifiers = (state: SimulationState): SimulationState => {
  let next = state;

  for (const modifier of state.modifiers) {
    if (modifierStartTick(modifier) !== state.tick) {
      continue;
    }

    if (modifier.type === "resource") {
      next = withAdjustedResource(next, modifier.factionId, modifier.resource, modifier.amount);
    }

    if (modifier.type === "reinforcement") {
      next = withAdjustedResource(next, modifier.factionId, "readiness", modifier.readiness);
      next = withAdjustedResource(next, modifier.factionId, "supplies", modifier.supplies);
      if (modifier.morale !== undefined) {
        next = withAdjustedResource(next, modifier.factionId, "morale", modifier.morale);
      }
    }

    next = withLog(next, {
      id: `modifier-${modifier.id}-${state.tick}`,
      tick: state.tick,
      title: modifier.label,
      description: modifier.description,
      kind: "modifier",
      evidence: "speculation",
      modifierId: modifier.id,
      participantIds: [],
    });
  }

  return next;
};

const resolveFireAttack = (
  state: SimulationState,
  effect: Extract<TimelineEffect, { type: "resolve-fire-attack" }>,
): SimulationState => {
  const weather = state.world.weather;
  const hasFavorableWind =
    weather.windStrength >= effect.windThreshold && weather.windDirection === "southeast";
  const windQuality = hasFavorableWind ? weather.windStrength / 100 : weather.windStrength / 500;
  const preparationBonus = state.world.pressures.fireAttackEffectiveness * 0.2;
  const impact = clamp(effect.baseImpact * (0.15 + 0.85 * windQuality) + preparationBonus);
  const isCounterfactual = state.modifiers.length > 0;

  let next = withAdjustedResource(state, effect.defenderFactionId, "fleet", -impact * 0.7);
  next = withAdjustedResource(next, effect.defenderFactionId, "readiness", -impact * 0.75);
  next = withAdjustedResource(next, effect.defenderFactionId, "morale", -impact * 0.7);
  next = withAdjustedResource(next, effect.attackerFactionId, "morale", impact * 0.24);
  next = {
    ...next,
    world: {
      ...next.world,
      pressures: {
        ...next.world.pressures,
        fireAttackEffectiveness: impact,
        riverMobility: clamp(next.world.pressures.riverMobility - impact * 0.18),
      },
    },
  };

  const description = hasFavorableWind
    ? `The southeast wind gives prepared fire ships a modeled impact of ${impact}/100 against the linked northern fleet.`
    : `Without a sufficiently favorable wind, the prepared fire ships have a limited modeled impact of ${impact}/100.`;
  const evidence = isCounterfactual ? "speculation" : "historical-inference";

  return withLog(next, {
    id: `fire-attack-outcome-${state.tick}`,
    tick: state.tick,
    title: hasFavorableWind ? "Fire attack gains momentum" : "Fire attack loses its wind advantage",
    description,
    kind: "outcome",
    evidence,
    eventId: "fire-attack",
    locationId: "chibi-river",
    worldAction: "fire-attack",
    participantIds: [],
    messages: [
      hasFavorableWind
        ? {
            id: `fire-attack-advance-${state.tick}`,
            speakerId: "zhou-yu",
            recipientId: "huang-gai",
            channel: "signal",
            text: "The wind favors the channel. Keep the timing controlled and preserve a withdrawal route.",
            evidence,
          }
        : {
            id: `fire-attack-caution-${state.tick}`,
            speakerId: "huang-gai",
            recipientId: "zhou-yu",
            channel: "signal",
            text: "The wind is not carrying the plan as intended. We should not mistake preparation for certainty.",
            evidence,
          },
    ],
    narration: snapshotNarration({
      story: hasFavorableWind
        ? isCounterfactual
          ? "In this counterfactual run, a southeast wind still carries the prepared fire ships toward the linked fleet, but the altered conditions make the result speculative rather than established history."
          : "At Red Cliffs, the southeast wind catches the prepared fire ships and carries them toward the crowded northern anchorage. This reconstructed outcome is a modeled historical inference, not a frame-by-frame record."
        : "Counterfactual run: the southeast wind never arrives. The decoy ships enter a river that will not carry fire toward the northern fleet, leaving the attack far less decisive in this speculative version.",
      why: hasFavorableWind
        ? "Wind direction, preparation, and a constrained fleet formation combine to make a fire-ship approach more consequential in this model."
        : "Preparation alone cannot guarantee a result: the counterfactual wind removes the condition that made the fire-ship approach more effective.",
      whyEvidence: evidence,
    }),
  });
};

const applyTimelineEffect = (state: SimulationState, effect: TimelineEffect): SimulationState => {
  switch (effect.type) {
    case "adjust-resource":
      return withAdjustedResource(state, effect.factionId, effect.resource, effect.amount);
    case "set-weather":
      return {
        ...state,
        world: {
          ...state.world,
          weather: normalizeWeather({ ...state.world.weather, ...effect.weather }),
        },
      };
    case "set-infrastructure": {
      const infrastructure = state.world.infrastructure[effect.infrastructureId];
      if (!infrastructure) {
        return state;
      }

      return {
        ...state,
        world: {
          ...state.world,
          infrastructure: {
            ...state.world.infrastructure,
            [effect.infrastructureId]: {
              ...infrastructure,
              status: effect.status,
              capacity: effect.capacity === undefined ? infrastructure.capacity : clamp(effect.capacity),
            },
          },
        },
      };
    }
    case "adjust-pressure":
      return withAdjustedPressure(state, effect.pressure, effect.amount);
    case "move-agent":
      return withUpdatedAgent(state, effect.agentId, (agent) => ({
        ...agent,
        currentLocationId: effect.locationId,
        status: effect.status ?? agent.status,
      }));
    case "set-agent-objective":
      return withUpdatedAgent(state, effect.agentId, (agent) => ({
        ...agent,
        currentObjective: effect.objective,
      }));
    case "set-agent-emotion":
      return withUpdatedAgent(state, effect.agentId, (agent) => ({
        ...agent,
        emotionalState: { ...effect.emotion, intensity: clamp(effect.emotion.intensity) },
      }));
    case "share-knowledge":
      return withUpdatedAgent(state, effect.agentId, (agent) => ({
        ...agent,
        knowledge: agent.knowledge.some((knowledge) => knowledge.id === effect.knowledge.id)
          ? agent.knowledge
          : [...agent.knowledge, { ...effect.knowledge }],
        memory:
          effect.memory === undefined || agent.memory.some((memory) => memory.id === effect.memory?.id)
            ? agent.memory
            : [...agent.memory, { ...effect.memory }],
      }));
    case "resolve-fire-attack":
      return resolveFireAttack(state, effect);
  }
};

const applyTimelineEvent = (state: SimulationState, event: TimelineEvent): SimulationState => {
  let next = state;

  for (const effect of event.effects) {
    next = applyTimelineEffect(next, effect);
  }

  const hasDynamicOutcome = event.effects.some((effect) => effect.type === "resolve-fire-attack");

  if (!hasDynamicOutcome) {
    const weatherWasOverridden = event.kind === "weather" && modifierChangesWeather(next);
    const narration = weatherWasOverridden
      ? snapshotNarration({
          story:
            "Counterfactual run: the expected weather conditions do not take hold. From this moment, the choices and consequences shown here are speculative alternatives rather than the historical baseline.",
          why: "An active counterfactual changes a condition in the baseline timeline, so downstream choices must be interpreted as speculative.",
          whyEvidence: "speculation",
        })
      : snapshotNarration(event.narration);
    next = withLog(next, {
      id: `event-${event.id}-${state.tick}`,
      tick: state.tick,
      title: event.title,
      description: weatherWasOverridden
        ? `Historical reference: ${event.description} This run applies an active weather counterfactual instead.`
        : event.description,
      kind: "event",
      evidence: weatherWasOverridden ? "speculation" : event.evidence,
      eventId: event.id,
      locationId: event.locationId,
      worldAction: event.worldAction,
      participantIds: [...event.participantIds],
      messages: weatherWasOverridden ? undefined : event.messages?.map((message) => ({ ...message })),
      narration,
    });
  }

  return {
    ...next,
    resolvedEventIds: [...next.resolvedEventIds, event.id],
  };
};

const applyAmbientEffects = (state: SimulationState): SimulationState => {
  const weatherPenalty = state.world.weather.condition === "rain" || state.world.weather.condition === "storm" ? 2 : 0;
  const illnessPenalty = state.world.pressures.diseaseRisk >= 65 ? 2 : 0;
  let next = state;

  // Red Cliffs models a sustained river campaign where disease, provisions,
  // and a fleet's daily condition are central. Other scenarios author their
  // own event effects and retain only the reusable weather friction below.
  if (state.scenario.id !== "red-cliffs-208") {
    if (weatherPenalty > 0) {
      next = withAdjustedPressure(next, "supplyStrain", weatherPenalty);
      next = withAdjustedPressure(next, "riverMobility", -weatherPenalty);
    }

    return next;
  }

  if (state.tick > 0) {
    next = withAdjustedResource(next, "wei", "food", -(1 + weatherPenalty));
  }

  if (illnessPenalty > 0) {
    next = withAdjustedResource(next, "wei", "readiness", -illnessPenalty);
  }

  if (weatherPenalty > 0) {
    next = withAdjustedPressure(next, "supplyStrain", weatherPenalty);
    next = withAdjustedPressure(next, "riverMobility", -weatherPenalty);
  }

  return next;
};

const phaseForTick = (tick: number): SimulationPhase => PHASES[tick % PHASES.length] ?? "dawn";

const advanceOneTick = (state: SimulationState): SimulationState => {
  if (state.status === "paused" || state.status === "complete" || state.tick >= state.scenario.maxTicks) {
    return state.status === "complete"
      ? state
      : { ...state, status: "complete" };
  }

  const tick = state.tick + 1;
  let next: SimulationState = {
    ...state,
    tick,
    status: "running",
    world: {
      ...cloneWorld(state.world),
      day: Math.floor(tick / PHASES.length),
      phase: phaseForTick(tick),
    },
    agents: state.agents.map(cloneRuntimeAgent),
  };

  next = applyScheduledModifiers(next);
  next = applyPersistentModifiers(next);

  const eventsForTick = next.scenario.timeline.filter(
    (event) =>
      event.tick === tick &&
      !next.resolvedEventIds.includes(event.id) &&
      isTimelineEventEnabled(next, event) &&
      isEventConditionSatisfied(next, event),
  );

  for (const event of eventsForTick) {
    next = applyTimelineEvent(next, event);
  }

  // Re-apply persistent conditions after timeline effects so a counterfactual
  // weather or infrastructure state remains authoritative for this run.
  next = applyPersistentModifiers(next);
  next = applyAmbientEffects(next);

  if (tick < next.scenario.maxTicks) {
    return next;
  }

  return withLog(
    { ...next, status: "complete" },
    {
      id: `simulation-complete-${tick}`,
      tick,
      title: "Simulation checkpoint complete",
      description: "The scenario has reached its final teaching checkpoint. Compare this run with its historical anchors before drawing conclusions.",
      kind: "system",
      evidence: next.modifiers.length > 0 ? "speculation" : "historical-inference",
      participantIds: [],
    },
  );
};

export const createInitialSimulationState = (
  scenario: SimulationState["scenario"],
  modifiers: readonly WhatIfModifier[] = [],
): SimulationState => {
  let state: SimulationState = {
    scenario,
    tick: 0,
    status: "ready",
    world: cloneWorld(scenario.initialWorld),
    agents: scenario.agents.map(runtimeAgentFromScenario),
    modifiers: deduplicateModifiers(modifiers),
    resolvedEventIds: [],
    timelineLog: [],
  };

  state = applyScheduledModifiers(state);
  return applyPersistentModifiers(state);
};

export const advanceSimulation = (state: SimulationState, steps = 1): SimulationState => {
  if (state.status === "paused" || state.status === "complete" || steps <= 0) {
    return state;
  }

  let next: SimulationState = state.status === "ready" ? { ...state, status: "running" } : state;
  const safeSteps = Math.max(0, Math.floor(steps));

  for (let step = 0; step < safeSteps; step += 1) {
    next = advanceOneTick(next);
    if (next.status === "complete") {
      break;
    }
  }

  return next;
};

export const stepSimulation = (state: SimulationState): SimulationState => advanceSimulation(state, 1);

export const runSimulationToEnd = (state: SimulationState): SimulationState =>
  advanceSimulation(state, state.scenario.maxTicks - state.tick);

export const setSimulationStatus = (
  state: SimulationState,
  status: Extract<SimulationStatus, "running" | "paused">,
): SimulationState => (state.status === "complete" ? state : { ...state, status });

const replayToTick = (
  scenario: SimulationState["scenario"],
  modifiers: readonly WhatIfModifier[],
  targetTick: number,
  status: SimulationStatus,
): SimulationState => {
  let replayed = createInitialSimulationState(scenario, modifiers);

  replayed = advanceSimulation(replayed, Math.max(0, targetTick));

  if (replayed.status !== "complete") {
    replayed = { ...replayed, status };
  }

  return replayed;
};

/**
 * Changes are replayed from tick zero, so a what-if applies consistently to
 * downstream evidence and never mutates the previous state in place.
 */
export const applyWhatIfModifier = (
  state: SimulationState,
  modifier: WhatIfModifier,
): SimulationState =>
  replayToTick(
    state.scenario,
    deduplicateModifiers([...state.modifiers, modifier]),
    state.tick,
    state.status,
  );

export const removeWhatIfModifier = (state: SimulationState, modifierId: string): SimulationState =>
  replayToTick(
    state.scenario,
    state.modifiers.filter((modifier) => modifier.id !== modifierId),
    state.tick,
    state.status,
  );

export const getAgentById = (state: SimulationState, agentId: string) =>
  state.agents.find((agent) => agent.id === agentId);

export const getActiveEvents = (state: SimulationState) =>
  state.scenario.timeline.filter(
    (event) => event.tick === state.tick && state.resolvedEventIds.includes(event.id),
  );

export const getUpcomingEvents = (state: SimulationState) =>
  state.scenario.timeline.filter(
    (event) =>
      event.tick > state.tick &&
      isTimelineEventEnabled(state, event) &&
      isEventConditionSatisfied(state, event),
  );

export const getScenarioProgress = (state: SimulationState): SimulationProgress => ({
  tick: state.tick,
  maxTicks: state.scenario.maxTicks,
  percentage: clamp((state.tick / state.scenario.maxTicks) * 100),
  phase: state.world.phase,
  status: state.status,
});

export const getFactionScore = (state: SimulationState, factionId: FactionId) => {
  const resources = state.world.factions[factionId].resources;
  const pressureAdjustment =
    state.world.pressures.diplomaticCohesion * 0.1 +
    state.world.pressures.riverMobility * 0.05 -
    state.world.pressures.diseaseRisk * 0.08 -
    state.world.pressures.supplyStrain * 0.1;

  return Math.round(
    resources.morale * 0.28 +
      resources.readiness * 0.27 +
      resources.supplies * 0.18 +
      resources.food * 0.12 +
      resources.fleet * 0.15 +
      pressureAdjustment,
  );
};

export const getSimulationOutcome = (state: SimulationState): SimulationOutcome => {
  const contenders: readonly FactionId[] = ["wei", "sun-liu"];
  const leadingFactionId = contenders.reduce((leader, factionId) =>
    getFactionScore(state, factionId) > getFactionScore(state, leader) ? factionId : leader,
  );
  const opposingFactionId: FactionId = leadingFactionId === "wei" ? "sun-liu" : "wei";
  const scoreGap = Math.abs(getFactionScore(state, leadingFactionId) - getFactionScore(state, opposingFactionId));
  const isCounterfactual = state.modifiers.length > 0;
  const leadingName = state.world.factions[leadingFactionId].name;
  const firstFaction = state.world.factions.wei;
  const secondFaction = state.world.factions["sun-liu"];
  const metricLabels = state.scenario.presentation?.metricLabels;
  const mobilityLabel = metricLabels?.mobility ?? "Operational mobility";
  const cohesionLabel = metricLabels?.cohesion ?? "Coordination";
  const causalFactors = [
    `Weather is ${state.world.weather.condition}, with ${state.world.weather.windStrength}/100 wind from the ${state.world.weather.windDirection}.`,
    `${firstFaction.name} readiness is ${firstFaction.resources.readiness}/100; ${secondFaction.name} readiness is ${secondFaction.resources.readiness}/100.`,
    `${cohesionLabel} is ${state.world.pressures.diplomaticCohesion}/100 and ${mobilityLabel.toLowerCase()} is ${state.world.pressures.riverMobility}/100.`,
  ];

  return {
    leadingFactionId,
    confidence: clamp(42 + scoreGap * 0.65),
    summary: isCounterfactual
      ? `${leadingName} currently holds the modeled advantage in this speculative run.`
      : `${leadingName} currently holds the modeled advantage against the scenario's historical baseline.`,
    evidence: isCounterfactual ? "speculation" : "historical-inference",
    causalFactors,
  };
};
