"use client";

import { useCallback, useEffect, useRef } from "react";

import type { WorldActionCue } from "@/lib/simulation/types";

/** Short, event-driven sounds used to give each historical scene a sense of place. */
export const BATTLEFIELD_AUDIO_CUES = [
  "fire-attack",
  "rain-field",
  "artillery-barrage",
  "farm-assault",
  "cavalry-charge",
  "reinforcement-arrival",
  "final-assault",
  "withdrawal",
  "radio-broadcast",
  "ceasefire",
  "aid-corridor",
  "urban-assault",
] as const;

export type BattlefieldAudioCue = WorldActionCue;

/**
 * Finite scene beds for moments that are not represented by a battle action.
 * These intentionally name a place or condition rather than a military unit:
 * Surabaya's audio identity is built around the port, streets, radio, and care
 * networks instead of constant combat.
 */
export const BATTLEFIELD_AMBIENCE_CUES = [
  "surabaya-harbour",
  "surabaya-radio-room",
  "surabaya-street-lull",
  "surabaya-urban-pressure",
  "surabaya-aid-route",
  "surabaya-aftermath",
] as const;

export type BattlefieldAmbienceCue = (typeof BATTLEFIELD_AMBIENCE_CUES)[number];

export interface BattlefieldAudioController {
  /**
   * Creates and resumes the audio context. Call this from a direct user action
   * (for example, Play or the speaker toggle) to satisfy browser autoplay rules.
   */
  unlock: () => Promise<boolean>;
  /**
   * Plays one restrained, finite sound vignette. It intentionally does nothing
   * until `unlock` has succeeded, so simulation events never autoplay audio.
   */
  playCue: (cueId?: BattlefieldAudioCue) => boolean;
  /**
   * Plays one low-key, finite environmental bed. Calling it replaces only the
   * prior ambience, never narration or a just-triggered event effect.
   */
  playAmbience: (cueId: BattlefieldAmbienceCue) => boolean;
  /** Stops both currently audible and scheduled battlefield sounds. */
  stop: () => void;
}

type AudioGraph = {
  context: AudioContext;
  master: GainNode;
  sources: Set<AudioScheduledSourceNode>;
  ambienceSources: Set<AudioScheduledSourceNode>;
};

type AudioSourceLayer = "effect" | "ambience";

type NoiseOptions = {
  at: number;
  duration: number;
  level: number;
  lowpass: number;
  highpass?: number;
};

type ToneOptions = {
  at: number;
  duration: number;
  level: number;
  frequency: number;
  endFrequency?: number;
  type?: OscillatorType;
};

type WebkitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const DEFAULT_CUE: BattlefieldAudioCue = "artillery-barrage";

function getAudioContextConstructor() {
  if (typeof window === "undefined") return null;

  return window.AudioContext ?? (window as WebkitAudioWindow).webkitAudioContext ?? null;
}

function createAudioGraph(): AudioGraph | null {
  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) return null;

  const context = new AudioContextConstructor();
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();

  // Keep transient effects comfortably below narration and avoid a sudden
  // volume jump when several voices are scheduled in one scene.
  master.gain.value = 0.34;
  compressor.threshold.value = -28;
  compressor.knee.value = 18;
  compressor.ratio.value = 8;
  compressor.attack.value = 0.006;
  compressor.release.value = 0.28;

  master.connect(compressor);
  compressor.connect(context.destination);

  return { context, master, sources: new Set(), ambienceSources: new Set() };
}

function registerSource(
  graph: AudioGraph,
  source: AudioScheduledSourceNode,
  cleanupNodes: readonly AudioNode[],
  at: number,
  stopAt: number,
  layer: AudioSourceLayer = "effect",
) {
  graph.sources.add(source);
  if (layer === "ambience") graph.ambienceSources.add(source);
  source.onended = () => {
    graph.sources.delete(source);
    graph.ambienceSources.delete(source);

    try {
      source.disconnect();
      cleanupNodes.forEach((node) => node.disconnect());
    } catch {
      // A source can already be disconnected after `stop`; no recovery is needed.
    }
  };

  source.start(at);
  source.stop(stopAt);
}

