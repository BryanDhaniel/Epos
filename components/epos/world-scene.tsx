"use client";

import { ContactShadows, Html, OrbitControls, Sky } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";

import type {
  AgentMessage,
  AgentRuntimeState,
  ScenarioLocation,
  WeatherState,
  WorldActionCue,
  WorldSceneTheme,
  WorldState,
} from "@/lib/simulation/types";

type Vector3Tuple = [number, number, number];

export interface WorldSceneProps {
  agents: readonly AgentRuntimeState[];
  locations: readonly ScenarioLocation[];
  factions: WorldState["factions"];
  /** Explicit scene selection keeps visual geography separate from event prose. */
  sceneTheme: WorldSceneTheme;
  selectedAgentId: string;
  weather: WeatherState;
  followSelected: boolean;
  speechBubbles?: readonly AgentMessage[];
  /**
   * A compact cue for a time-bound world action. It is deliberately optional so
   * consumers that only render the map keep the same behavior. Set
   * `activeEvent.action` to `fire-attack` to start the Red Cliffs sequence.
   */
  activeEvent?: WorldEventCue | null;
  onSelectAgent: (agentId: string) => void;
}

export interface WorldEventCue {
  id: string;
  /** Explicitly selects an authored world animation; avoids inferring action from prose. */
  action?: WorldActionCue;
  title?: string;
  locationId?: string;
}

const factionColors: Record<string, string> = {
  wei: "#c85b47",
  "sun-liu": "#359c87",
  neutral: "#c49857",
};

const factionTrimColors: Record<string, string> = {
  wei: "#702f35",
  "sun-liu": "#185f59",
  neutral: "#735a39",
};

const skinTones = ["#e7bf9b", "#d9a980", "#efc9a7"] as const;
const hairColors = ["#2d2528", "#49342a", "#1f2c34"] as const;

function smoothstep(value: number) {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function stableVariant(value: string, length: number) {
  return Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0) % length;
}

function Headwear({ role, color, trim }: { role: AgentRuntimeState["role"]; color: string; trim: string }) {
  if (role === "ruler") {
    return (
      <group position={[0, 1.295, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.11, 0.14, 0.09, 5]} />
          <meshStandardMaterial color={trim} roughness={0.78} />
        </mesh>
        {[-0.08, 0, 0.08].map((x) => (
          <mesh key={x} castShadow position={[x, 0.095, 0]}>
            <coneGeometry args={[0.032, 0.11, 4]} />
            <meshStandardMaterial color="#d8b757" roughness={0.7} metalness={0.12} />
          </mesh>
        ))}
      </group>
    );
  }

  if (role === "strategist" || role === "diplomat") {
    return (
      <group position={[0, 1.292, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.155, 0.17, 0.07, 8]} />
          <meshStandardMaterial color="#263a55" roughness={0.88} />
        </mesh>
        <mesh castShadow position={[0, 0.075, 0]}>
          <boxGeometry args={[0.06, 0.1, 0.24]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      </group>
    );
  }

  if (role === "commander" || role === "officer" || role === "soldier") {
    return (
      <group position={[0, 1.29, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.17, 8, 6]} />
          <meshStandardMaterial color={trim} roughness={0.78} flatShading />
        </mesh>
        <mesh castShadow position={[0, 0.115, -0.015]} scale={[0.68, 0.42, 0.78]}>
          <sphereGeometry args={[0.17, 8, 6]} />
          <meshStandardMaterial color={color} roughness={0.82} flatShading />
        </mesh>
      </group>
    );
  }

  if (role === "messenger" || role === "scout") {
    return (
      <group position={[0, 1.3, 0]} rotation={[0, 0.18, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.145, 0.165, 0.075, 6]} />
          <meshStandardMaterial color={color} roughness={0.86} />
        </mesh>
        <mesh castShadow position={[0, 0.065, -0.1]} rotation={[0.18, 0, 0]}>
          <boxGeometry args={[0.22, 0.04, 0.08]} />
          <meshStandardMaterial color={trim} roughness={0.9} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh castShadow position={[0, 1.29, 0]} scale={[1.04, 0.37, 1.04]}>
      <sphereGeometry args={[0.17, 8, 6]} />
      <meshStandardMaterial color={trim} roughness={0.9} flatShading />
    </mesh>
  );
}

function RoleAccessory({ role, color, trim }: { role: AgentRuntimeState["role"]; color: string; trim: string }) {
  if (role === "ruler") {
    return (
      <>
        <mesh castShadow position={[0, 0.75, -0.19]} rotation={[0.12, 0, 0]}>
          <boxGeometry args={[0.36, 0.46, 0.055]} />
          <meshStandardMaterial color={trim} roughness={0.9} />
        </mesh>
        <mesh castShadow position={[0, 0.9, 0.145]}>
          <boxGeometry args={[0.19, 0.055, 0.04]} />
          <meshStandardMaterial color="#d8b757" roughness={0.72} metalness={0.1} />
        </mesh>
      </>
    );
  }

  if (role === "strategist" || role === "diplomat") {
    return (
      <group position={[0.27, 0.58, 0.09]} rotation={[0.08, 0, 0.24]}>
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.3, 6]} />
          <meshStandardMaterial color="#e3c68f" roughness={0.92} />
        </mesh>
        <mesh castShadow position={[0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.052, 0.052, 0.055, 6]} />
          <meshStandardMaterial color={trim} roughness={0.82} />
        </mesh>
      </group>
    );
  }

  if (role === "commander" || role === "officer") {
    return (
      <group position={[0.28, 0.86, -0.06]} rotation={[0, 0, -0.15]}>
        <mesh castShadow position={[0, 0.24, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.74, 5]} />
          <meshStandardMaterial color="#694c37" roughness={0.9} />
        </mesh>
        <mesh castShadow position={[-0.08, 0.44, 0]}>
          <planeGeometry args={[0.23, 0.18]} />
          <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.86} />
        </mesh>
      </group>
    );
  }

  if (role === "soldier") {
    return (
      <mesh castShadow position={[-0.26, 0.62, 0.02]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.055, 7]} />
        <meshStandardMaterial color={trim} roughness={0.85} />
      </mesh>
    );
  }

  if (role === "messenger" || role === "scout") {
    return (
      <>
        <mesh castShadow position={[-0.22, 0.57, -0.1]} scale={[1.1, 0.82, 0.56]}>
          <sphereGeometry args={[0.14, 7, 5]} />
          <meshStandardMaterial color="#9a7045" roughness={0.94} flatShading />
        </mesh>
        <mesh castShadow position={[0.255, 0.57, 0.09]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.032, 0.032, 0.22, 6]} />
          <meshStandardMaterial color="#e0c18c" roughness={0.9} />
        </mesh>
      </>
    );
  }

  if (role === "merchant") {
    return (
      <mesh castShadow position={[-0.18, 0.65, -0.17]} rotation={[0.1, 0.24, 0]}>
        <boxGeometry args={[0.25, 0.28, 0.16]} />
        <meshStandardMaterial color="#9c7045" roughness={0.94} />
      </mesh>
    );
  }

  if (role === "farmer") {
    return (
      <group position={[0.29, 0.58, -0.03]} rotation={[0, 0, -0.28]}>
        <mesh castShadow position={[0, 0.19, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.68, 5]} />
          <meshStandardMaterial color="#76583c" roughness={0.95} />
        </mesh>
        <mesh castShadow position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.2, 0.045, 0.04]} />
          <meshStandardMaterial color="#83613f" roughness={0.92} />
        </mesh>
      </group>
    );
  }

  if (role === "medic") {
    return (
      <group position={[0.24, 0.56, 0.08]}>
        <mesh castShadow>
          <boxGeometry args={[0.16, 0.16, 0.08]} />
          <meshStandardMaterial color="#e4d7b4" roughness={0.92} />
        </mesh>
        <mesh position={[0, 0, 0.045]}>
          <boxGeometry args={[0.09, 0.026, 0.012]} />
          <meshStandardMaterial color="#bc6554" roughness={0.82} />
        </mesh>
        <mesh position={[0, 0, 0.052]}>
          <boxGeometry args={[0.026, 0.09, 0.012]} />
          <meshStandardMaterial color="#bc6554" roughness={0.82} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh castShadow position={[0.24, 0.56, -0.04]} rotation={[0, 0.4, 0]}>
      <boxGeometry args={[0.16, 0.12, 0.11]} />
      <meshStandardMaterial color={trim} roughness={0.9} />
    </mesh>
  );
}

type SceneObstacle = {
  id: string;
  position: Vector3Tuple;
  /** A conservative 2D footprint used to keep avatar paths out of scenery. */
  radius: number;
};

type AgentSlot = {
  index: number;
  count: number;
};

type AgentMotion = {
  current: THREE.Vector3;
  source: THREE.Vector3;
  target: THREE.Vector3;
  path: THREE.Vector3[];
  nextPathIndex: number;
  elapsed: number;
  duration: number;
  isMoving: boolean;
};

function sceneAgentAnchor(
  sceneTheme: WorldSceneTheme,
  location: ScenarioLocation,
  agent: AgentRuntimeState,
): Vector3Tuple {
  const base: Vector3Tuple = [location.position.x, location.position.y, location.position.z];

  // Cao Cao is deliberately staged on the raised flagship deck in Red Cliffs.
  if (sceneTheme === "red-cliffs" && agent.id === "cao-cao") return base;

  const sceneOffsets: Partial<Record<WorldSceneTheme, Record<string, Vector3Tuple>>> = {
    "red-cliffs": {
      xiakou: [0.1, 0, -1.72],
      wulin: [-0.95, 0, 1.28],
      "chibi-river": [0, 0, -1.42],
      jiangxia: [0.8, 0, 1.8],
      "wulin-road": [0.22, 0, 0.18],
      "river-village": [0.16, 0, -1.45],
    },
    waterloo: {
      "la-belle-alliance": [0.18, 0, -0.92],
      "french-artillery-line": [1.14, 0, 0.78],
      "hougoumont-approach": [-0.48, 0, -0.66],
      "french-cavalry-assembly": [-0.34, 0, -0.82],
      "allied-square-line": [0.22, 0, 0.18],
      "mont-saint-jean": [0.08, 0, -0.86],
      hougoumont: [-1.85, 0, -0.95],
      "la-haye-sainte": [-1.85, 0, -0.75],
      plancenoit: [0.44, 0, 0.92],
      "prussian-east-approach": [-0.15, 0, 0.32],
      "imperial-guard-staging": [-0.78, 0, -0.8],
      "charleroi-withdrawal-road": [0.28, 0, 0.3],
      "brussels-road": [-0.2, 0, -0.24],
      "waterloo-village": [-0.8, 0, -0.9],
    },
    surabaya: {
      "tanjung-perak": [0.08, 0, 2.42],
      "tanjung-perak-port": [0.08, 0, 2.42],
      "jembatan-merah": [0, 0, -1.46],
      "red-bridge": [0, 0, -1.46],
      "gedung-internatio": [1.45, 0, -1.15],
      "radio-station": [0.18, 0, -1.68],
      "radio-studio": [0.18, 0, -1.68],
      "tkr-command": [0, 0, 1.65],
      "aid-post": [1.55, 0, 0.25],
      "kampung-refuge": [0, 0, 3],
      "south-evacuation-road": [0.46, 0, 0.38],
    },
  };
  const offset = sceneOffsets[sceneTheme]?.[location.id];
  if (offset) return [base[0] + offset[0], base[1] + offset[1], base[2] + offset[2]];

  // Future scenarios still receive a sensible clear-space staging point even
  // before bespoke scene geometry has been authored.
  const fallbackByKind: Record<ScenarioLocation["kind"], Vector3Tuple> = {
    camp: [0.75, 0, -0.75],
    harbor: [0, 0, -1.2],
    river: [0, 0, -0.8],
    village: [0.4, 0, -1.2],
    fortress: [-1.05, 0, -0.82],
    road: [0.24, 0, 0.18],
    forest: [0.82, 0, -0.7],
    farm: [-0.95, 0, -0.72],
    ridge: [0.35, 0, -0.34],
    field: [0.18, 0, 0.16],
  };
  const fallback = fallbackByKind[location.kind];
  return [base[0] + fallback[0], base[1] + fallback[1], base[2] + fallback[2]];
}

function formationOffset(index: number, count: number, renderKind?: AgentRuntimeState["renderKind"]): Vector3Tuple {
  if (count <= 1) return [0, 0, 0];

  const ringIndex = Math.floor(index / 6);
  const onRing = Math.min(6, count - ringIndex * 6);
  const positionOnRing = index % 6;
  const radius = (renderKind === "unit" ? 0.98 : 0.62) + ringIndex * 0.48;
  const angle = -Math.PI / 2 + (positionOnRing / onRing) * Math.PI * 2;
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}

function markerPositionForAgent(
  sceneTheme: WorldSceneTheme,
  agent: AgentRuntimeState,
  location: ScenarioLocation | undefined,
  slot: AgentSlot | undefined,
  obstacles: readonly SceneObstacle[],
): Vector3Tuple {
  if (!location) return [0, 0, 0];

  const anchor = sceneAgentAnchor(sceneTheme, location, agent);
  const formation = formationOffset(slot?.index ?? 0, slot?.count ?? 1, agent.renderKind);
  const surfaceHeight = sceneTheme === "red-cliffs" && agent.id === "cao-cao" ? 0.79 : anchor[1];
  const desired: Vector3Tuple = [anchor[0] + formation[0], surfaceHeight, anchor[2] + formation[2]];
  return makeAgentPositionSafe(
    desired,
    obstacles,
    agent.id,
    agent.renderKind === "unit" ? 0.7 : 0.3,
  );
}

function makeAgentPositionSafe(
  desired: Vector3Tuple,
  obstacles: readonly SceneObstacle[],
  agentId: string,
  clearance: number,
): Vector3Tuple {
  const safe = new THREE.Vector3(desired[0], desired[1], desired[2]);
  const seedAngle = (stableVariant(agentId, 360) * Math.PI) / 180;

  // Several passes handle the rare case where a location sits between two
  // neighbouring buildings. The values only affect the visual staging point;
  // simulation locations remain the historical/data-model locations.
  for (let pass = 0; pass < 4; pass += 1) {
    let changed = false;
    for (const obstacle of obstacles) {
      const deltaX = safe.x - obstacle.position[0];
      const deltaZ = safe.z - obstacle.position[2];
      const distance = Math.hypot(deltaX, deltaZ);
      const minimumDistance = obstacle.radius + clearance;
      if (distance >= minimumDistance) continue;

      const normalX = distance > 0.001 ? deltaX / distance : Math.cos(seedAngle + pass * 0.81);
      const normalZ = distance > 0.001 ? deltaZ / distance : Math.sin(seedAngle + pass * 0.81);
      safe.x = obstacle.position[0] + normalX * minimumDistance;
      safe.z = obstacle.position[2] + normalZ * minimumDistance;
      changed = true;
    }
    if (!changed) break;
  }

  return [safe.x, desired[1], safe.z];
}

