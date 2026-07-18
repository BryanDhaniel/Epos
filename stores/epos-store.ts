"use client";

import { create } from "zustand";

import {
  advanceSimulation,
  applyWhatIfModifier,
  createInitialSimulationState,
  removeWhatIfModifier,
} from "@/lib/simulation/engine";
import { RED_CLIFFS_SCENARIO } from "@/lib/simulation/red-cliffs";
import type { ScenarioDefinition, SimulationState, WhatIfModifier } from "@/lib/simulation/types";

export type SimulationSpeed = 1 | 2 | 3 | 5;

interface EposStore {
  simulation: SimulationState;
  selectedAgentId: string;
  speed: SimulationSpeed;
  followSelected: boolean;
  selectAgent: (agentId: string) => void;
  setSpeed: (speed: SimulationSpeed) => void;
  toggleFollowSelected: () => void;
  togglePlayback: () => void;
  advanceOneTick: () => void;
  jumpToTick: (tick: number) => void;
  loadScenario: (scenario: ScenarioDefinition, defaultAgentId: string) => void;
  applyModifier: (modifier: WhatIfModifier) => void;
  removeModifier: (modifierId: string) => void;
  restart: () => void;
}

const freshSimulation = () => createInitialSimulationState(RED_CLIFFS_SCENARIO);

export const useEposStore = create<EposStore>((set) => ({
  simulation: freshSimulation(),
  selectedAgentId: "zhou-yu",
  speed: 1,
  followSelected: false,
  selectAgent: (selectedAgentId) => set({ selectedAgentId }),
  setSpeed: (speed) => set({ speed }),
  toggleFollowSelected: () => set((state) => ({ followSelected: !state.followSelected })),
  togglePlayback: () =>
    set((state) => {
      if (state.simulation.status === "complete") return {};

      return {
        simulation: {
          ...state.simulation,
          status: state.simulation.status === "running" ? "paused" : "running",
        },
      };
    }),
  advanceOneTick: () =>
    set((state) => {
      const wasRunning = state.simulation.status === "running";
      const advanced = advanceSimulation({ ...state.simulation, status: "running" });

      return {
        // Stepping from a paused timeline must remain a step, rather than
        // silently turning playback back on behind the learner's back.
        simulation:
          advanced.status === "complete"
            ? advanced
            : { ...advanced, status: wasRunning ? "running" : "paused" },
      };
    }),
  jumpToTick: (tick) =>
    set((state) => {
      const wasRunning = state.simulation.status === "running";
      const advanced = advanceSimulation(
        { ...state.simulation, status: "running" },
        Math.max(1, Math.floor(tick) - state.simulation.tick),
      );

      return {
        simulation:
          advanced.status === "complete"
            ? advanced
            : { ...advanced, status: wasRunning ? "running" : "paused" },
      };
    }),
  loadScenario: (scenario, defaultAgentId) =>
    set({
      simulation: createInitialSimulationState(scenario),
      selectedAgentId: defaultAgentId,
      followSelected: false,
    }),
  applyModifier: (modifier) =>
    set((state) => ({ simulation: applyWhatIfModifier(state.simulation, modifier) })),
  removeModifier: (modifierId) =>
    set((state) => ({ simulation: removeWhatIfModifier(state.simulation, modifierId) })),
  restart: () =>
    set((state) => ({
      simulation: createInitialSimulationState(state.simulation.scenario),
      selectedAgentId: state.simulation.scenario.agents.some((agent) => agent.id === state.selectedAgentId)
        ? state.selectedAgentId
        : state.simulation.scenario.agents[0]?.id ?? "zhou-yu",
      followSelected: false,
    })),
}));