function scheduleNoise(
  graph: AudioGraph,
  options: NoiseOptions,
  layer: AudioSourceLayer = "effect",
) {
  const { context, master } = graph;
  const frameCount = Math.max(1, Math.ceil(context.sampleRate * options.duration));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const samples = buffer.getChannelData(0);

  // Lightly correlated noise is less harsh than a naked white-noise burst,
  // especially on laptop speakers.
  let previous = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.74 + white * 0.26;
    samples[index] = previous;
  }

  const source = context.createBufferSource();
  const highpass = options.highpass ? context.createBiquadFilter() : null;
  const lowpass = context.createBiquadFilter();
  const gain = context.createGain();
  const attackEnd = Math.min(options.at + 0.025, options.at + options.duration * 0.18);
  const releaseStart = Math.max(attackEnd, options.at + options.duration * 0.54);

  source.buffer = buffer;
  if (highpass) {
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(options.highpass ?? 10, options.at);
    source.connect(highpass);
    highpass.connect(lowpass);
  } else {
    source.connect(lowpass);
  }

  lowpass.type = "lowpass";
  lowpass.frequency.setValueAtTime(options.lowpass, options.at);
  lowpass.connect(gain);
  gain.connect(master);

  gain.gain.setValueAtTime(0.0001, options.at);
  gain.gain.linearRampToValueAtTime(options.level, attackEnd);
  gain.gain.setValueAtTime(options.level * 0.74, releaseStart);
  gain.gain.exponentialRampToValueAtTime(0.0001, options.at + options.duration);

  registerSource(
    graph,
    source,
    [gain, lowpass, ...(highpass ? [highpass] : [])],
    options.at,
    options.at + options.duration + 0.04,
    layer,
  );
}

function scheduleTone(
  graph: AudioGraph,
  options: ToneOptions,
  layer: AudioSourceLayer = "effect",
) {
  const { context, master } = graph;
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const attackEnd = Math.min(options.at + 0.018, options.at + options.duration * 0.2);
  const releaseStart = Math.max(attackEnd, options.at + options.duration * 0.48);

  oscillator.type = options.type ?? "triangle";
  oscillator.frequency.setValueAtTime(options.frequency, options.at);
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, options.endFrequency),
      options.at + options.duration,
    );
  }

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(Math.max(110, options.frequency * 4.5), options.at);
  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(master);

  gain.gain.setValueAtTime(0.0001, options.at);
  gain.gain.linearRampToValueAtTime(options.level, attackEnd);
  gain.gain.setValueAtTime(options.level * 0.68, releaseStart);
  gain.gain.exponentialRampToValueAtTime(0.0001, options.at + options.duration);

  registerSource(
    graph,
    oscillator,
    [gain, filter],
    options.at,
    options.at + options.duration + 0.04,
    layer,
  );
}

function scheduleCannonBlast(graph: AudioGraph, at: number, intensity = 1) {
  scheduleTone(graph, {
    at,
    duration: 0.36,
    level: 0.12 * intensity,
    frequency: 74,
    endFrequency: 31,
    type: "sine",
  });
  scheduleNoise(graph, {
    at: at + 0.012,
    duration: 0.6,
    level: 0.115 * intensity,
    lowpass: 420,
  });
  scheduleNoise(graph, {
    at: at + 0.05,
    duration: 0.14,
    level: 0.055 * intensity,
    lowpass: 2_900,
    highpass: 620,
  });
}

function scheduleMusketVolley(graph: AudioGraph, at: number, count: number, intensity = 1) {
  for (let index = 0; index < count; index += 1) {
    const shotAt = at + index * 0.11 + (index % 2) * 0.026;
    scheduleNoise(graph, {
      at: shotAt,
      duration: 0.105,
      level: 0.038 * intensity,
      lowpass: 3_600 - (index % 3) * 260,
      highpass: 420,
    });
    scheduleTone(graph, {
      at: shotAt,
      duration: 0.075,
      level: 0.017 * intensity,
      frequency: 152 + (index % 4) * 18,
      endFrequency: 87,
    });
  }
}

function scheduleHoofbeats(graph: AudioGraph, at: number, count: number, intensity = 1) {
  for (let index = 0; index < count; index += 1) {
    const beatAt = at + index * 0.145;
    scheduleTone(graph, {
      at: beatAt,
      duration: 0.09,
      level: 0.032 * intensity,
      frequency: index % 2 === 0 ? 103 : 78,
      endFrequency: 48,
      type: "triangle",
    });
    scheduleNoise(graph, {
      at: beatAt + 0.006,
      duration: 0.075,
      level: 0.018 * intensity,
      lowpass: 280,
    });
  }
}