function segmentDistanceToPoint(
  from: THREE.Vector3,
  to: THREE.Vector3,
  point: Vector3Tuple,
): { distance: number; progress: number } {
  const deltaX = to.x - from.x;
  const deltaZ = to.z - from.z;
  const lengthSquared = deltaX * deltaX + deltaZ * deltaZ;
  const progress = lengthSquared <= 0.0001
    ? 0
    : THREE.MathUtils.clamp(((point[0] - from.x) * deltaX + (point[2] - from.z) * deltaZ) / lengthSquared, 0, 1);
  const closestX = from.x + deltaX * progress;
  const closestZ = from.z + deltaZ * progress;
  return { distance: Math.hypot(point[0] - closestX, point[2] - closestZ), progress };
}

function obstacleAwarePath(
  from: THREE.Vector3,
  to: THREE.Vector3,
  obstacles: readonly SceneObstacle[],
  agentId: string,
  clearance: number,
): THREE.Vector3[] {
  const directDistance = from.distanceTo(to);
  if (directDistance < 0.05 || obstacles.length === 0) return [to.clone()];

  const direction = new THREE.Vector3(to.x - from.x, 0, to.z - from.z).normalize();
  const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
  const route = obstacles
    .map((obstacle) => ({ obstacle, ...segmentDistanceToPoint(from, to, obstacle.position) }))
    .filter(({ obstacle, distance, progress }) => progress > 0.05 && progress < 0.95 && distance < obstacle.radius + clearance)
    .sort((left, right) => left.progress - right.progress);
  if (!route.length) return [to.clone()];

  const waypoints: THREE.Vector3[] = [];
  for (const { obstacle } of route) {
    // Alternate sides in a deterministic way. Two points make the avatar arc
    // around a footprint instead of snapping through its far side.
    const side = stableVariant(`${agentId}-${obstacle.id}`, 2) === 0 ? -1 : 1;
    const turnRadius = obstacle.radius + clearance + 0.18;
    const along = Math.min(turnRadius * 0.86, directDistance * 0.16);
    const center = new THREE.Vector3(obstacle.position[0], from.y, obstacle.position[2]);
    const before = center.clone()
      .addScaledVector(direction, -along)
      .addScaledVector(perpendicular, side * turnRadius);
    const after = center.clone()
      .addScaledVector(direction, along)
      .addScaledVector(perpendicular, side * turnRadius);

    // Skip a detour that is effectively behind a previous one in a dense block.
    const prior = waypoints[waypoints.length - 1] ?? from;
    if (prior.distanceToSquared(before) > 0.04) waypoints.push(before);
    if (before.distanceToSquared(after) > 0.04) waypoints.push(after);
  }

  waypoints.push(to.clone());
  return waypoints;
}

function startNextMotionSegment(animation: AgentMotion) {
  while (animation.nextPathIndex < animation.path.length) {
    const next = animation.path[animation.nextPathIndex];
    animation.nextPathIndex += 1;
    const distance = animation.current.distanceTo(next);
    if (distance < 0.035) continue;

    animation.source.copy(animation.current);
    animation.target.copy(next);
    animation.duration = THREE.MathUtils.clamp(distance * 0.84, 0.72, 3.5);
    animation.elapsed = 0;
    animation.isMoving = true;
    return true;
  }

  animation.current.copy(animation.target);
  animation.isMoving = false;
  return false;
}

function sceneObstacles(sceneTheme: WorldSceneTheme, locations: readonly ScenarioLocation[]): readonly SceneObstacle[] {
  if (sceneTheme === "red-cliffs") {
    return [
      { id: "xiakou-tents", position: [-7.1, 0, 4.25], radius: 1.55 },
      { id: "jiangxia-tents", position: [-4.15, 0, -4.4], radius: 1.35 },
      { id: "river-village-west", position: [-3.45, 0, 5.72], radius: 1.3 },
      { id: "river-village-center", position: [-0.62, 0, 5.85], radius: 1.28 },
      { id: "river-village-east", position: [2.2, 0, 5.22], radius: 1.18 },
    ];
  }

  if (sceneTheme === "waterloo") {
    return [
      { id: "la-haye-sainte", position: [1.2, 0, 0.2], radius: 1.62 },
      { id: "hougoumont", position: [-0.7, 0, 5.5], radius: 1.82 },
      { id: "plancenoit", position: [7.2, 0, -4.55], radius: 1.36 },
      { id: "french-command-tent", position: [-8.2, 0, -1.7], radius: 1.12 },
      { id: "allied-ridge-tents", position: [2.45, 0, 4.7], radius: 1.48 },
    ];
  }

  const port = sceneLocationPosition(locations, ["tanjung-perak-port", "tanjung-perak"], [7, 0, -6]);
  const bridge = sceneLocationPosition(locations, ["red-bridge", "jembatan-merah"], [0, 0, 0]);
  const internatio = sceneLocationPosition(locations, ["gedung-internatio"], [1.6, 0, 1.5]);
  const radio = sceneLocationPosition(locations, ["radio-studio", "radio-station"], [-5.7, 0, 2.4]);
  const tkrCommand = sceneLocationPosition(locations, ["tkr-command"], [-4.8, 0, -2.6]);
  const aidPost = sceneLocationPosition(locations, ["hospital-relief-corridor", "aid-post"], [-1.7, 0, -4.3]);
  const kampung = sceneLocationPosition(locations, ["kampung-shelter", "kampung-refuge"], [-7.5, 0, 5.2]);

  return [
    { id: "port-warehouse-west", position: offsetPosition(port, -2.8, 0, 0.55), radius: 1.86 },
    { id: "port-warehouse-east", position: offsetPosition(port, 2.7, 0, 0.55), radius: 1.68 },
    { id: "bridge-shophouse-west", position: offsetPosition(bridge, -3.45, 0, 2.18), radius: 1.35 },
    { id: "bridge-shophouse-east", position: offsetPosition(bridge, 3.8, 0, -2.4), radius: 1.35 },
    { id: "internatio", position: offsetPosition(internatio, -1.55, 0, 1.75), radius: 1.56 },
    { id: "radio-building", position: radio, radius: 1.28 },
    { id: "command-tent-west", position: offsetPosition(tkrCommand, -1.48, 0, 0.32), radius: 0.9 },
    { id: "command-tent-east", position: offsetPosition(tkrCommand, 1.52, 0, -0.78), radius: 0.82 },
    { id: "aid-post", position: aidPost, radius: 1.02 },
    { id: "kampung-west", position: offsetPosition(kampung, -2.1, 0, -0.8), radius: 0.82 },
    { id: "kampung-south", position: offsetPosition(kampung, 0, 0, -2), radius: 0.82 },
    { id: "kampung-east", position: offsetPosition(kampung, 2, 0, -0.7), radius: 0.82 },
    { id: "kampung-northwest", position: offsetPosition(kampung, -1, 0, 1.25), radius: 0.82 },
    { id: "kampung-northeast", position: offsetPosition(kampung, 1.2, 0, 1.25), radius: 0.82 },
  ];
}

// One agent is roughly 1.4 world units tall. These dimensions keep the river
// settlement, fleet, and vegetation in the same human-readable scale.
const RIVER_LENGTH = 38;
const RIVER_WIDTH = 5.2;
const RIVER_HALF_WIDTH = RIVER_WIDTH / 2;
const SHORE_SEGMENTS = [-17.1, -14.3, -11.5, -8.7, -5.9, -3.1, -0.3, 2.5, 5.3, 8.1, 10.9, 13.7, 16.5] as const;

function Tree({ position, scale = 1 }: { position: Vector3Tuple; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.14, 0.22, 2.2, 7]} />
        <meshStandardMaterial color="#674d32" roughness={0.94} />
      </mesh>
      <mesh castShadow position={[0, 2.72, 0]}>
        <coneGeometry args={[1.04, 2.38, 8]} />
        <meshStandardMaterial color="#386d50" roughness={0.98} flatShading />
      </mesh>
      <mesh castShadow position={[0.34, 3.18, -0.2]} rotation={[0.12, 0.48, 0]}>
        <coneGeometry args={[0.76, 1.78, 7]} />
        <meshStandardMaterial color="#477d5a" roughness={0.98} flatShading />
      </mesh>
    </group>
  );
}

function Tent({
  position,
  color = "#d7b67a",
  rotation = 0,
  scale = 1,
}: {
  position: Vector3Tuple;
  color?: string;
  rotation?: number;
  scale?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh receiveShadow position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.98, 0.98, 0.12, 8]} />
        <meshStandardMaterial color="#76573d" roughness={1} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.87, 0]}>
        <coneGeometry args={[1.08, 1.62, 4]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.43, 0.77]}>
        <boxGeometry args={[0.35, 0.72, 0.04]} />
        <meshStandardMaterial color="#60442f" roughness={0.96} />
      </mesh>
      {[-0.76, 0.76].map((x) => (
        <mesh key={x} castShadow position={[x, 0.92, 0]} rotation={[0, 0, x > 0 ? -0.68 : 0.68]}>
          <cylinderGeometry args={[0.018, 0.018, 1.2, 5]} />
          <meshStandardMaterial color="#83613f" roughness={0.96} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 1.7, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.66, 5]} />
        <meshStandardMaterial color="#735138" roughness={0.96} />
      </mesh>
    </group>
  );
}

function Rock({ position, scale = 1, color = "#7d856f" }: { position: Vector3Tuple; scale?: number; color?: string }) {
  return (
    <mesh castShadow receiveShadow position={position} scale={[scale * 1.18, scale * 0.7, scale]} rotation={[0.18, position[0] * 0.31, -0.12]}>
      <dodecahedronGeometry args={[0.32, 0]} />
      <meshStandardMaterial color={color} roughness={1} flatShading />
    </mesh>
  );
}

function ReedCluster({ position, scale = 1, rotation = 0 }: { position: Vector3Tuple; scale?: number; rotation?: number }) {
  const blades = [-0.13, -0.055, 0.02, 0.09, 0.16];

  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      {blades.map((offset, index) => (
        <mesh key={offset} castShadow position={[offset, 0.19 + (index % 2) * 0.04, Math.sin(index * 2.1) * 0.045]} rotation={[0.05, 0, (index - 2) * 0.12]}>
          <coneGeometry args={[0.026, 0.48 + (index % 3) * 0.07, 4]} />
          <meshStandardMaterial color={index % 2 ? "#4b7759" : "#37674e"} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function VillageHouse({
  position,
  scale = 1,
  rotation = 0,
  wall = "#caa46e",
}: {
  position: Vector3Tuple;
  scale?: number;
  rotation?: number;
  wall?: string;
}) {
  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      <mesh receiveShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[2.46, 0.16, 1.94]} />
        <meshStandardMaterial color="#765a41" roughness={1} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.88, 0]}>
        <boxGeometry args={[2.28, 1.6, 1.76]} />
        <meshStandardMaterial color={wall} roughness={0.94} />
      </mesh>
      <mesh castShadow position={[0, 2.2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.7, 1.18, 4]} />
        <meshStandardMaterial color="#72513b" roughness={0.96} />
      </mesh>
      <mesh castShadow position={[0, 0.55, 0.895]}>
        <boxGeometry args={[0.46, 0.94, 0.04]} />
        <meshStandardMaterial color="#604532" roughness={0.96} />
      </mesh>
      <mesh position={[-0.69, 1.08, 0.897]}>
        <boxGeometry args={[0.36, 0.3, 0.028]} />
        <meshStandardMaterial color="#e4cf8d" emissive="#d5b76d" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0.69, 1.08, 0.897]}>
        <boxGeometry args={[0.36, 0.3, 0.028]} />
        <meshStandardMaterial color="#e4cf8d" emissive="#d5b76d" emissiveIntensity={0.1} />
      </mesh>
      {[-0.92, 0.92].map((x) => (
        <mesh key={x} castShadow position={[x, 0.9, 0.91]}>
          <boxGeometry args={[0.08, 1.62, 0.07]} />
          <meshStandardMaterial color="#7a5638" roughness={0.96} />
        </mesh>
      ))}
      <mesh castShadow position={[-0.82, 2.65, -0.5]}>
        <boxGeometry args={[0.28, 0.78, 0.28]} />
        <meshStandardMaterial color="#70513b" roughness={0.98} />
      </mesh>
    </group>
  );
}

function Dock({ position, rotation = 0, length = 3.5 }: { position: Vector3Tuple; rotation?: number; length?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.24, 0]}>
        <boxGeometry args={[1.08, 0.16, length]} />
        <meshStandardMaterial color="#76563d" roughness={0.96} />
      </mesh>
      {[-length * 0.39, -length * 0.13, length * 0.13, length * 0.39].map((z) => (
        <mesh key={z} castShadow position={[0, 0.345, z]}>
          <boxGeometry args={[1.17, 0.035, 0.055]} />
          <meshStandardMaterial color="#9a704a" roughness={0.96} />
        </mesh>
      ))}
      {[-0.42, 0.42].flatMap((x) => [-length * 0.39, length * 0.39].map((z) => [x, z] as const)).map(([x, z]) => (
        <mesh key={`${x}-${z}`} castShadow position={[x, -0.08, z]}>
          <cylinderGeometry args={[0.075, 0.1, 0.84, 6]} />
          <meshStandardMaterial color="#604631" roughness={0.98} />
        </mesh>
      ))}
    </group>
  );
}

function Bridge({ position, length = 6.2 }: { position: Vector3Tuple; length?: number }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0.38, 0]}>
        <boxGeometry args={[1.32, 0.2, length]} />
        <meshStandardMaterial color="#7e5d42" roughness={0.94} />
      </mesh>
      {[-length * 0.4, -length * 0.2, 0, length * 0.2, length * 0.4].map((z) => (
        <mesh key={z} castShadow position={[0, 0.5, z]}>
          <boxGeometry args={[1.46, 0.045, 0.09]} />
          <meshStandardMaterial color="#a3794c" roughness={0.94} />
        </mesh>
      ))}
      {[-0.56, 0.56].flatMap((x) => [-length * 0.44, -length * 0.15, length * 0.15, length * 0.44].map((z) => [x, z] as const)).map(([x, z]) => (
        <mesh key={`${x}-${z}`} castShadow position={[x, 0.04, z]}>
          <cylinderGeometry args={[0.075, 0.1, 0.94, 6]} />
          <meshStandardMaterial color="#684b35" roughness={0.98} />
        </mesh>
      ))}
      {[-0.56, 0.56].map((x) => (
        <mesh key={x} castShadow position={[x, 0.86, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.034, 0.034, length * 0.93, 5]} />
          <meshStandardMaterial color="#76563d" roughness={0.98} />
        </mesh>
      ))}
    </group>
  );
}

function TerrainPatch({
  position,
  scale,
  color,
  rotation = 0,
}: {
  position: Vector3Tuple;
  scale: [number, number, number];
  color: string;
  rotation?: number;
}) {
  return (
    <mesh receiveShadow position={position} rotation={[-Math.PI / 2, 0, rotation]} scale={scale}>
      <circleGeometry args={[1, 10]} />
      <meshStandardMaterial color={color} roughness={1} flatShading />
    </mesh>
  );
}

