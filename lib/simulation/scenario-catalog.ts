import { RED_CLIFFS_SCENARIO, RED_CLIFFS_WHAT_IF_PRESETS } from "./red-cliffs";
import type { ScenarioDefinition, WhatIfModifier } from "./types";

export type ScenarioFocus = "logistics" | "diplomacy" | "geography" | "leadership" | "civilian impact" | "weather";

interface ScenarioCardBase {
  id: string;
  title: string;
  era: string;
  locationLabel: string;
  coordinateLabel: string;
  learningFocus: readonly ScenarioFocus[];
  scopeNote: string;
}

export interface PlayableScenarioPack extends ScenarioCardBase {
  status: "playable";
  scenario: ScenarioDefinition;
  defaultAgentId: string;
  whatIfPresets: readonly WhatIfModifier[];
}

export interface PreviewScenarioPack extends ScenarioCardBase {
  status: "preview";
  previewNote: string;
}

export type ScenarioPack = PlayableScenarioPack | PreviewScenarioPack;

/**
 * The catalog makes the platform's intended range visible without presenting
 * incomplete historical models as playable simulations. Each preview becomes
 * playable only after its agents, sources, causal model, and world art are
 * independently authored and reviewed.
 */
export const SCENARIO_CATALOG: readonly ScenarioPack[] = [
  {
    id: RED_CLIFFS_SCENARIO.id,
    title: RED_CLIFFS_SCENARIO.title,
    era: RED_CLIFFS_SCENARIO.era,
    locationLabel: "Yangtze River · Red Cliffs",
    coordinateLabel: "32.0° N · 112.6° E",
    learningFocus: ["weather", "logistics", "diplomacy", "geography"],
    scopeNote: "A playable, source-aware model of coalition coordination, river conditions, and campaign pressure.",
    status: "playable",
    scenario: RED_CLIFFS_SCENARIO,
    defaultAgentId: "zhou-yu",
    whatIfPresets: RED_CLIFFS_WHAT_IF_PRESETS,
  },
  {
    id: "waterloo-1815",
    title: "Battle of Waterloo",
    era: "18 June 1815",
    locationLabel: "Waterloo · Belgium",
    coordinateLabel: "50.68° N · 4.41° E",
    learningFocus: ["weather", "logistics", "leadership", "geography"],
    scopeNote: "A future model focused on rain, mud, timing, coalition communication, and the limits of command visibility.",
    status: "preview",
    previewNote: "Historical preview — the simulation model, source pack, and world are in development.",
  },
  {
    id: "sekigahara-1600",
    title: "Sekigahara Campaign",
    era: "1600 · Japan",
    locationLabel: "Sekigahara · Japan",
    coordinateLabel: "35.37° N · 136.47° E",
    learningFocus: ["diplomacy", "geography", "leadership", "logistics"],
    scopeNote: "A future model of alliances, movement through mountain passes, information uncertainty, and shifting commitments.",
    status: "preview",
    previewNote: "Historical preview — the simulation model, source pack, and world are in development.",
  },
  {
    id: "normandy-1944",
    title: "Normandy Landings",
    era: "6 June 1944 · France",
    locationLabel: "Normandy coast · France",
    coordinateLabel: "49.40° N · 0.62° W",
    learningFocus: ["weather", "logistics", "geography", "civilian impact"],
    scopeNote: "A future model centered on weather windows, landing logistics, information limits, and civilian consequences.",
    status: "preview",
    previewNote: "Historical preview — the simulation model, source pack, and world are in development.",
  },
  {
    id: "surabaya-1945",
    title: "Battle of Surabaya",
    era: "Late October–November 1945 · Indonesia",
    locationLabel: "Surabaya · Indonesia",
    coordinateLabel: "7.26° S · 112.75° E",
    learningFocus: ["diplomacy", "leadership", "civilian impact", "logistics"],
    scopeNote: "A future model of communication, political legitimacy, civilian safety, and rapidly changing local conditions.",
    status: "preview",
    previewNote: "Historical preview — the simulation model, source pack, and world are in development.",
  },
  {
    id: "jerusalem-1187",
    title: "Siege of Jerusalem",
    era: "1187 · Levant",
    locationLabel: "Jerusalem · Levant",
    coordinateLabel: "31.77° N · 35.21° E",
    learningFocus: ["diplomacy", "logistics", "civilian impact", "leadership"],
    scopeNote: "A future model about water, negotiation, community protection, and the choices constrained by a siege.",
    status: "preview",
    previewNote: "Historical preview — the simulation model, source pack, and world are in development.",
  },
  {
    id: "mongol-central-asia-1219",
    title: "Mongol Campaigns in Central Asia",
    era: "1219–1221",
    locationLabel: "Central Asia",
    coordinateLabel: "39.65° N · 66.96° E",
    learningFocus: ["logistics", "geography", "diplomacy", "civilian impact"],
    scopeNote: "A future model of mobility, envoys, urban networks, and the human consequences of imperial expansion.",
    status: "preview",
    previewNote: "Historical preview — the simulation model, source pack, and world are in development.",
  },
  {
    id: "roman-danube-180",
    title: "Roman Danube Frontier",
    era: "180 CE",
    locationLabel: "Danube frontier · Roman Empire",
    coordinateLabel: "48.21° N · 16.37° E",
    learningFocus: ["logistics", "leadership", "geography", "civilian impact"],
    scopeNote: "A future model of frontier supply, disease, local economies, and the limits of imperial administration.",
    status: "preview",
    previewNote: "Historical preview — the simulation model, source pack, and world are in development.",
  },
];

export const getScenarioPack = (scenarioId: string) =>
  SCENARIO_CATALOG.find((pack) => pack.id === scenarioId);

export const getPlayableScenarioPack = (scenarioId: string) => {
  const pack = getScenarioPack(scenarioId);
  return pack?.status === "playable" ? pack : undefined;
};