function scheduleRain(graph: AudioGraph, at: number) {
  // A short rain bed, not a loop: it gives the muddy field an audible identity
  // without competing with the voice-over.
  for (let index = 0; index < 18; index += 1) {
    const dropAt = at + index * 0.12 + (index % 4) * 0.014;
    scheduleNoise(graph, {
      at: dropAt,
      duration: 0.095,
      level: 0.012 + (index % 5) * 0.0014,
      lowpass: 3_200,
      highpass: 560,
    });
  }

  scheduleNoise(graph, {
    at,
    duration: 2.25,
    level: 0.017,
    lowpass: 1_600,
    highpass: 180,
  });
}

function scheduleSoftFootsteps(
  graph: AudioGraph,
  at: number,
  count: number,
  spacing: number,
  level: number,
  layer: AudioSourceLayer,
) {
  for (let index = 0; index < count; index += 1) {
    const stepAt = at + index * spacing + (index % 2) * 0.035;
    scheduleNoise(
      graph,
      {
        at: stepAt,
        duration: 0.12,
        level,
        lowpass: 520,
        highpass: 92,
      },
      layer,
    );
    scheduleTone(
      graph,
      {
        at: stepAt + 0.012,
        duration: 0.075,
        level: level * 0.36,
        frequency: index % 2 === 0 ? 118 : 92,
        endFrequency: 62,
        type: "triangle",
      },
      layer,
    );
  }
}

function scheduleHarbourAmbience(graph: AudioGraph, at: number) {
  // A broad, low water-and-dock texture. It is a single finite bed rather
  // than a loop, so it leaves room for the narration and next timeline beat.
  scheduleNoise(
    graph,
    {
      at,
      duration: 15.5,
      level: 0.036,
      lowpass: 680,
      highpass: 52,
    },
    "ambience",
  );
  scheduleNoise(
    graph,
    {
      at: at + 0.62,
      duration: 0.68,
      level: 0.016,
      lowpass: 310,
      highpass: 58,
    },
    "ambience",
  );
  scheduleNoise(
    graph,
    {
      at: at + 4.75,
      duration: 0.76,
      level: 0.015,
      lowpass: 280,
      highpass: 52,
    },
    "ambience",
  );
  scheduleTone(
    graph,
    {
      at: at + 2.1,
      duration: 0.34,
      level: 0.009,
      frequency: 138,
      endFrequency: 121,
      type: "sine",
    },
    "ambience",
  );
  scheduleSoftFootsteps(graph, at + 1.15, 6, 1.8, 0.014, "ambience");
}

function scheduleStreetAmbience(graph: AudioGraph, at: number) {
  scheduleNoise(
    graph,
    {
      at,
      duration: 15,
      level: 0.028,
      lowpass: 820,
      highpass: 105,
    },
    "ambience",
  );
  scheduleNoise(
    graph,
    {
      at: at + 2.15,
      duration: 0.36,
      level: 0.013,
      lowpass: 430,
      highpass: 96,
    },
    "ambience",
  );
  scheduleNoise(
    graph,
    {
      at: at + 5.75,
      duration: 0.28,
      level: 0.012,
      lowpass: 390,
      highpass: 100,
    },
    "ambience",
  );
  scheduleSoftFootsteps(graph, at + 0.8, 7, 1.58, 0.013, "ambience");
}

function scheduleRadioRoomAmbience(graph: AudioGraph, at: number) {
  // There is deliberately no synthesized "voice" here. Spoken content stays
  // with the actual narrator and character TTS, while this establishes a
  // modest radio-room signal bed under it.
  scheduleNoise(
    graph,
    {
      at,
      duration: 14.5,
      level: 0.023,
      lowpass: 1_520,
      highpass: 310,
    },
    "ambience",
  );
  for (let index = 0; index < 4; index += 1) {
    const signalAt = at + 0.78 + index * 1.78;
    scheduleNoise(
      graph,
      {
        at: signalAt,
        duration: 0.14,
        level: 0.01,
        lowpass: 2_050,
        highpass: 520,
      },
      "ambience",
    );
    scheduleTone(
      graph,
      {
        at: signalAt + 0.012,
        duration: 0.1,
        level: 0.007,
        frequency: 406 + (index % 2) * 28,
        endFrequency: 385 + (index % 2) * 26,
        type: "sine",
      },
      "ambience",
    );
  }
}