function RiverBank({ side }: { side: 1 | -1 }) {
  return (
    <group>
      {SHORE_SEGMENTS.map((x, index) => {
        const bend = Math.sin(index * 1.73) * 0.16 + Math.cos(index * 0.61) * 0.08;
        const z = side * (RIVER_HALF_WIDTH + 0.26 + bend);

        return (
          <group key={`${side}-${x}`} position={[x, 0, z]} rotation={[0, side * (index % 2 ? 0.036 : -0.028), 0]}>
            <mesh receiveShadow position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[2.94, 0.9]} />
              <meshStandardMaterial color={index % 3 === 0 ? "#b59c6b" : "#c2a978"} roughness={1} />
            </mesh>
            <mesh castShadow receiveShadow position={[0, -0.02, -side * 0.33]}>
              <boxGeometry args={[2.9, 0.17, 0.16]} />
              <meshStandardMaterial color={index % 2 ? "#8b7756" : "#967d56"} roughness={1} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function RiverSurface({ underFire }: { underFire: boolean }) {
  const water = useRef<THREE.Mesh>(null);
  const ripples = useRef<THREE.Group>(null);
  const basePositions = useRef<Float32Array | null>(null);
  const frameCount = useRef(0);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;

    if (water.current) {
      const geometry = water.current.geometry as THREE.PlaneGeometry;
      const positions = geometry.attributes.position as THREE.BufferAttribute;

      if (!basePositions.current) {
        basePositions.current = new Float32Array(positions.array);
      }

      for (let index = 0; index < positions.count; index += 1) {
        const offset = index * 3;
        const x = basePositions.current[offset] ?? 0;
        const z = basePositions.current[offset + 1] ?? 0;
        const primaryWave = Math.sin(x * 0.72 + time * (underFire ? 2.6 : 1.35) + z * 0.46) * 0.045;
        const crossWave = Math.cos(x * 0.3 - z * 1.8 + time * 1.1) * 0.022;
        positions.setZ(index, primaryWave + crossWave);
      }

      positions.needsUpdate = true;
      frameCount.current += 1;
      if (frameCount.current % 3 === 0) geometry.computeVertexNormals();
    }

    if (ripples.current) {
      ripples.current.children.forEach((ripple, index) => {
        const phase = (time * (underFire ? 1.25 : 0.74) + index * 3.37) % (RIVER_LENGTH + 4);
        ripple.position.x = phase - RIVER_LENGTH / 2 - 2;
        ripple.position.z = -RIVER_HALF_WIDTH + 0.32 + ((index * 0.79) % (RIVER_WIDTH - 0.64));
        ripple.scale.x = 0.72 + Math.sin(time * 1.12 + index) * 0.18;
      });
    }
  });

  return (
    <group>
      <mesh ref={water} receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[RIVER_LENGTH, RIVER_WIDTH, 64, 16]} />
        <meshStandardMaterial color={underFire ? "#2d728e" : "#3d8eaa"} roughness={0.23} metalness={0.22} transparent opacity={0.94} />
      </mesh>
      <group ref={ripples} position={[0, 0.105, 0]}>
        {Array.from({ length: 18 }, (_, index) => (
          <mesh key={index} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2.6 + (index % 3) * 0.68, 0.026]} />
            <meshBasicMaterial color="#d7f1f2" transparent opacity={underFire ? 0.18 : 0.13} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function BurningDeck({ intensity = 1, delay = 0 }: { intensity?: number; delay?: number }) {
  const flames = useRef<THREE.Group>(null);
  const smoke = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime + delay;
    const flicker = 0.82 + Math.sin(time * 10.5) * 0.16 + Math.sin(time * 16.4) * 0.08;

    if (flames.current) {
      flames.current.scale.set(1, flicker * intensity, 1);
      flames.current.rotation.y = Math.sin(time * 1.8) * 0.1;
    }

    if (smoke.current) {
      smoke.current.children.forEach((particle, index) => {
        const rise = (time * 0.22 + index * 0.24) % 1;
        particle.position.y = 1.02 + rise * 1.72;
        particle.position.x = (index - 1) * 0.22 + Math.sin(time * 1.25 + index) * 0.14;
        particle.position.z = Math.cos(time * 1.4 + index) * 0.13;
        particle.scale.setScalar(0.7 + rise * 1.05);
      });
    }
  });

  return (
    <group>
      <group ref={flames} position={[0, 0.8, 0]}>
        <mesh castShadow position={[-0.28, 0.18, 0.02]} rotation={[0, 0.25, -0.08]}>
          <coneGeometry args={[0.23, 0.84, 5]} />
          <meshStandardMaterial color="#ff9d32" emissive="#ed551d" emissiveIntensity={1.9} roughness={0.78} />
        </mesh>
        <mesh castShadow position={[0.2, 0.3, -0.08]} rotation={[0, -0.18, 0.08]}>
          <coneGeometry args={[0.25, 1.08, 5]} />
          <meshStandardMaterial color="#ffd166" emissive="#ff7c27" emissiveIntensity={2.15} roughness={0.7} />
        </mesh>
        <mesh position={[0.2, 0.26, -0.085]} rotation={[0, -0.18, 0.08]} scale={[0.46, 0.52, 0.46]}>
          <coneGeometry args={[0.25, 1.08, 5]} />
          <meshBasicMaterial color="#fff0a8" />
        </mesh>
      </group>
      <group ref={smoke} position={[0, 0, 0]}>
        {[0, 1, 2].map((index) => (
          <mesh key={index} castShadow>
            <dodecahedronGeometry args={[0.26, 0]} />
            <meshStandardMaterial color="#5d6268" transparent opacity={0.46} roughness={1} flatShading />
          </mesh>
        ))}
      </group>
      <pointLight color="#ff9f42" intensity={1.35 * intensity} distance={5.8} position={[0, 1.3, 0]} />
    </group>
  );
}

function Boat({
  position,
  color,
  rotation = 0,
  scale = 1,
  underFire = false,
  fireDelay = 0,
  variant = "skiff",
}: {
  position: Vector3Tuple;
  color: string;
  rotation?: number;
  scale?: number;
  underFire?: boolean;
  fireDelay?: number;
  variant?: "skiff" | "warship" | "flagship";
}) {
  const boat = useRef<THREE.Group>(null);
  const isFlagship = variant === "flagship";
  const isWarship = variant !== "skiff";
  const hullLength = isFlagship ? 5.55 : isWarship ? 4.65 : 3.05;
  const hullWidth = isFlagship ? 1.56 : isWarship ? 1.28 : 0.84;
  const hullHeight = isFlagship ? 0.68 : isWarship ? 0.58 : 0.42;
  const deckWidth = hullWidth * 0.83;
  const mastHeight = isFlagship ? 2.7 : isWarship ? 2.25 : 1.45;
  const oarStations = isWarship ? [-0.3, -0.08, 0.15, 0.36] : [-0.16, 0.22];

  useFrame(({ clock }) => {
    if (!boat.current) return;
    const time = clock.elapsedTime + fireDelay;
    const wave = Math.sin(time * 1.7 + position[0]) * (underFire ? 0.075 : 0.035);

    boat.current.position.y = position[1] + wave;
    boat.current.rotation.y = rotation + (underFire ? Math.sin(time * 2.1) * 0.052 : 0);
    boat.current.rotation.z = underFire ? Math.sin(time * 2.55) * 0.045 : Math.sin(time * 1.4) * 0.012;
  });

  return (
    <group ref={boat} position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh castShadow receiveShadow position={[-hullLength * 0.05, 0.34, 0]}>
        <boxGeometry args={[hullLength * 0.86, hullHeight, hullWidth]} />
        <meshStandardMaterial color={isFlagship ? "#53392e" : "#634a38"} roughness={0.9} />
      </mesh>
      <mesh castShadow receiveShadow position={[hullLength * 0.46, 0.34, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[hullWidth * 0.57, hullLength * 0.36, 4]} />
        <meshStandardMaterial color={isFlagship ? "#5c3f30" : "#6e4d37"} roughness={0.92} />
      </mesh>
      <mesh castShadow position={[-hullLength * 0.47, 0.39, 0]}>
        <boxGeometry args={[hullLength * 0.16, hullHeight * 0.86, hullWidth * 0.92]} />
        <meshStandardMaterial color="#513a2c" roughness={0.94} />
      </mesh>
      <mesh castShadow position={[-hullLength * 0.06, 0.69, 0]}>
        <boxGeometry args={[hullLength * 0.79, 0.14, deckWidth]} />
        <meshStandardMaterial color="#9b7047" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[hullLength * 0.3, 0.87, 0]}>
        <boxGeometry args={[hullLength * 0.2, 0.34, deckWidth * 0.78]} />
        <meshStandardMaterial color={isFlagship ? "#80503a" : "#876044"} roughness={0.92} />
      </mesh>
      <mesh castShadow position={[hullLength * 0.3, 1.08, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[deckWidth * 0.56, 0.36, 4]} />
        <meshStandardMaterial color="#6b4634" roughness={0.96} />
      </mesh>
      {oarStations.flatMap((station) => [-1, 1].map((side) => [station, side] as const)).map(([station, side]) => (
        <mesh key={`${station}-${side}`} castShadow position={[hullLength * station, 0.79, side * hullWidth * 0.62]} rotation={[side * 1.02, 0, 0]}>
          <cylinderGeometry args={[0.027, 0.027, hullWidth * 1.45, 5]} />
          <meshStandardMaterial color="#674a34" roughness={0.96} />
        </mesh>
      ))}
      {[-0.24, 0.04, 0.3].flatMap((station) => [-1, 1].map((side) => [station, side] as const)).map(([station, side]) => (
        <mesh key={`rail-${station}-${side}`} castShadow position={[hullLength * station, 0.96, side * deckWidth * 0.52]}>
          <cylinderGeometry args={[0.026, 0.026, 0.52, 5]} />
          <meshStandardMaterial color="#6c4d35" roughness={0.96} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`railing-${side}`} castShadow position={[0, 1.18, side * deckWidth * 0.52]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, hullLength * 0.62, 5]} />
          <meshStandardMaterial color="#6c4d35" roughness={0.96} />
        </mesh>
      ))}
      <mesh castShadow position={[-hullLength * 0.12, 0.77 + mastHeight * 0.5, 0]}>
        <cylinderGeometry args={[0.04, 0.052, mastHeight, 7]} />
        <meshStandardMaterial color="#57412f" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[-hullLength * 0.02, 0.88 + mastHeight * 0.64, 0.02]}>
        <planeGeometry args={[isFlagship ? 2.15 : isWarship ? 1.78 : 1.12, mastHeight * 0.58]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
      {isFlagship && (
        <>
          <mesh castShadow position={[-hullLength * 0.36, 1.68, 0]}>
            <cylinderGeometry args={[0.034, 0.04, 1.9, 6]} />
            <meshStandardMaterial color="#5b432f" roughness={0.95} />
          </mesh>
          <mesh castShadow position={[-hullLength * 0.26, 2.18, 0.02]}>
            <planeGeometry args={[1.25, 1.02]} />
            <meshStandardMaterial color="#bd4940" side={THREE.DoubleSide} roughness={0.85} />
          </mesh>
          <mesh position={[-hullLength * 0.26, 2.18, 0.026]}>
            <circleGeometry args={[0.17, 12]} />
            <meshBasicMaterial color="#efcd73" />
          </mesh>
        </>
      )}
      {underFire && <group position={[0, 0.28, 0]}><BurningDeck intensity={0.95 + scale * 0.25} delay={fireDelay} /></group>}
    </group>
  );
}

function FireShip({ lane, delay = 0, scale = 1 }: { lane: number; delay?: number; scale?: number }) {
  const ship = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ship.current) return;
    const cycle = ((clock.elapsedTime * 0.078 + delay) % 1 + 1) % 1;
    const approach = smoothstep((cycle - 0.03) / 0.64);
    const retreat = smoothstep((cycle - 0.78) / 0.16);
    const visible = cycle < 0.91;
    const x = -15.3 + approach * 20.6;
    const z = lane + Math.sin(clock.elapsedTime * 2.4 + delay * 9) * 0.065;

    ship.current.visible = visible;
    ship.current.position.set(x, 0.12 + Math.sin(clock.elapsedTime * 2.7 + delay * 6) * 0.035, z);
    ship.current.rotation.y = retreat > 0 ? Math.PI * retreat : 0;
    ship.current.rotation.z = Math.sin(clock.elapsedTime * 3.2 + delay * 4) * 0.025;
  });

  return (
    <group ref={ship} scale={scale}>
      <Boat position={[0, 0, 0]} color="#9e5a36" scale={0.78} variant="warship" underFire fireDelay={delay} />
      <pointLight color="#ff9d42" intensity={1.45} distance={5.2} position={[0, 1.35, 0]} />
    </group>
  );
}

function FireProjectile({ delay, lane }: { delay: number; lane: number }) {
  const projectile = useRef<THREE.Group>(null);
  const trails = useRef<Array<THREE.Mesh | null>>([]);

  useFrame(({ clock }) => {
    if (!projectile.current) return;
    const cycle = ((clock.elapsedTime * 0.092 + delay) % 1 + 1) % 1;
    const travel = smoothstep((cycle - 0.08) / 0.58);
    const visible = cycle > 0.08 && cycle < 0.74;
    const x = -12.4 + travel * 18.9;
    const y = 0.92 + Math.sin(travel * Math.PI) * 2.7;
    const z = lane + Math.sin(travel * Math.PI * 1.5 + delay * 8) * 0.28;

    projectile.current.visible = visible;
    projectile.current.position.set(x, y, z);
    projectile.current.scale.setScalar(0.78 + Math.sin(clock.elapsedTime * 14 + delay) * 0.1);

    trails.current.forEach((trail, index) => {
      if (!trail) return;
      const behind = THREE.MathUtils.clamp(travel - (index + 1) * 0.055, 0, 1);
      trail.position.set(-12.4 + behind * 18.9, 0.92 + Math.sin(behind * Math.PI) * 2.7, lane);
      trail.scale.setScalar(0.86 - index * 0.12);
      trail.visible = visible && travel > (index + 1) * 0.055;
    });
  });

  return (
    <group>
      {[0, 1, 2].map((index) => (
        <mesh key={index} ref={(node) => { trails.current[index] = node; }}>
          <sphereGeometry args={[0.15, 6, 5]} />
          <meshBasicMaterial color={index === 0 ? "#ffb64b" : "#df6531"} transparent opacity={0.72 - index * 0.15} />
        </mesh>
      ))}
      <group ref={projectile}>
        <mesh>
          <icosahedronGeometry args={[0.3, 1]} />
          <meshStandardMaterial color="#ffcf69" emissive="#f25a22" emissiveIntensity={2.8} roughness={0.65} flatShading />
        </mesh>
        <pointLight color="#ff9e45" intensity={1.65} distance={4.8} />
      </group>
    </group>
  );
}

