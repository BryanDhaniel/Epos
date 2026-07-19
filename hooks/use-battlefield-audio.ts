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
] as const;

export type BattlefieldAudioCue = WorldActionCue;

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
  /** Stops both currently audible and scheduled battlefield sounds. */
  stop: () => void;
}

type AudioGraph = {
  context: AudioContext;
  master: GainNode;
  sources: Set<AudioScheduledSourceNode>;
};

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

  return { context, master, sources: new Set() };
}

function registerSource(
  graph: AudioGraph,
  source: AudioScheduledSourceNode,
  cleanupNodes: readonly AudioNode[],
  at: number,
  stopAt: number,
) {
  graph.sources.add(source);
  source.onended = () => {
    graph.sources.delete(source);

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

function scheduleNoise(graph: AudioGraph, options: NoiseOptions) {
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
  );
}

function scheduleTone(graph: AudioGraph, options: ToneOptions) {
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
    default:
      return;
  }
}

/**
 * A small, dependency-free Web Audio layer for simulation events. It has no
 * ambient loop: callers explicitly unlock it through a gesture, then opt in to
 * individual sound vignettes as historical events occur.
 */
export function useBattlefieldAudio(enabled: boolean): BattlefieldAudioController {
  const enabledRef = useRef(enabled);
  const graphRef = useRef<AudioGraph | null>(null);

  const stop = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;

    graph.sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // It is normal for a finite source to have completed before a UI stop.
      }
    });
    graph.sources.clear();
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

  return { unlock, playCue, stop };
}