function scheduleUrbanPressureAmbience(graph: AudioGraph, at: number) {
  // The low, distant interruptions signal that the city is unsafe without
  // making the assault a prolonged or entertaining soundscape.
  scheduleNoise(
    graph,
    {
      at,
      duration: 14,
      level: 0.03,
      lowpass: 480,
      highpass: 52,
    },
    "ambience",
  );
  for (let index = 0; index < 3; index += 1) {
    const disturbanceAt = at + 1.45 + index * 2.12;
    scheduleTone(
      graph,
      {
        at: disturbanceAt,
        duration: 0.24,
        level: 0.011,
        frequency: 76 + index * 4,
        endFrequency: 42,
        type: "sine",
      },
      "ambience",
    );
    scheduleNoise(
      graph,
      {
        at: disturbanceAt + 0.015,
        duration: 0.28,
        level: 0.013,
        lowpass: 350,
        highpass: 68,
      },
      "ambience",
    );
  }
}

function scheduleAidRouteAmbience(graph: AudioGraph, at: number) {
  scheduleNoise(
    graph,
    {
      at,
      duration: 14.5,
      level: 0.026,
      lowpass: 700,
      highpass: 82,
    },
    "ambience",
  );
  scheduleSoftFootsteps(graph, at + 0.55, 8, 1.45, 0.014, "ambience");
  scheduleNoise(
    graph,
    {
      at: at + 3.55,
      duration: 0.52,
      level: 0.012,
      lowpass: 330,
      highpass: 68,
    },
    "ambience",
  );
}

function scheduleAftermathAmbience(graph: AudioGraph, at: number) {
  scheduleNoise(
    graph,
    {
      at,
      duration: 15,
      level: 0.022,
      lowpass: 590,
      highpass: 68,
    },
    "ambience",
  );
  scheduleSoftFootsteps(graph, at + 1.3, 5, 2.2, 0.011, "ambience");
  scheduleTone(
    graph,
    {
      at: at + 5.6,
      duration: 0.34,
      level: 0.0065,
      frequency: 206,
      endFrequency: 184,
      type: "sine",
    },
    "ambience",
  );
}

function scheduleAmbience(graph: AudioGraph, cue: BattlefieldAmbienceCue) {
  const now = graph.context.currentTime + 0.04;

  switch (cue) {
    case "surabaya-harbour":
      scheduleHarbourAmbience(graph, now);
      return;
    case "surabaya-radio-room":
      scheduleRadioRoomAmbience(graph, now);
      return;
    case "surabaya-street-lull":
      scheduleStreetAmbience(graph, now);
      return;
    case "surabaya-urban-pressure":
      scheduleUrbanPressureAmbience(graph, now);
      return;
    case "surabaya-aid-route":
      scheduleAidRouteAmbience(graph, now);
      return;
    case "surabaya-aftermath":
      scheduleAftermathAmbience(graph, now);
      return;
  }
}