function ImpactBurst({ position, delay = 0, scale = 1 }: { position: Vector3Tuple; delay?: number; scale?: number }) {
  const flame = useRef<THREE.Group>(null);
  const smoke = useRef<THREE.Group>(null);
  const splash = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime + delay;
    const pulse = 0.82 + Math.abs(Math.sin(time * 3.5)) * 0.32;

    if (flame.current) {
      flame.current.scale.setScalar(pulse * scale);
      flame.current.rotation.y = time * 0.28;
    }

    if (splash.current) {
      const ring = 0.9 + ((time * 0.58) % 1) * 0.68;
      splash.current.scale.setScalar(ring * scale);
      (splash.current.material as THREE.MeshBasicMaterial).opacity = 0.26 - ((time * 0.58) % 1) * 0.18;
    }

    if (smoke.current) {
      smoke.current.children.forEach((particle, index) => {
        const rise = (time * 0.16 + index * 0.31) % 1;
        particle.position.set(
          Math.sin(time * 0.9 + index) * (0.16 + rise * 0.18),
          0.78 + rise * 1.65,
          Math.cos(time * 0.76 + index) * (0.13 + rise * 0.14),
        );
        particle.scale.setScalar(0.36 + rise * 0.9);
      });
    }
  });

  return (
    <group position={position}>
      <mesh ref={splash} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.055, 0]}>
        <ringGeometry args={[0.26, 0.44, 16]} />
        <meshBasicMaterial color="#d5eff0" transparent opacity={0.24} side={THREE.DoubleSide} />
      </mesh>
      <group ref={flame} position={[0, 0.38, 0]}>
        <mesh castShadow position={[-0.12, 0.22, 0]} rotation={[0, 0.24, -0.11]}>
          <coneGeometry args={[0.2, 0.78, 5]} />
          <meshStandardMaterial color="#ff9f32" emissive="#e65122" emissiveIntensity={2.4} roughness={0.72} />
        </mesh>
        <mesh castShadow position={[0.14, 0.3, -0.08]} rotation={[0, -0.18, 0.09]}>
          <coneGeometry args={[0.17, 0.94, 5]} />
          <meshStandardMaterial color="#ffd36a" emissive="#f47926" emissiveIntensity={2.8} roughness={0.67} />
        </mesh>
      </group>
      <group ref={smoke}>
        {[0, 1, 2, 3].map((index) => (
          <mesh key={index} castShadow>
            <dodecahedronGeometry args={[0.2, 0]} />
            <meshStandardMaterial color="#50565d" transparent opacity={0.44} roughness={1} flatShading />
          </mesh>
        ))}
      </group>
      <pointLight color="#ff9540" intensity={1.45 * scale} distance={4.7} position={[0, 1.05, 0]} />
    </group>
  );
}

function WeiFleet({ underFire }: { underFire: boolean }) {
  return (
    <group>
      <Boat position={[6.05, 0.12, 0.7]} color="#a83f3b" rotation={0.04} scale={1.05} variant="flagship" underFire={underFire} fireDelay={0.1} />
      <Boat position={[9.55, 0.1, 1.92]} color="#bd5142" rotation={0.1} scale={1.02} variant="warship" underFire={underFire} fireDelay={0.48} />
      <Boat position={[9.1, 0.1, -1.52]} color="#b9473f" rotation={-0.08} scale={1.04} variant="warship" underFire={underFire} fireDelay={0.82} />
      <Boat position={[12.6, 0.1, 0.15]} color="#b54b42" rotation={0.07} scale={0.94} variant="warship" underFire={underFire} fireDelay={1.78} />
      <group position={[6.05, 0.48, 0.7]}>
        <mesh castShadow position={[-1.82, 0, 0.54]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.032, 0.032, 2.2, 5]} />
          <meshStandardMaterial color="#725345" roughness={0.96} />
        </mesh>
        <mesh castShadow position={[-1.54, 0, -0.83]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.032, 0.032, 2.05, 5]} />
          <meshStandardMaterial color="#725345" roughness={0.96} />
        </mesh>
      </group>
      {underFire && (
        <>
          <ImpactBurst position={[4.8, 0.09, 1.3]} delay={0.1} scale={1.28} />
          <ImpactBurst position={[6.15, 0.09, 0.7]} delay={0.7} scale={1.54} />
          <ImpactBurst position={[8.55, 0.09, -1.24]} delay={1.2} scale={1.16} />
        </>
      )}
    </group>
  );
}

function FireAttackSequence() {
  return (
    <group>
      <FireShip lane={0.92} delay={0} scale={1.08} />
      <FireShip lane={-0.52} delay={0.26} scale={1} />
      <FireShip lane={-1.72} delay={0.52} scale={0.92} />
      <FireProjectile lane={0.72} delay={0.12} />
      <FireProjectile lane={-0.18} delay={0.42} />
      <FireProjectile lane={1.22} delay={0.71} />
    </group>
  );
}

function GunFlash({
  position,
  delay = 0,
  scale = 1,
  cadence = 2.1,
}: {
  position: Vector3Tuple;
  delay?: number;
  scale?: number;
  cadence?: number;
}) {
  const flash = useRef<THREE.Mesh>(null);
  const smoke = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime + delay;
    const cycle = (time % cadence) / cadence;
    const blast = cycle < 0.16 ? 1 - cycle / 0.16 : 0;
    const smokeRise = Math.min(1, cycle / 0.92);

    if (flash.current) {
      flash.current.scale.setScalar((0.18 + blast * 1.3) * scale);
      (flash.current.material as THREE.MeshBasicMaterial).opacity = blast * 0.92;
    }
    if (light.current) light.current.intensity = blast * 4.4 * scale;
    if (smoke.current) {
      smoke.current.children.forEach((particle, index) => {
        const spread = 0.12 + smokeRise * 0.34;
        particle.position.set(
          Math.sin(time * 0.8 + index * 1.7) * spread,
          0.36 + smokeRise * (0.7 + index * 0.13),
          Math.cos(time * 0.7 + index * 1.3) * spread,
        );
        particle.scale.setScalar((0.16 + smokeRise * 0.58) * scale);
        (particle as THREE.Mesh).visible = cycle < 0.92;
      });
    }
  });

  return (
    <group position={position}>
      <mesh ref={flash} position={[0, 0.38, 0]} rotation={[0.2, 0.2, 0]}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshBasicMaterial color="#ffd98a" transparent opacity={0} />
      </mesh>
      <group ref={smoke}>
        {[0, 1, 2, 3].map((index) => (
          <mesh key={index} castShadow>
            <dodecahedronGeometry args={[0.32, 0]} />
            <meshStandardMaterial color="#596067" transparent opacity={0.44} roughness={1} flatShading />
          </mesh>
        ))}
      </group>
      <pointLight ref={light} color="#ffc46d" distance={5.6} intensity={0} position={[0, 0.62, 0]} />
    </group>
  );
}

function RainCurtain() {
  const drops = useRef<THREE.Group>(null);
  const dropLayout = useMemo(
    () =>
      Array.from({ length: 52 }, (_, index) => ({
        x: ((index * 37) % 31) - 15.5,
        z: ((index * 19) % 23) - 11.5,
        offset: (index * 0.19) % 1,
      })),
    [],
  );

  useFrame(({ clock }) => {
    if (!drops.current) return;
    drops.current.children.forEach((drop, index) => {
      const layout = dropLayout[index];
      const fall = (clock.elapsedTime * 1.9 + layout.offset) % 1;
      drop.position.set(layout.x, 5.8 - fall * 7.2, layout.z);
    });
  });

  return (
    <group ref={drops}>
      {dropLayout.map((layout, index) => (
        <mesh key={index} position={[layout.x, 0, layout.z]} rotation={[0.24, 0, 0.14]}>
          <boxGeometry args={[0.018, 0.62 + (index % 3) * 0.1, 0.018]} />
          <meshBasicMaterial color="#c6d9e0" transparent opacity={0.34} />
        </mesh>
      ))}
    </group>
  );
}

function WaterlooBattleSequence({
  action,
  eventId,
}: {
  action: Exclude<WorldActionCue, "fire-attack">;
  eventId?: string;
}) {
  if (action === "rain-field") {
    return <RainCurtain />;
  }

  if (action === "artillery-barrage") {
    // The flash is mounted on the real French gun models in WaterlooScenery.
    return null;
  }

  if (action === "farm-assault") {
    const isHougoumont = eventId === "hougoumont-holds";
    return (
      <group>
        {isHougoumont ? (
          <>
            <GunFlash position={[-2.75, 0.14, 4.24]} delay={0.2} scale={0.28} cadence={1.15} />
            <GunFlash position={[-0.78, 0.14, 5.12]} delay={0.72} scale={0.22} cadence={1.3} />
          </>
        ) : (
          <>
            <GunFlash position={[0.55, 0.14, 0.24]} delay={0.22} scale={0.28} cadence={1.18} />
            <GunFlash position={[1.52, 0.14, 0.48]} delay={0.68} scale={0.22} cadence={1.32} />
          </>
        )}
      </group>
    );
  }

  if (action === "cavalry-charge") {
    return (
      <group>
        <GunFlash position={[-2.7, 0.12, 2.05]} delay={0.2} scale={0.18} cadence={1.1} />
        <GunFlash position={[1.55, 0.12, 2.66]} delay={0.74} scale={0.18} cadence={1.35} />
      </group>
    );
  }

  if (action === "reinforcement-arrival") {
    // Blücher and the modeled vanguard move through the actual eastern route.
    return null;
  }

  if (action === "final-assault") {
    return (
      <group>
        <GunFlash position={[-2.48, 0.12, 1.92]} delay={0.12} scale={0.25} cadence={1.35} />
        <GunFlash position={[2.42, 0.12, 3.02]} delay={0.59} scale={0.24} cadence={1.48} />
      </group>
    );
  }

  // Withdrawal deliberately has no continuing fire effect.
  return null;
}

function Mountain({ position, scale = 1, color = "#78988a" }: { position: Vector3Tuple; scale?: number; color?: string }) {
  return (
    <mesh castShadow receiveShadow position={position} scale={scale} rotation={[0.15, 0.35, -0.1]}>
      <dodecahedronGeometry args={[1.15, 0]} />
      <meshStandardMaterial color={color} roughness={1} flatShading />
    </mesh>
  );
}

function Campfire({ position }: { position: Vector3Tuple }) {
  const flame = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (flame.current) {
      flame.current.scale.y = 0.86 + Math.sin(clock.elapsedTime * 8) * 0.12;
    }
  });

  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.18, 0.04, 5, 8]} />
        <meshStandardMaterial color="#66594a" roughness={1} />
      </mesh>
      <mesh ref={flame} position={[0, 0.18, 0]}>
        <coneGeometry args={[0.13, 0.38, 5]} />
        <meshStandardMaterial color="#f5a63c" emissive="#d26c1f" emissiveIntensity={0.35} />
      </mesh>
      <pointLight color="#ffb54b" intensity={0.55} distance={3} position={[0, 0.55, 0]} />
    </group>
  );
}

function UnitFormation({ color, trim }: { color: string; trim: string }) {
  const ranks: readonly [number, number][] = [
    [-0.26, -0.3], [0.26, -0.3],
    [-0.26, 0.02], [0.26, 0.02],
    [-0.26, 0.34], [0.26, 0.34],
  ];

  return (
    <group position={[0, 0.02, 0]}>
      {ranks.map(([x, z], index) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <mesh castShadow position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.085, 0.105, 0.36, 5]} />
            <meshStandardMaterial color={color} roughness={0.86} flatShading />
          </mesh>
          <mesh castShadow position={[0, 0.56, 0]}>
            <sphereGeometry args={[0.078, 7, 5]} />
            <meshStandardMaterial color="#d9ad88" roughness={0.92} flatShading />
          </mesh>
          <mesh castShadow position={[0.075, 0.42, -0.13]} rotation={[Math.PI / 2, 0, 0.12]}>
            <cylinderGeometry args={[0.014, 0.014, 0.62, 5]} />
            <meshStandardMaterial color="#635346" roughness={0.95} />
          </mesh>
          {index < 2 && (
            <mesh castShadow position={[0, 0.685, 0]} scale={[1.08, 0.38, 1.08]}>
              <sphereGeometry args={[0.09, 7, 5]} />
              <meshStandardMaterial color={trim} roughness={0.86} flatShading />
            </mesh>
          )}
        </group>
      ))}
      <mesh castShadow position={[-0.42, 0.76, 0.46]}>
        <cylinderGeometry args={[0.018, 0.018, 1.48, 5]} />
        <meshStandardMaterial color="#6b543e" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[-0.28, 1.17, 0.46]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.42, 0.28]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.84} />
      </mesh>
    </group>
  );
}

function AgentMarker({
  agent,
  position,
  navigationObstacles,
  selected,
  message,
  recipientName,
  factionColor,
  onSelect,
}: {
  agent: AgentRuntimeState;
  position: Vector3Tuple;
  navigationObstacles: readonly SceneObstacle[];
  selected: boolean;
  message?: AgentMessage;
  recipientName?: string;
  factionColor?: string;
  onSelect: (agentId: string) => void;
}) {
  const [targetX, targetY, targetZ] = position;
  const group = useRef<THREE.Group>(null);
  const figure = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const motion = useRef({
    current: new THREE.Vector3(targetX, targetY, targetZ),
    source: new THREE.Vector3(targetX, targetY, targetZ),
    target: new THREE.Vector3(targetX, targetY, targetZ),
    destination: new THREE.Vector3(targetX, targetY, targetZ),
    path: [] as THREE.Vector3[],
    nextPathIndex: 0,
    elapsed: 1,
    duration: 1,
    isMoving: false,
  });
  const travelDirection = useMemo(() => new THREE.Vector3(), []);
  const color = factionColor ?? factionColors[agent.factionId] ?? factionColors.neutral;
  const trim = factionTrimColors[agent.factionId] ?? factionTrimColors.neutral;
  const skin = skinTones[stableVariant(agent.id, skinTones.length)];
  const hair = hairColors[stableVariant(`${agent.id}-hair`, hairColors.length)];
  const bodyClearance = agent.renderKind === "unit" ? 0.7 : 0.3;

  useEffect(() => {
    const animation = motion.current;
    const safeTarget = makeAgentPositionSafe(
      [targetX, targetY, targetZ],
      navigationObstacles,
      agent.id,
      bodyClearance,
    );
    const next = new THREE.Vector3(safeTarget[0], safeTarget[1], safeTarget[2]);

    if (animation.destination.distanceToSquared(next) < 0.0001) return;

    animation.destination.copy(next);
    animation.path = obstacleAwarePath(
      animation.current,
      next,
      navigationObstacles,
      agent.id,
      bodyClearance,
    );
    animation.nextPathIndex = 0;
    startNextMotionSegment(animation);
  }, [agent.id, bodyClearance, navigationObstacles, targetX, targetY, targetZ]);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const animation = motion.current;

    if (animation.isMoving && animation.elapsed < animation.duration) {
      animation.elapsed = Math.min(animation.duration, animation.elapsed + delta);
      const progress = smoothstep(animation.elapsed / animation.duration);
      animation.current.lerpVectors(animation.source, animation.target, progress);
      animation.isMoving = animation.elapsed < animation.duration;
    } else {
      animation.current.copy(animation.target);
      startNextMotionSegment(animation);
    }

    // A free idle patrol looks lively in an empty field, but it can send a
    // person through a wall or into another character in dense worlds. Agents
    // now move only along the intentional, obstacle-aware route above.
    const isWalking = animation.isMoving;
    const step = Math.sin(clock.elapsedTime * (isWalking ? 4.35 : 1.25) + targetX * 0.75);
    const rest = Math.sin(clock.elapsedTime * 1.15 + targetZ) * 0.015;

    group.current.position.set(
      animation.current.x,
      animation.current.y + 0.045,
      animation.current.z,
    );

    if (animation.isMoving) {
      travelDirection.subVectors(animation.target, animation.current);
      if (travelDirection.lengthSq() > 0.0001) {
        const facing = Math.atan2(travelDirection.x, travelDirection.z);
        group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, facing, 9, delta);
      }
    } else {
      const idleFacing = Math.sin(clock.elapsedTime * 0.42 + targetX) * 0.035;
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, idleFacing, 2, delta);
    }

    if (figure.current) {
      figure.current.position.y = rest + (isWalking ? Math.abs(step) * 0.045 : 0);
      figure.current.rotation.z = isWalking ? step * 0.055 : 0;
    }

    if (head.current) {
      const talkingMotion = message ? Math.sin(clock.elapsedTime * 7.8 + targetX) * 0.09 : 0;
      head.current.rotation.y = talkingMotion;
      head.current.position.y = message ? Math.abs(Math.sin(clock.elapsedTime * 7.8)) * 0.012 : 0;
    }

    if (mouth.current) {
      const mouthOpen = message ? 0.65 + Math.abs(Math.sin(clock.elapsedTime * 10.5)) * 1.3 : 1;
      mouth.current.scale.y = mouthOpen;
    }

    const limbSwing = isWalking ? step * 0.52 : step * 0.045;
    if (leftArm.current) leftArm.current.rotation.x = -limbSwing;
    if (rightArm.current) rightArm.current.rotation.x = limbSwing;
    if (leftLeg.current) leftLeg.current.rotation.x = limbSwing;
    if (rightLeg.current) rightLeg.current.rotation.x = -limbSwing;
  });

  const select = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(agent.id);
  };

  return (
    <group ref={group} position={position} onClick={select}>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <ringGeometry args={[0.33, 0.41, 32]} />
          <meshBasicMaterial color="#f2c75c" transparent opacity={0.93} side={THREE.DoubleSide} />
        </mesh>
      )}
      {agent.renderKind === "unit" ? (
        <UnitFormation color={color} trim={trim} />
      ) : (
      <group ref={figure}>
        <mesh castShadow position={[0, 0.72, -0.155]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.36, 0.48, 0.05]} />
          <meshStandardMaterial color={trim} roughness={0.94} />
        </mesh>

        <group ref={leftLeg} position={[-0.105, 0.45, 0]}>
          <mesh castShadow position={[0, -0.14, 0]}>
            <boxGeometry args={[0.13, 0.31, 0.15]} />
            <meshStandardMaterial color="#3d4650" roughness={0.92} />
          </mesh>
          <mesh castShadow position={[0, -0.31, 0.035]}>
            <boxGeometry args={[0.145, 0.085, 0.2]} />
            <meshStandardMaterial color="#292f37" roughness={0.95} />
          </mesh>
        </group>
        <group ref={rightLeg} position={[0.105, 0.45, 0]}>
          <mesh castShadow position={[0, -0.14, 0]}>
            <boxGeometry args={[0.13, 0.31, 0.15]} />
            <meshStandardMaterial color="#3d4650" roughness={0.92} />
          </mesh>
          <mesh castShadow position={[0, -0.31, 0.035]}>
            <boxGeometry args={[0.145, 0.085, 0.2]} />
            <meshStandardMaterial color="#292f37" roughness={0.95} />
          </mesh>
        </group>

        <mesh castShadow position={[0, 0.68, 0]}>
          <cylinderGeometry args={[0.205, 0.275, 0.53, 5]} />
          <meshStandardMaterial color={color} roughness={0.82} flatShading />
        </mesh>
        <mesh castShadow position={[0, 0.49, 0]}>
          <cylinderGeometry args={[0.282, 0.282, 0.045, 5]} />
          <meshStandardMaterial color={trim} roughness={0.87} />
        </mesh>
        <mesh castShadow position={[0, 0.83, 0.14]}>
          <boxGeometry args={[0.12, 0.12, 0.028]} />
          <meshStandardMaterial color="#e6c36f" roughness={0.75} metalness={0.05} />
        </mesh>

        <group ref={leftArm} position={[-0.245, 0.79, 0]} rotation={[0, 0, 0.1]}>
          <mesh castShadow position={[0, -0.15, 0]}>
            <cylinderGeometry args={[0.056, 0.067, 0.37, 5]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
          <mesh castShadow position={[0, -0.36, 0.02]}>
            <sphereGeometry args={[0.062, 7, 5]} />
            <meshStandardMaterial color={skin} roughness={0.92} flatShading />
          </mesh>
        </group>
        <group ref={rightArm} position={[0.245, 0.79, 0]} rotation={[0, 0, -0.1]}>
          <mesh castShadow position={[0, -0.15, 0]}>
            <cylinderGeometry args={[0.056, 0.067, 0.37, 5]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
          <mesh castShadow position={[0, -0.36, 0.02]}>
            <sphereGeometry args={[0.062, 7, 5]} />
            <meshStandardMaterial color={skin} roughness={0.92} flatShading />
          </mesh>
        </group>

        <group ref={head}>
          <mesh castShadow position={[0, 1.01, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.1, 6]} />
            <meshStandardMaterial color={skin} roughness={0.9} />
          </mesh>
          <mesh castShadow position={[0, 1.14, 0]}>
            <sphereGeometry args={[0.168, 10, 8]} />
            <meshStandardMaterial color={skin} roughness={0.9} flatShading />
          </mesh>
          <mesh castShadow position={[0, 1.255, -0.012]} scale={[1.04, 0.42, 1.04]}>
            <sphereGeometry args={[0.171, 9, 6]} />
            <meshStandardMaterial color={hair} roughness={0.94} flatShading />
          </mesh>
          <mesh position={[-0.055, 1.145, 0.146]}>
            <sphereGeometry args={[0.019, 5, 4]} />
            <meshStandardMaterial color="#27313a" roughness={0.88} />
          </mesh>
          <mesh position={[0.055, 1.145, 0.146]}>
            <sphereGeometry args={[0.019, 5, 4]} />
            <meshStandardMaterial color="#27313a" roughness={0.88} />
          </mesh>
          <mesh ref={mouth} position={[0, 1.075, 0.157]}>
            <boxGeometry args={[0.058, 0.014, 0.012]} />
            <meshStandardMaterial color="#a15d52" roughness={0.9} />
          </mesh>

          <Headwear role={agent.role} color={color} trim={trim} />
        </group>
        <RoleAccessory role={agent.role} color={color} trim={trim} />
      </group>
      )}
      {message && (
        <Html position={[0, 2.42, 0]} center distanceFactor={10.5} style={{ pointerEvents: "none" }}>
          <div className="agent-speech is-speaking" aria-hidden="true">
            <span>{message.text}</span>
            {recipientName && <small>to {recipientName}</small>}
          </div>
        </Html>
      )}
      <Html position={[0, 1.72, 0]} center distanceFactor={11} style={{ pointerEvents: "none" }}>
        <div className={`agent-label${selected ? " is-selected" : ""}`}>
          <span className="agent-label-dot" style={{ background: color }} />
          {agent.name}
        </div>
      </Html>
    </group>
  );
}

function FollowCamera({ target, enabled }: { target: Vector3Tuple; enabled: boolean }) {
  const { camera } = useThree();
  const desired = useMemo(() => new THREE.Vector3(), []);
  const lookingAt = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!enabled) return;
    desired.set(target[0] + 9.2, target[1] + 8.6, target[2] + 10.8);
    lookingAt.set(target[0], target[1] + 0.3, target[2]);
    camera.position.lerp(desired, 0.018);
    camera.lookAt(lookingAt);
  });

  return null;
}

function Hedgerow({
  position,
  length,
  rotation = 0,
}: {
  position: Vector3Tuple;
  length: number;
  rotation?: number;
}) {
  const shrubCount = Math.max(3, Math.round(length * 1.35));

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.12, 0]}>
        <boxGeometry args={[length, 0.22, 0.23]} />
        <meshStandardMaterial color="#506b3c" roughness={1} />
      </mesh>
      {Array.from({ length: shrubCount }, (_, index) => {
        const progress = shrubCount === 1 ? 0 : index / (shrubCount - 1);
        const x = (progress - 0.5) * length;
        const height = 0.28 + (index % 3) * 0.045;
        return (
          <mesh key={index} castShadow position={[x, 0.25 + height * 0.5, index % 2 ? 0.035 : -0.035]}>
            <sphereGeometry args={[0.22 + (index % 2) * 0.035, 6, 5]} />
            <meshStandardMaterial color={index % 2 ? "#667f45" : "#58743f"} roughness={0.97} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

function MudRoad({
  position,
  length,
  width = 1.45,
  rotation = 0,
}: {
  position: Vector3Tuple;
  length: number;
  width?: number;
  rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.105, 0]}>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color="#766650" roughness={1} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[-width * 0.22, -0.1, 0]}>
        <planeGeometry args={[0.13, length * 0.94]} />
        <meshStandardMaterial color="#5f5547" roughness={1} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[width * 0.22, -0.1, 0]}>
        <planeGeometry args={[0.13, length * 0.94]} />
        <meshStandardMaterial color="#5f5547" roughness={1} />
      </mesh>
    </group>
  );
}

function WaterlooFarmstead({
  position,
  scale = 1,
  roof = "#57463d",
  wall = "#a88e72",
}: {
  position: Vector3Tuple;
  scale?: number;
  roof?: string;
  wall?: string;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow receiveShadow position={[0, 0.44, 0]}>
        <boxGeometry args={[2.35, 0.86, 1.35]} />
        <meshStandardMaterial color={wall} roughness={0.98} />
      </mesh>
      <mesh castShadow position={[0, 1.12, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.42, 0.55, 0.84]}>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial color={roof} roughness={0.93} flatShading />
      </mesh>
      <mesh castShadow position={[-0.84, 0.47, 0.69]}>
        <boxGeometry args={[0.42, 0.6, 0.045]} />
        <meshStandardMaterial color="#453b34" roughness={0.95} />
      </mesh>
      {[-0.5, 0.32, 0.85].map((x) => (
        <mesh key={x} position={[x, 0.58, 0.695]}>
          <boxGeometry args={[0.21, 0.23, 0.035]} />
          <meshStandardMaterial color="#d2d7cf" roughness={0.8} />
        </mesh>
      ))}
      <mesh castShadow position={[-1.5, 0.2, 0.65]}>
        <boxGeometry args={[0.23, 0.4, 3.05]} />
        <meshStandardMaterial color="#87735f" roughness={1} />
      </mesh>
      <mesh castShadow position={[1.5, 0.2, 0.65]}>
        <boxGeometry args={[0.23, 0.4, 3.05]} />
        <meshStandardMaterial color="#87735f" roughness={1} />
      </mesh>
      <mesh castShadow position={[0, 0.2, 2.08]}>
        <boxGeometry args={[3.2, 0.4, 0.23]} />
        <meshStandardMaterial color="#87735f" roughness={1} />
      </mesh>
    </group>
  );
}

function FieldGun({
  position,
  rotation = 0,
  color = "#303a3b",
  firing = false,
  firingDelay = 0,
}: {
  position: Vector3Tuple;
  rotation?: number;
  color?: string;
  firing?: boolean;
  firingDelay?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow position={[0, 0.32, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.12, 1.22, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.35} />
      </mesh>
      <mesh castShadow position={[0, 0.21, 0.32]}>
        <boxGeometry args={[0.42, 0.18, 0.64]} />
        <meshStandardMaterial color="#795a3e" roughness={0.94} />
      </mesh>
      {[-0.33, 0.33].map((x) => (
        <mesh key={x} castShadow position={[x, 0.2, 0.37]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.23, 0.23, 0.09, 10]} />
          <meshStandardMaterial color="#493d35" roughness={0.98} />
        </mesh>
      ))}
      {firing && <GunFlash position={[0, 0.28, -0.78]} delay={firingDelay} scale={0.58} cadence={2.55} />}
    </group>
  );
}