function scheduleCue(graph: AudioGraph, cue: BattlefieldAudioCue) {
  const now = graph.context.currentTime + 0.025;

  switch (cue) {
    case "fire-attack":
      scheduleCannonBlast(graph, now + 0.05, 0.75);
      scheduleNoise(graph, {
        at: now + 0.1,
        duration: 1.1,
        level: 0.048,
        lowpass: 1_850,
        highpass: 170,
      });
      scheduleMusketVolley(graph, now + 0.38, 4, 0.65);
      return;
    case "rain-field":
      scheduleRain(graph, now);
      return;
    case "artillery-barrage":
      scheduleCannonBlast(graph, now, 0.88);
      scheduleCannonBlast(graph, now + 0.72, 0.72);
      scheduleCannonBlast(graph, now + 1.48, 0.64);
      return;
    case "farm-assault":
      scheduleMusketVolley(graph, now, 7, 0.88);
      scheduleCannonBlast(graph, now + 0.74, 0.58);
      return;
    case "cavalry-charge":
      scheduleHoofbeats(graph, now, 12, 0.92);
      scheduleMusketVolley(graph, now + 0.74, 3, 0.48);
      return;
    case "reinforcement-arrival":
      scheduleHoofbeats(graph, now, 8, 0.62);
      scheduleTone(graph, {
        at: now + 0.3,
        duration: 0.62,
        level: 0.026,
        frequency: 294,
        endFrequency: 392,
        type: "sine",
      });
      return;
    case "final-assault":
      scheduleCannonBlast(graph, now, 0.94);
      scheduleMusketVolley(graph, now + 0.26, 8, 0.86);
      scheduleCannonBlast(graph, now + 1.15, 0.64);
      return;
    case "withdrawal":
      scheduleHoofbeats(graph, now, 6, 0.44);
      scheduleNoise(graph, {
        at: now + 0.26,
        duration: 1.25,
        level: 0.026,
        lowpass: 900,
        highpass: 110,
      });
      return;
    case "radio-broadcast":
      scheduleNoise(graph, {
        at: now,
        duration: 1.2,
        level: 0.024,
        lowpass: 2_100,
        highpass: 460,
      });
      scheduleTone(graph, {
        at: now + 0.08,
        duration: 0.48,
        level: 0.014,
        frequency: 510,
        endFrequency: 430,
        type: "square",
      });
      return;
    case "ceasefire":
      scheduleTone(graph, {
        at: now,
        duration: 0.58,
        level: 0.018,
        frequency: 392,
        endFrequency: 294,
        type: "sine",
      });
      return;
    case "aid-corridor":
      scheduleNoise(graph, {
        at: now,
        duration: 1.1,
        level: 0.016,
        lowpass: 780,
        highpass: 90,
      });
      scheduleTone(graph, {
        at: now + 0.22,
        duration: 0.28,
        level: 0.012,
        frequency: 330,
        endFrequency: 370,
        type: "triangle",
      });
      return;
    case "urban-assault":
      // Match the finite Surabaya visual sequence: three restrained, distant
      // beats across the first few seconds, with a low street-pressure bed.
      // The cue communicates an unsafe city rather than continuous combat.
      scheduleNoise(graph, {
        at: now + 0.08,
        duration: 6.3,
        level: 0.018,
        lowpass: 620,
        highpass: 86,
      });
      scheduleSoftFootsteps(graph, now + 0.22, 9, 0.48, 0.012, "effect");
      scheduleCannonBlast(graph, now + 0.38, 0.52);
      scheduleMusketVolley(graph, now + 0.9, 3, 0.34);
      scheduleCannonBlast(graph, now + 2.7, 0.43);
      scheduleMusketVolley(graph, now + 3.16, 2, 0.27);
      scheduleCannonBlast(graph, now + 5.2, 0.36);
      return;
    default:
      return;
  }
}

/**
 * A small, dependency-free Web Audio layer for simulation events. It uses
 * finite vignettes rather than a persistent loop, and callers must explicitly
 * unlock it through a user gesture before any sound can be scheduled.
 */
export function useBattlefieldAudio(enabled: boolean): BattlefieldAudioController {
  const enabledRef = useRef(enabled);
  const graphRef = useRef<AudioGraph | null>(null);

  const stop = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;

    for (const source of [...graph.sources]) {
      try {
        source.stop();
      } catch {
        // It is normal for a finite source to have completed before a UI stop.
      }
    }
    graph.sources.clear();
    graph.ambienceSources.clear();
  }, []);

  const stopAmbience = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;

    for (const source of [...graph.ambienceSources]) {
      try {
        source.stop();
      } catch {
        // It is normal for a finite source to have completed before replacement.
      }
    }
    graph.ambienceSources.clear();
  }, []);

  const unlock = useCallback(async () => {
    if (!enabledRef.current) return false;

    let graph = graphRef.current;
    if (!graph || graph.context.state === "closed") {
      graph = createAudioGraph();
      graphRef.current = graph;
    }

    if (!graph) return false;

    try {
      if (graph.context.state !== "running") await graph.context.resume();
      return graph.context.state === "running";
    } catch {
      return false;
    }
  }, []);

  const playCue = useCallback((cueId: BattlefieldAudioCue = DEFAULT_CUE) => {
    const graph = graphRef.current;
    if (!enabledRef.current || !graph || graph.context.state !== "running") return false;

    // Events can arrive at the same simulation tick. Stopping the short prior
    // vignette keeps the result intelligible instead of escalating into noise.
    stop();
    scheduleCue(graph, cueId);
    return true;
  }, [stop]);

  const playAmbience = useCallback((cueId: BattlefieldAmbienceCue) => {
    const graph = graphRef.current;
    if (!enabledRef.current || !graph || graph.context.state !== "running") return false;

    // Replacing only the old environmental bed preserves a current event cue
    // while preventing rapid stepping or jumping from layering city textures.
    stopAmbience();
    scheduleAmbience(graph, cueId);
    return true;
  }, [stopAmbience]);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled) stop();
  }, [enabled, stop]);

  useEffect(
    () => () => {
      stop();

      const graph = graphRef.current;
      graphRef.current = null;
      if (!graph || graph.context.state === "closed") return;

      void graph.context.close().catch(() => undefined);
    },
    [stop],
  );

  return { unlock, playCue, playAmbience, stop };
}