function WaterlooScenery({
  weather,
  activeAction,
}: {
  weather: WeatherState;
  activeAction?: Exclude<WorldActionCue, "fire-attack">;
}) {
  const rainy = weather.condition === "rain" || weather.condition === "storm";
  const skyColor = rainy ? "#87939c" : "#aeb9a2";
  const sunPosition: Vector3Tuple = rainy ? [-10, 6, 4] : [-11, 10, 6];

  return (
    <>
      <Sky distance={450000} sunPosition={sunPosition} turbidity={rainy ? 15 : 9} rayleigh={rainy ? 0.45 : 0.86} mieCoefficient={0.009} mieDirectionalG={0.79} />
      <fog attach="fog" args={[skyColor, 19, 46]} />
      <hemisphereLight args={["#d6dce0", "#3e4b32", 1.85]} />
      <directionalLight castShadow position={sunPosition} intensity={rainy ? 1.45 : 2.05} color={rainy ? "#d8e1e7" : "#fff0cb"} shadow-mapSize-width={1536} shadow-mapSize-height={1536} shadow-bias={-0.00018} />
      <directionalLight position={[11, 7, -10]} intensity={0.42} color="#a7bed1" />

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
        <planeGeometry args={[46, 32]} />
        <meshStandardMaterial color={rainy ? "#61754b" : "#73895b"} roughness={1} />
      </mesh>
      <mesh receiveShadow position={[-0.4, -1.52, 6.3]} scale={[13.8, 1.55, 3.7]}>
        <sphereGeometry args={[1, 16, 8]} />
        <meshStandardMaterial color={rainy ? "#5d734c" : "#708957"} roughness={1} flatShading />
      </mesh>
      <mesh receiveShadow position={[6.8, -1.45, -4.7]} scale={[8.2, 1.35, 3.6]}>
        <sphereGeometry args={[1, 14, 8]} />
        <meshStandardMaterial color="#5c7049" roughness={1} flatShading />
      </mesh>

      <MudRoad position={[5.2, -0.1, -0.9]} length={23} width={1.55} rotation={0.56} />
      <MudRoad position={[-2.1, -0.1, 3.85]} length={10.8} width={1.1} rotation={1.24} />
      <TerrainPatch position={[-5.6, -0.13, -2.1]} scale={[5.5, 3.3, 1]} color="#7e8750" rotation={0.12} />
      <TerrainPatch position={[5.8, -0.13, 3.1]} scale={[5.8, 3.1, 1]} color="#8d9357" rotation={-0.18} />
      <TerrainPatch position={[-10.2, -0.13, 5.4]} scale={[4.8, 2.6, 1]} color="#77884f" rotation={0.22} />

      <WaterlooFarmstead position={[1.2, 0, 0.2]} scale={1.02} wall="#a99679" />
      <WaterlooFarmstead position={[-0.7, 0, 5.5]} scale={1.18} wall="#917c64" roof="#493b35" />
      <WaterlooFarmstead position={[7.2, 0, -4.55]} scale={0.86} wall="#aa9478" roof="#625046" />
      <Tent position={[-8.2, 0.02, -1.7]} color="#6d8190" rotation={0.22} scale={1.04} />
      <Tent position={[-6.25, 0.02, -3.85]} color="#627687" rotation={-0.27} scale={0.88} />
      <Tent position={[1.35, 0.02, 4.85]} color="#9e845d" rotation={-0.32} scale={0.9} />
      <Tent position={[3.55, 0.02, 4.65]} color="#a58c66" rotation={0.2} scale={0.78} />
      <FieldGun position={[-6.1, 0.02, -2.15]} rotation={0.6} color="#313b47" firing={activeAction === "artillery-barrage"} firingDelay={0.1} />
      <FieldGun position={[-4.45, 0.02, -1.25]} rotation={0.5} color="#313b47" firing={activeAction === "artillery-barrage"} firingDelay={1.22} />
      <FieldGun position={[2.15, 0.02, 4.1]} rotation={-2.48} color="#40484b" />
      <FieldGun position={[3.7, 0.02, 3.78]} rotation={-2.6} color="#40484b" />

      <Hedgerow position={[-2.4, 0, -1.9]} length={5.2} rotation={0.42} />
      <Hedgerow position={[2.5, 0, 2.45]} length={5.8} rotation={-0.26} />
      <Hedgerow position={[-7.6, 0, 0.15]} length={5.2} rotation={1.25} />
      <Hedgerow position={[5.1, 0, 1.55]} length={6.3} rotation={0.5} />
      <Hedgerow position={[-1.9, 0, 7.55]} length={10.8} rotation={0.08} />

      {([
        [-14.6, 0, 6.8], [-13.2, 0, 4.3], [-11.9, 0, 7.9], [-10.5, 0, 5.7], [-9.2, 0, 8.7],
        [-6.9, 0, 8.5], [-4.8, 0, 9.1], [1.8, 0, 8.9], [4.7, 0, 8.0], [7.1, 0, 8.8],
        [10.2, 0, 7.5], [13.1, 0, 8.9], [15.1, 0, 6.5], [-15.2, 0, -6.2], [-12.8, 0, -8.0],
        [-10.7, 0, -7.1], [-7.7, 0, -8.9], [-4.9, 0, -7.6], [10.7, 0, -7.9], [13.2, 0, -8.6],
        [15.5, 0, -6.6], [11.9, 0, 1.2], [13.8, 0, 2.8],
      ] as Vector3Tuple[]).map((position, index) => (
        <Tree key={`waterloo-tree-${position[0]}-${position[2]}`} position={position} scale={0.86 + (index % 4) * 0.13} />
      ))}

      {([
        [-15.5, 2.2, -10.4], [-10.6, 2.5, -11.5], [-5.3, 2.2, -11.1], [4.8, 2.5, -11.8],
        [11.2, 2.7, -10.7], [16.2, 2.3, -9.2], [-15, 2.3, 11.2], [-8, 2.1, 12.1],
        [8.7, 2.3, 12.4], [15.4, 2.2, 10.4],
      ] as Vector3Tuple[]).map((position, index) => (
        <Mountain key={`waterloo-horizon-${index}`} position={position} scale={3.5 + (index % 3) * 0.65} color={index % 2 ? "#6e805e" : "#637653"} />
      ))}
      <ContactShadows position={[0, -0.115, 0]} opacity={0.36} scale={44} blur={2.5} far={10} color="#35402d" />
    </>
  );
}

function sceneLocationPosition(
  locations: readonly ScenarioLocation[],
  ids: readonly string[],
  fallback: Vector3Tuple,
): Vector3Tuple {
  const location = locations.find((candidate) => ids.includes(candidate.id));
  return location
    ? [location.position.x, location.position.y, location.position.z]
    : fallback;
}

function offsetPosition(origin: Vector3Tuple, x: number, y: number, z: number): Vector3Tuple {
  return [origin[0] + x, origin[1] + y, origin[2] + z];
}

function routeLength(from: Vector3Tuple, to: Vector3Tuple) {
  return Math.max(1, Math.hypot(to[0] - from[0], to[2] - from[2]));
}

function routeRotation(from: Vector3Tuple, to: Vector3Tuple) {
  // Roads, canals, and bridge decks are authored along their local Z axis.
  return Math.atan2(to[0] - from[0], to[2] - from[2]);
}

function routeMidpoint(from: Vector3Tuple, to: Vector3Tuple): Vector3Tuple {
  return [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
}

/** A compact two-storey shop-house used to suggest Surabaya's dense city fabric. */
function SurabayaShophouse({
  position,
  scale = 1,
  rotation = 0,
  wall = "#b58c65",
  awning = "#a44e42",
}: {
  position: Vector3Tuple;
  scale?: number;
  rotation?: number;
  wall?: string;
  awning?: string;
}) {
  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      <mesh receiveShadow position={[0, 0.06, 0]}>
        <boxGeometry args={[2.34, 0.12, 1.45]} />
        <meshStandardMaterial color="#6a5140" roughness={1} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 1.04, 0]}>
        <boxGeometry args={[2.12, 1.92, 1.28]} />
        <meshStandardMaterial color={wall} roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, 2.15, 0]} scale={[1.26, 0.48, 0.82]}>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial color="#6f4f43" roughness={0.94} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.57, 0.655]}>
        <boxGeometry args={[1.82, 0.27, 0.23]} />
        <meshStandardMaterial color={awning} roughness={0.86} />
      </mesh>
      <mesh castShadow position={[0, 0.52, 0.652]}>
        <boxGeometry args={[0.43, 0.86, 0.035]} />
        <meshStandardMaterial color="#513c31" roughness={0.96} />
      </mesh>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 1.36, 0.653]}>
          <boxGeometry args={[0.35, 0.36, 0.032]} />
          <meshStandardMaterial color="#d9d6ba" roughness={0.82} />
        </mesh>
      ))}
      {[-0.65, 0.65].map((x) => (
        <mesh key={`post-${x}`} castShadow position={[x, 0.43, 0.76]}>
          <cylinderGeometry args={[0.035, 0.035, 0.94, 5]} />
          <meshStandardMaterial color="#694b35" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function KampungHouse({
  position,
  scale = 1,
  rotation = 0,
  wall = "#ad9068",
}: {
  position: Vector3Tuple;
  scale?: number;
  rotation?: number;
  wall?: string;
}) {
  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      <mesh receiveShadow position={[0, 0.055, 0]}>
        <boxGeometry args={[1.7, 0.11, 1.38]} />
        <meshStandardMaterial color="#765945" roughness={1} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.65, 0]}>
        <boxGeometry args={[1.56, 1.15, 1.25]} />
        <meshStandardMaterial color={wall} roughness={0.98} />
      </mesh>
      <mesh castShadow position={[0, 1.43, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.16, 0.53, 0.9]}>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial color="#7a5140" roughness={0.96} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.42, 0.635]}>
        <boxGeometry args={[0.34, 0.68, 0.032]} />
        <meshStandardMaterial color="#5d4335" roughness={0.96} />
      </mesh>
      <mesh position={[-0.48, 0.8, 0.638]}>
        <boxGeometry args={[0.28, 0.23, 0.025]} />
        <meshStandardMaterial color="#d6d4b5" roughness={0.84} />
      </mesh>
    </group>
  );
}

function PortWarehouse({ position, rotation = 0, scale = 1 }: { position: Vector3Tuple; rotation?: number; scale?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh receiveShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[3.85, 0.16, 2.16]} />
        <meshStandardMaterial color="#655445" roughness={1} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 1.12, 0]}>
        <boxGeometry args={[3.62, 2.02, 1.98]} />
        <meshStandardMaterial color="#a47b58" roughness={0.96} />
      </mesh>
      <mesh castShadow position={[0, 2.24, 0]} scale={[2.06, 0.54, 1.17]}>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial color="#5c504b" roughness={0.86} flatShading />
      </mesh>
      {[-1.15, 0, 1.15].map((x) => (
        <mesh key={x} castShadow position={[x, 0.57, 1.005]}>
          <boxGeometry args={[0.52, 0.96, 0.04]} />
          <meshStandardMaterial color="#554036" roughness={0.96} />
        </mesh>
      ))}
      {[-1.3, 1.3].map((x) => (
        <mesh key={`crate-${x}`} castShadow position={[x, 0.26, 1.36]}>
          <boxGeometry args={[0.47, 0.46, 0.45]} />
          <meshStandardMaterial color="#8a613f" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function CityRoad({
  position,
  length,
  width = 1.65,
  rotation = 0,
}: {
  position: Vector3Tuple;
  length: number;
  width?: number;
  rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh receiveShadow position={[0, -0.106, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color="#6d675f" roughness={0.98} />
      </mesh>
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} receiveShadow position={[x * width, -0.099, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.028, length * 0.94]} />
          <meshStandardMaterial color="#b8a77c" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function KaliMasCanal({
  position,
  length,
  width = 2.65,
  rotation = 0,
}: {
  position: Vector3Tuple;
  length: number;
  width?: number;
  rotation?: number;
}) {
  const ripples = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ripples.current) return;
    ripples.current.children.forEach((ripple, index) => {
      const travel = ((clock.elapsedTime * 0.48 + index * 1.8) % (length + 2)) - length / 2 - 1;
      ripple.position.z = travel;
      ripple.scale.x = 0.62 + Math.sin(clock.elapsedTime * 1.8 + index) * 0.14;
    });
  });

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh receiveShadow position={[0, -0.115, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color="#3c7d91" roughness={0.34} metalness={0.16} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (width / 2 + 0.2), 0, 0]}>
          <mesh receiveShadow position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.36, length + 0.6]} />
            <meshStandardMaterial color="#8d8067" roughness={1} />
          </mesh>
          {Array.from({ length: Math.max(4, Math.floor(length / 2.7)) }, (_, index) => (
            <mesh key={index} castShadow position={[side * 0.12, 0.11, -length / 2 + 1.05 + index * 2.55]}>
              <boxGeometry args={[0.22, 0.24, 0.58]} />
              <meshStandardMaterial color="#756550" roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
      <group ref={ripples} position={[0, -0.08, 0]}>
        {Array.from({ length: 7 }, (_, index) => (
          <mesh key={index} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[width * 0.5, 0.022]} />
            <meshBasicMaterial color="#d4eeec" transparent opacity={0.16} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function RedBridge({ position, rotation = 0 }: { position: Vector3Tuple; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.34, 0]}>
        <boxGeometry args={[3.2, 0.24, 1.28]} />
        <meshStandardMaterial color="#a94c3d" roughness={0.82} metalness={0.13} />
      </mesh>
      {[-1.26, 1.26].map((x) => (
        <mesh key={x} castShadow position={[x, 0.66, 0]}>
          <boxGeometry args={[0.13, 0.67, 1.46]} />
          <meshStandardMaterial color="#833a33" roughness={0.88} />
        </mesh>
      ))}
      {[-0.44, 0.44].map((z) => (
        <mesh key={z} castShadow position={[0, 1.06, z]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 2.55, 6]} />
          <meshStandardMaterial color="#833a33" roughness={0.9} />
        </mesh>
      ))}
      {[-0.44, 0.44].flatMap((z) => [-1.1, 0, 1.1].map((x) => [x, z] as const)).map(([x, z]) => (
        <mesh key={`${x}-${z}`} castShadow position={[x, 0.82, z]}>
          <cylinderGeometry args={[0.045, 0.045, 0.55, 6]} />
          <meshStandardMaterial color="#833a33" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function RadioStation({ position, rotation = 0 }: { position: Vector3Tuple; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <SurabayaShophouse position={[0, 0, 0]} scale={0.9} wall="#b99a71" awning="#4d7681" />
      <mesh castShadow position={[0.72, 3.06, -0.15]}>
        <cylinderGeometry args={[0.045, 0.055, 3.2, 6]} />
        <meshStandardMaterial color="#4a4d4c" roughness={0.72} metalness={0.2} />
      </mesh>
      {[-0.47, 0.47].map((x) => (
        <mesh key={x} castShadow position={[0.72 + x * 0.36, 2.2, -0.15]} rotation={[0, 0, x * 0.57]}>
          <cylinderGeometry args={[0.018, 0.018, 1.5, 5]} />
          <meshStandardMaterial color="#59605e" roughness={0.86} />
        </mesh>
      ))}
      <mesh castShadow position={[-0.2, 0.65, 0.82]}>
        <boxGeometry args={[0.65, 0.3, 0.1]} />
        <meshStandardMaterial color="#e0d3a7" roughness={0.88} />
      </mesh>
    </group>
  );
}

function ReliefPost({ position }: { position: Vector3Tuple }) {
  return (
    <group position={position}>
      <Tent position={[0, 0, 0]} color="#dfd5be" rotation={0.08} scale={0.96} />
      <mesh castShadow position={[0, 1.16, 0.9]}>
        <boxGeometry args={[0.35, 0.35, 0.04]} />
        <meshStandardMaterial color="#f4f0df" roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.16, 0.925]}>
        <boxGeometry args={[0.22, 0.055, 0.012]} />
        <meshBasicMaterial color="#bd5753" />
      </mesh>
      <mesh position={[0, 1.16, 0.932]}>
        <boxGeometry args={[0.055, 0.22, 0.012]} />
        <meshBasicMaterial color="#bd5753" />
      </mesh>
      {[-0.84, 0.86].map((x) => (
        <mesh key={x} castShadow position={[x, 0.23, 0.52]}>
          <boxGeometry args={[0.45, 0.42, 0.42]} />
          <meshStandardMaterial color="#987048" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function PalmTree({ position, scale = 1 }: { position: Vector3Tuple; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 1.4, 0]} rotation={[0.1, 0, -0.08]}>
        <cylinderGeometry args={[0.12, 0.2, 2.8, 7]} />
        <meshStandardMaterial color="#75543a" roughness={0.96} />
      </mesh>
      {Array.from({ length: 7 }, (_, index) => {
        const rotation = (index / 7) * Math.PI * 2;
        return (
          <mesh key={index} castShadow position={[Math.cos(rotation) * 0.42, 2.9, Math.sin(rotation) * 0.42]} rotation={[0.22, -rotation, 0.55]}>
            <coneGeometry args={[0.28, 1.56, 4]} />
            <meshStandardMaterial color={index % 2 ? "#397257" : "#4d805e"} roughness={1} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

function RadioSignal({ position }: { position: Vector3Tuple }) {
  const signal = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!signal.current) return;
    signal.current.children.forEach((ring, index) => {
      const pulse = (clock.elapsedTime * 0.72 + index * 0.34) % 1;
      ring.scale.setScalar(0.72 + pulse * 0.76);
      const material = (ring as THREE.Mesh).material as THREE.MeshBasicMaterial;
      material.opacity = (1 - pulse) * 0.3;
    });
  });

  return (
    <group ref={signal} position={offsetPosition(position, 0.72, 4.38, -0.15)} rotation={[Math.PI / 2, 0, 0]}>
      {[0, 1, 2].map((index) => (
        <mesh key={index} rotation={[0, 0, (index - 1) * 0.18]}>
          <torusGeometry args={[0.65 + index * 0.37, 0.025, 5, 20, Math.PI * 1.2]} />
          <meshBasicMaterial color="#f0ce76" transparent opacity={0.26} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function AidRouteMarkers({
  from,
  to,
  count = 7,
}: {
  from: Vector3Tuple;
  to: Vector3Tuple;
  count?: number;
}) {
  const markers = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!markers.current) return;
    markers.current.children.forEach((marker, index) => {
      const pulse = 0.7 + Math.sin(clock.elapsedTime * 2.25 - index * 0.52) * 0.18;
      marker.scale.setScalar(pulse);
      (marker as THREE.Mesh).position.y = 0.08 + Math.max(0, Math.sin(clock.elapsedTime * 2.25 - index * 0.52)) * 0.13;
    });
  });

  return (
    <group ref={markers}>
      {Array.from({ length: count }, (_, index) => {
        const progress = (index + 1) / (count + 1);
        return (
          <mesh
            key={index}
            position={[
              THREE.MathUtils.lerp(from[0], to[0], progress),
              0.08,
              THREE.MathUtils.lerp(from[2], to[2], progress),
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.1, 0.19, 16]} />
            <meshBasicMaterial color="#e9c86b" transparent opacity={0.72} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}

/** A once-per-event distant impact: flash first, then a short rising plume. */
function FiniteUrbanBurst({
  position,
  delay = 0,
  scale = 1,
}: {
  position: Vector3Tuple;
  delay?: number;
  scale?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const flash = useRef<THREE.Mesh>(null);
  const smoke = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const startedAt = useRef<number | null>(null);

  useFrame(({ clock }) => {
    if (startedAt.current === null) startedAt.current = clock.elapsedTime;
    const elapsed = clock.elapsedTime - startedAt.current - delay;
    const visible = elapsed >= 0 && elapsed < 5.4;

    if (group.current) group.current.visible = visible;
    if (!visible) return;

    const flashStrength = THREE.MathUtils.clamp(1 - elapsed / 0.2, 0, 1);
    const smokeProgress = THREE.MathUtils.clamp(elapsed / 5.2, 0, 1);

    if (flash.current) {
      flash.current.scale.setScalar((0.22 + flashStrength * 1.05) * scale);
      (flash.current.material as THREE.MeshBasicMaterial).opacity = flashStrength * 0.84;
    }
    if (light.current) light.current.intensity = flashStrength * 3.2 * scale;
    if (smoke.current) {
      smoke.current.children.forEach((particle, index) => {
        const spread = (0.1 + smokeProgress * 0.52) * scale;
        const drift = Math.sin(elapsed * 0.62 + index * 1.9) * 0.08 * scale;
        particle.position.set(
          Math.cos(index * 1.74) * spread + drift,
          0.3 + smokeProgress * (1.35 + index * 0.1) * scale,
          Math.sin(index * 1.51) * spread,
        );
        particle.scale.setScalar((0.2 + smokeProgress * 0.72) * scale);
        (particle as THREE.Mesh).visible = smokeProgress < 0.98;
      });
    }
  });

  return (
    <group ref={group} position={position}>
      <mesh ref={flash} position={[0, 0.34, 0]} rotation={[0.2, 0.2, 0]}>
        <octahedronGeometry args={[0.45, 0]} />
        <meshBasicMaterial color="#ffd38a" transparent opacity={0} />
      </mesh>
      <group ref={smoke}>
        {[0, 1, 2, 3].map((index) => (
          <mesh key={index} castShadow>
            <dodecahedronGeometry args={[0.27, 0]} />
            <meshStandardMaterial color="#596067" transparent opacity={0.4} roughness={1} flatShading />
          </mesh>
        ))}
      </group>
      <pointLight ref={light} color="#ffc46d" distance={4.2} intensity={0} position={[0, 0.6, 0]} />
    </group>
  );
}

/**
 * A small, readable street obstacle for the Surabaya escalation. It grounds
 * the action in interrupted movement and contested routes rather than making
 * the city look like a continuous explosion effect.
 */
function StreetBarricade({
  position,
  rotation = 0,
  accent = "#8a6b4d",
}: {
  position: Vector3Tuple;
  rotation?: number;
  accent?: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-0.56, -0.19, 0.19, 0.56].map((x, index) => (
        <mesh key={`sandbag-${x}`} castShadow receiveShadow position={[x, 0.16 + (index % 2) * 0.035, 0]} scale={[1, 0.72, 1.18]}>
          <dodecahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial color={index % 2 ? "#8f8064" : "#9b8b6c"} roughness={1} flatShading />
        </mesh>
      ))}
      <mesh castShadow receiveShadow position={[0, 0.42, 0.03]} rotation={[0.08, 0, -0.1]}>
        <boxGeometry args={[1.55, 0.13, 0.18]} />
        <meshStandardMaterial color="#6a513d" roughness={0.96} />
      </mesh>
      <mesh castShadow position={[-0.34, 0.58, 0.05]} rotation={[0, 0.16, -0.42]}>
        <boxGeometry args={[0.1, 0.96, 0.1]} />
        <meshStandardMaterial color="#6a513d" roughness={0.96} />
      </mesh>
      <mesh castShadow position={[0.34, 0.55, 0.05]} rotation={[0, -0.12, 0.37]}>
        <boxGeometry args={[0.1, 0.88, 0.1]} />
        <meshStandardMaterial color="#6a513d" roughness={0.96} />
      </mesh>
      <mesh castShadow position={[0, 0.66, 0.03]} rotation={[0.08, 0, -0.04]}>
        <boxGeometry args={[1.2, 0.09, 0.12]} />
        <meshStandardMaterial color={accent} roughness={0.94} />
      </mesh>
    </group>
  );
}

function UrbanBattleSequence({
  bridge,
  internatio,
  hospital,
  wonokromo,
}: {
  bridge: Vector3Tuple;
  internatio: Vector3Tuple;
  hospital: Vector3Tuple;
  wonokromo: Vector3Tuple;
}) {
  return (
    <group>
      {/* The sequence lasts only once per event: road blockages, three distant
          impacts, and a marked aid route make the consequences legible without
          turning the city into a continuous combat loop. */}
      <StreetBarricade position={offsetPosition(bridge, -1.34, 0, -0.44)} rotation={0.24} accent="#8c5b42" />
      <StreetBarricade position={offsetPosition(bridge, 1.48, 0, 0.58)} rotation={-0.2} accent="#667a68" />
      <FiniteUrbanBurst position={offsetPosition(bridge, -0.72, 0.06, -0.28)} delay={0.38} scale={0.76} />
      <FiniteUrbanBurst position={offsetPosition(bridge, 1.18, 0.08, 0.92)} delay={2.7} scale={0.66} />
      <FiniteUrbanBurst position={offsetPosition(internatio, 1.1, 0.08, -0.72)} delay={5.2} scale={0.58} />
      <AidRouteMarkers from={hospital} to={wonokromo} count={5} />
    </group>
  );
}

function CeasefireMarker({ position }: { position: Vector3Tuple }) {
  const flag = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (flag.current) flag.current.rotation.y = Math.sin(clock.elapsedTime * 1.2) * 0.14;
  });

  return (
    <group position={offsetPosition(position, 0, 1.2, -0.65)}>
      <mesh castShadow position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 1.5, 5]} />
        <meshStandardMaterial color="#59493d" roughness={0.95} />
      </mesh>
      <mesh ref={flag} position={[0.26, 1.2, 0]}>
        <planeGeometry args={[0.5, 0.3]} />
        <meshStandardMaterial color="#f0eee2" side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
    </group>
  );
}

function SurabayaScenery({
  weather,
  locations,
}: {
  weather: WeatherState;
  locations: readonly ScenarioLocation[];
}) {
  const wet = weather.condition === "rain" || weather.condition === "storm";
  const skyColor = wet ? "#899ba0" : "#b6c5c0";
  const sunPosition: Vector3Tuple = wet ? [-9, 7, 6] : [-11, 11, 5];
  const port = sceneLocationPosition(locations, ["tanjung-perak-port", "tanjung-perak"], [7, 0, -6]);
  const bridge = sceneLocationPosition(locations, ["red-bridge", "jembatan-merah"], [0, 0, 0]);
  const internatio = sceneLocationPosition(locations, ["gedung-internatio", "kalimas-warehouses", "kalimas-warehouse"], [1.6, 0, 1.5]);
  const radio = sceneLocationPosition(locations, ["radio-studio", "radio-station"], [-5.7, 0, 2.4]);
  const kampung = sceneLocationPosition(locations, ["kampung-shelter", "kampung-refuge"], [-7.5, 0, 5.2]);
  const tkrCommand = sceneLocationPosition(locations, ["tkr-command", "southern-perimeter", "south-perimeter"], [-4.8, 0, -2.6]);
  const hospital = sceneLocationPosition(locations, ["hospital-relief-corridor", "aid-post"], [-1.7, 0, -4.3]);
  const wonokromo = sceneLocationPosition(locations, ["wonokromo-evacuation-route", "south-evacuation-road"], [-9.8, 0, -7.2]);
  const offshore = sceneLocationPosition(locations, ["offshore-command", "offshore-command-post"], [11, 0, -8]);
  const canalCenter = routeMidpoint(bridge, internatio);
  const canalLength = routeLength(bridge, internatio) + 2.6;
  const canalRotation = routeRotation(bridge, internatio);

  return (
    <>
      <Sky distance={450000} sunPosition={sunPosition} turbidity={wet ? 13 : 8} rayleigh={wet ? 0.55 : 0.9} mieCoefficient={0.009} mieDirectionalG={0.78} />
      <fog attach="fog" args={[skyColor, 19, 47]} />
      <hemisphereLight args={["#d9e1dc", "#4b594a", 1.95]} />
      <directionalLight castShadow position={sunPosition} intensity={wet ? 1.6 : 2.15} color={wet ? "#e1e8e5" : "#fff0ca"} shadow-mapSize-width={1536} shadow-mapSize-height={1536} shadow-bias={-0.00016} />
      <directionalLight position={[12, 7, -11]} intensity={0.33} color="#a9c5d2" />

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
        <planeGeometry args={[46, 32]} />
        <meshStandardMaterial color={wet ? "#718070" : "#879175"} roughness={1} />
      </mesh>
      <TerrainPatch position={[-12.2, -0.13, 4.7]} scale={[6.8, 4.8, 1]} color={wet ? "#627658" : "#75875d"} rotation={0.18} />
      <TerrainPatch position={[10.2, -0.13, 5.2]} scale={[6.5, 4.4, 1]} color="#788b65" rotation={-0.22} />
      <TerrainPatch position={[13.3, -0.13, -7.1]} scale={[4.5, 3.3, 1]} color="#74845f" rotation={0.1} />

      <KaliMasCanal position={canalCenter} length={canalLength} rotation={canalRotation} />
      {/* A separate harbour basin keeps the docks, warehouses, and water in one readable block. */}
      <KaliMasCanal position={offsetPosition(port, 0, 0, -3.1)} length={8.8} width={5} />
      <CityRoad position={routeMidpoint(port, bridge)} length={routeLength(port, bridge) + 1.3} width={2.05} rotation={routeRotation(port, bridge)} />
      <CityRoad position={routeMidpoint(bridge, radio)} length={routeLength(bridge, radio) + 0.7} width={1.55} rotation={routeRotation(bridge, radio)} />
      <CityRoad position={routeMidpoint(bridge, wonokromo)} length={routeLength(bridge, wonokromo) + 1.3} width={1.65} rotation={routeRotation(bridge, wonokromo)} />
      <CityRoad position={routeMidpoint(hospital, wonokromo)} length={routeLength(hospital, wonokromo) + 0.5} width={1.35} rotation={routeRotation(hospital, wonokromo)} />

      <RedBridge position={bridge} rotation={canalRotation} />
      <PortWarehouse position={offsetPosition(port, -2.8, 0, 0.55)} rotation={-0.18} scale={0.95} />
      <PortWarehouse position={offsetPosition(port, 2.7, 0, 0.55)} rotation={0.12} scale={0.88} />
      <Dock position={offsetPosition(port, 0.05, 0.09, -1.65)} rotation={0.06} length={4.35} />
      <Dock position={offsetPosition(internatio, -1.35, 0.09, -0.72)} rotation={canalRotation + Math.PI / 2} length={2.7} />
      <Boat position={offsetPosition(port, 1.18, 0.1, -3.45)} color="#bd9a58" rotation={0.08} scale={0.76} variant="skiff" />
      <Boat position={offsetPosition(offshore, -0.58, 0.1, 0.78)} color="#6d7d84" rotation={-0.1} scale={0.75} variant="warship" />

      <SurabayaShophouse position={offsetPosition(bridge, -3.45, 0, 2.18)} rotation={0.12} wall="#b48a62" awning="#a94a3e" />
      <SurabayaShophouse position={offsetPosition(bridge, 3.8, 0, -2.4)} rotation={-0.2} wall="#c09b70" awning="#466d78" />
      <SurabayaShophouse position={offsetPosition(internatio, -1.55, 0, 1.75)} rotation={0.35} scale={1.12} wall="#c0a17b" awning="#59756f" />
      <RadioStation position={radio} rotation={0.2} />
      <ReliefPost position={hospital} />
      <Tent position={offsetPosition(tkrCommand, -1.48, 0.02, 0.32)} color="#b19d78" rotation={-0.24} scale={0.78} />
      <Tent position={offsetPosition(tkrCommand, 1.52, 0.02, -0.78)} color="#7d8971" rotation={0.18} scale={0.7} />

      {([
        [-2.1, 0, -0.8], [0, 0, -2], [2, 0, -0.7], [-1, 0, 1.25], [1.2, 0, 1.25],
      ] as Vector3Tuple[]).map((offset, index) => (
        <KampungHouse key={`kampung-house-${index}`} position={offsetPosition(kampung, offset[0], offset[1], offset[2])} rotation={index * 0.73} scale={0.9 + (index % 2) * 0.08} wall={index % 2 ? "#b29068" : "#9f8565"} />
      ))}
      {([
        [-13.8, 0, 8.1], [-11.2, 0, 8.8], [-9.5, 0, 9.5], [-7, 0, 9], [-4.2, 0, 9.7],
        [0.8, 0, 9.1], [4.1, 0, 8.9], [7.8, 0, 9.7], [11.8, 0, 8.6], [14.4, 0, 7.2],
        [-15.2, 0, -7.7], [-12.1, 0, -9.1], [14.9, 0, -9.2], [16.2, 0, -5.8],
      ] as Vector3Tuple[]).map((position, index) => (
        <PalmTree key={`surabaya-palm-${index}`} position={position} scale={0.82 + (index % 3) * 0.12} />
      ))}
      <ContactShadows position={[0, -0.115, 0]} opacity={0.31} scale={45} blur={2.8} far={10} color="#475044" />
    </>
  );
}

function SurabayaSceneSequence({
  action,
  locations,
}: {
  action: Exclude<WorldActionCue, "fire-attack">;
  locations: readonly ScenarioLocation[];
}) {
  const bridge = sceneLocationPosition(locations, ["red-bridge", "jembatan-merah"], [0, 0, 0]);
  const radio = sceneLocationPosition(locations, ["radio-studio", "radio-station"], [-5.7, 0, 2.4]);
  const hospital = sceneLocationPosition(locations, ["hospital-relief-corridor", "aid-post"], [-1.7, 0, -4.3]);
  const wonokromo = sceneLocationPosition(locations, ["wonokromo-evacuation-route", "south-evacuation-road"], [-9.8, 0, -7.2]);
  const internatio = sceneLocationPosition(locations, ["gedung-internatio", "kalimas-warehouses", "kalimas-warehouse"], [1.6, 0, 1.5]);

  if (action === "radio-broadcast") return <RadioSignal position={radio} />;
  if (action === "ceasefire") return <CeasefireMarker position={bridge} />;
  if (action === "aid-corridor" || action === "withdrawal") return <AidRouteMarkers from={hospital} to={wonokromo} />;
  if (action === "urban-assault") {
    return <UrbanBattleSequence bridge={bridge} internatio={internatio} hospital={hospital} wonokromo={wonokromo} />;
  }

  return null;
}

function Scenery({ weather, fireAttackActive }: { weather: WeatherState; fireAttackActive: boolean }) {
  const skyColor = weather.condition === "clear" ? "#a9cedd" : "#aabfc6";
  const sunPosition: Vector3Tuple = weather.condition === "clear" ? [-12, 11, 6] : [-8, 7, 5];

  return (
    <>
      <Sky distance={450000} sunPosition={sunPosition} turbidity={weather.condition === "clear" ? 7 : 11} rayleigh={weather.condition === "clear" ? 1.05 : 0.72} mieCoefficient={0.007} mieDirectionalG={0.78} />
      <fog attach="fog" args={[skyColor, 21, 52]} />
      <hemisphereLight args={["#d8edee", "#4e6249", 2.15]} />
      <directionalLight castShadow position={sunPosition} intensity={2.35} color="#fff0ca" shadow-mapSize-width={1536} shadow-mapSize-height={1536} shadow-bias={-0.00015} />
      <directionalLight position={[12, 8, -12]} intensity={0.34} color="#a7d0e2" />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]}>
        <planeGeometry args={[44, 30]} />
        <meshStandardMaterial color="#778d68" roughness={1} />
      </mesh>

      <TerrainPatch position={[-9.6, -0.125, 5.1]} scale={[6.8, 3.1, 1]} color="#6f855d" rotation={0.12} />
      <TerrainPatch position={[1.1, -0.124, 6.4]} scale={[8.2, 2.8, 1]} color="#829569" rotation={-0.08} />
      <TerrainPatch position={[10.4, -0.125, -5.6]} scale={[6.4, 3.8, 1]} color="#687c5b" rotation={0.14} />
      <TerrainPatch position={[-6.4, -0.124, -5.2]} scale={[5.4, 3.1, 1]} color="#7e8b5f" rotation={-0.17} />

      <RiverSurface underFire={fireAttackActive} />
      <RiverBank side={1} />
      <RiverBank side={-1} />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0.025]} position={[-5.6, -0.112, 4.22]}>
        <planeGeometry args={[13.8, 0.54]} />
        <meshStandardMaterial color="#a88d62" roughness={1} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, -0.08]} position={[5.7, -0.112, -4.38]}>
        <planeGeometry args={[14.2, 0.56]} />
        <meshStandardMaterial color="#a68a60" roughness={1} />
      </mesh>
      <Bridge position={[0.45, 0, 0]} length={6.35} />

      <Tent position={[-7.35, 0.02, 3.84]} color="#d2b980" rotation={0.35} scale={1.08} />
      <Tent position={[-5.38, 0.02, 4.26]} color="#e0c990" rotation={-0.2} scale={0.94} />
      <Tent position={[-6.22, 0.02, 5.05]} color="#d2b980" rotation={0.1} scale={0.88} />
      <Tent position={[-8.58, 0.02, 4.95]} color="#c9ae77" rotation={-0.35} scale={0.8} />
      <Campfire position={[-6.45, 0.1, 4.82]} />
      <Dock position={[-4.9, 0.12, 2.98]} length={3.35} />

      <Tent position={[-5.6, 0.02, -4.3]} color="#d7c08b" rotation={-0.4} scale={0.94} />
      <Tent position={[-2.1, 0.02, -4.85]} color="#cbb078" rotation={0.32} scale={0.78} />
      <Tent position={[-4.55, 0.02, -5.7]} color="#d4ba84" rotation={0.18} scale={0.72} />
      <Campfire position={[-3.5, 0.1, -5.28]} />

      <VillageHouse position={[-3.45, 0.02, 5.72]} scale={0.95} rotation={0.18} />
      <VillageHouse position={[-0.62, 0.02, 5.85]} scale={0.9} rotation={-0.28} wall="#b89568" />
      <VillageHouse position={[2.2, 0.02, 5.22]} scale={0.82} rotation={0.12} wall="#d0af78" />
      <VillageHouse position={[0.42, 0.02, 7.48]} scale={0.73} rotation={0.34} wall="#bc9466" />
      <VillageHouse position={[4.45, 0.02, 6.95]} scale={0.71} rotation={-0.16} wall="#c7a16d" />
      <VillageHouse position={[-5.8, 0.02, 7.55]} scale={0.7} rotation={-0.08} wall="#c39c69" />
      <Dock position={[5.2, 0.12, 2.96]} length={3.45} />

      <Boat position={[-8.65, 0.12, 1.4]} color="#d29b45" rotation={0.06} scale={0.98} variant="warship" />
      <Boat position={[-4.2, 0.12, -1.35]} color="#c8893f" rotation={-0.08} scale={0.94} variant="warship" />
      <Boat position={[-10.7, 0.12, -0.3]} color="#b67f39" rotation={0.05} scale={0.84} variant="skiff" />
      <WeiFleet underFire={fireAttackActive} />

      {([
        [-15.4, 0.08, 2.64], [-12.8, 0.08, 2.74], [-10.1, 0.08, 2.61], [-7.5, 0.08, 2.74],
        [-4.7, 0.08, 2.63], [-1.8, 0.08, 2.7], [1.1, 0.08, 2.61], [4.1, 0.08, 2.75],
        [7.25, 0.08, 2.65], [10.2, 0.08, 2.73], [13.2, 0.08, 2.64], [15.7, 0.08, 2.72],
        [-14.6, 0.08, -2.65], [-11.6, 0.08, -2.72], [-8.65, 0.08, -2.63], [-5.7, 0.08, -2.74],
        [-2.65, 0.08, -2.66], [0.2, 0.08, -2.7], [3.15, 0.08, -2.62], [6.2, 0.08, -2.73],
        [9.1, 0.08, -2.64], [12.25, 0.08, -2.72], [15.25, 0.08, -2.63],
      ] as Vector3Tuple[]).map((position, index) => (
        <Rock key={`bank-rock-${position[0]}-${position[2]}`} position={position} scale={0.42 + (index % 3) * 0.13} color={index % 2 ? "#839078" : "#78856f"} />
      ))}
      {([
        [-13.5, 0.1, 3.02], [-10.9, 0.1, 2.98], [-8.1, 0.1, 3.05], [-5.4, 0.1, 3.02],
        [-2.4, 0.1, 2.97], [1.7, 0.1, 3.04], [4.65, 0.1, 3.02], [7.8, 0.1, 2.98],
        [11.2, 0.1, 3.04], [14.1, 0.1, 2.98], [-12.3, 0.1, -3.03], [-9.4, 0.1, -2.99],
        [-6.5, 0.1, -3.04], [-3.4, 0.1, -2.98], [1.4, 0.1, -3.05], [4.6, 0.1, -3],
        [8.1, 0.1, -3.04], [11.5, 0.1, -3.0],
      ] as Vector3Tuple[]).map((position, index) => (
        <ReedCluster key={`reed-${position[0]}-${position[2]}`} position={position} scale={0.88 + (index % 2) * 0.22} rotation={index * 0.43} />
      ))}

      <Mountain position={[-15.5, 2.8, -10.7]} scale={4.8} color="#718a7e" />
      <Mountain position={[-10.4, 2.35, -11.8]} scale={3.9} color="#7d9588" />
      <Mountain position={[12.4, 3.15, -10.6]} scale={5.2} color="#6f887b" />
      <Mountain position={[16.2, 2.5, -8.6]} scale={4.1} color="#799184" />
      <Mountain position={[-14.4, 2.35, 11.9]} scale={4.2} color="#819a89" />
      <Mountain position={[-7.3, 2.1, 12.8]} scale={3.5} color="#8ba18e" />
      <Mountain position={[10.8, 2.4, 12.4]} scale={4.3} color="#7b9486" />
      <Mountain position={[16.4, 2.15, 9.8]} scale={3.7} color="#839988" />

      {([
        [-15.8, 0, 5.1], [-14.1, 0, 6.75], [-12.4, 0, 7.2], [-10.8, 0, 6.0], [-9.5, 0, 7.8],
        [-8.4, 0, 8.8], [-6.8, 0, 7.5], [-5.1, 0, 8.65], [-3.8, 0, 9.4], [5.7, 0, 8.2],
        [7.4, 0, 7.0], [9.2, 0, 8.65], [10.8, 0, 7.4], [12.6, 0, 8.9], [14.5, 0, 6.9],
        [16.1, 0, 8.4], [-15.1, 0, -6.5], [-13.6, 0, -8.2], [-11.7, 0, -7.4], [-9.8, 0, -9.1],
        [-7.5, 0, -8.4], [-5.8, 0, -7.2], [6.1, 0, -7.7], [7.9, 0, -9.0], [9.7, 0, -8.1],
        [11.6, 0, -9.4], [13.3, 0, -7.7], [15.2, 0, -8.8],
      ] as Vector3Tuple[]).map((position, index) => (
        <Tree key={`${position[0]}-${position[2]}`} position={position} scale={0.72 + (index % 4) * 0.13} />
      ))}

      <ContactShadows position={[0, -0.115, 0]} opacity={0.3} scale={42} blur={2.8} far={10} color="#4d5d50" />
    </>
  );
}

function SceneContent({
  agents,
  locations,
  factions,
  sceneTheme,
  selectedAgentId,
  weather,
  followSelected,
  speechBubbles = [],
  activeEvent,
  onSelectAgent,
}: WorldSceneProps) {
  const navigationObstacles = useMemo(
    () => sceneObstacles(sceneTheme, locations),
    [locations, sceneTheme],
  );
  const agentSlots = useMemo(() => {
    const byLocation = new Map<string, AgentRuntimeState[]>();
    agents.forEach((agent) => {
      if (agent.renderVisible === false) return;
      const group = byLocation.get(agent.currentLocationId) ?? [];
      group.push(agent);
      byLocation.set(agent.currentLocationId, group);
    });

    const slots = new Map<string, AgentSlot>();
    byLocation.forEach((group) => {
      group.forEach((agent, index) => slots.set(agent.id, { index, count: group.length }));
    });
    return slots;
  }, [agents]);
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? agents[0];
  const selectedLocation = selectedAgent
    ? locations.find((location) => location.id === selectedAgent.currentLocationId)
    : undefined;
  const target: Vector3Tuple = selectedAgent
    ? markerPositionForAgent(
      sceneTheme,
      selectedAgent,
      selectedLocation,
      agentSlots.get(selectedAgent.id),
      navigationObstacles,
    )
    : [0, 0, 0];
  const messagesBySpeaker = useMemo(
    () => new Map(speechBubbles.slice(0, 2).map((message) => [message.speakerId, message])),
    [speechBubbles],
  );
  const agentNames = useMemo(
    () => new Map(agents.map((agent) => [agent.id, agent.name])),
    [agents],
  );
  const fireAttackActive = sceneTheme === "red-cliffs" && activeEvent?.action === "fire-attack";
  const waterlooAction: Exclude<WorldActionCue, "fire-attack"> | undefined =
    sceneTheme === "waterloo" && activeEvent?.action && activeEvent.action !== "fire-attack"
      ? activeEvent.action
      : undefined;
  const surabayaAction: Exclude<WorldActionCue, "fire-attack"> | undefined =
    sceneTheme === "surabaya" && activeEvent?.action && activeEvent.action !== "fire-attack"
      ? activeEvent.action
      : undefined;

  return (
    <>
      {sceneTheme === "surabaya" ? (
        <SurabayaScenery weather={weather} locations={locations} />
      ) : sceneTheme === "waterloo" ? (
        <WaterlooScenery weather={weather} activeAction={waterlooAction} />
      ) : (
        <Scenery weather={weather} fireAttackActive={fireAttackActive} />
      )}
      {fireAttackActive && <FireAttackSequence key={activeEvent?.id ?? "fire-attack"} />}
      {waterlooAction && (
        <WaterlooBattleSequence
          key={activeEvent?.id ?? waterlooAction}
          action={waterlooAction}
          eventId={activeEvent?.id}
        />
      )}
      {surabayaAction && (
        <SurabayaSceneSequence
          key={activeEvent?.id ?? surabayaAction}
          action={surabayaAction}
          locations={locations}
        />
      )}
      <FollowCamera target={target} enabled={followSelected} />
      {agents.map((agent) => {
        if (agent.renderVisible === false) return null;
        const location = locations.find((candidate) => candidate.id === agent.currentLocationId);
        const position = markerPositionForAgent(
          sceneTheme,
          agent,
          location,
          agentSlots.get(agent.id),
          navigationObstacles,
        );
        return (
          <AgentMarker
            key={agent.id}
            agent={agent}
            position={position}
            navigationObstacles={navigationObstacles}
            selected={agent.id === selectedAgentId}
            message={messagesBySpeaker.get(agent.id)}
            recipientName={messagesBySpeaker.get(agent.id)?.recipientId ? agentNames.get(messagesBySpeaker.get(agent.id)?.recipientId ?? "") : undefined}
            factionColor={factions[agent.factionId]?.color}
            onSelect={onSelectAgent}
          />
        );
      })}
      <OrbitControls enablePan={false} enableDamping dampingFactor={0.09} minDistance={9} maxDistance={34} maxPolarAngle={Math.PI / 2.07} />
    </>
  );
}

export function WorldScene(props: WorldSceneProps) {
  return (
    <Canvas
      className="world-canvas"
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [15.6, 13.4, 20.5], fov: 45 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}
