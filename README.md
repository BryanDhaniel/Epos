# Epos — Living Historical Simulation

Epos is an educational historical-simulation prototype. Instead of presenting a battle as a score to win, it makes logistics, weather, trust, incomplete information, and civilian impact visible as connected systems.

The build includes source-aware simulations of Red Cliffs, the Battle of Waterloo, the Battle of Surabaya, the Siege of Jerusalem (1187), and the Battle of Montgisard (1177). Each uses a deterministic model for repeatability in a classroom, with an optional server-only OpenAI briefing route for contextual questions.

## What is included

- A procedural low-poly Three.js world built with React Three Fiber and Drei
- Orbit, zoom, and follow-selected-agent camera controls
- Typed historical scenario data: agents, memories, limited knowledge, trust, objectives, locations, resources, and timeline events
- A reusable simulation engine with transparent state transitions and replayable what-if modifiers
- Baseline and counterfactual branches for weather, supplies, infrastructure, and reinforcements
- Timeline controls: pause, speed, single step, and jump-to-next historical moment
- Agent inspector with profile, memory/knowledge, trust network, and Web Speech API voice output
- Live caption card with “what happened” and “why it matters” explanations, replayable narration, and source-labeled in-world agent speech bubbles
- Event-triggered browser audio for weather, movement, radio broadcasts, ceasefire moments, aid routes, and restrained battle cues—kept below narration and enabled only after a learner interaction
- A visible delegation plan that makes information handoffs inspectable
- An optional `/api/briefing` route that keeps OpenAI credentials on the server and falls back to an evidence-limited local briefing when no key is set

## Scenario library

Red Cliffs, Waterloo, Surabaya, Jerusalem (1187), and Montgisard (1177) are playable teaching models in this build. The in-app library also surfaces Normandy, Central Asia (1219–1221), and the Roman Danube frontier as historical previews. Previews are intentionally not represented as working simulations until their sources, agent rules, causal model, and world are authored and reviewed.

## Architecture

```text
app/
  page.tsx                       Server entry point
  api/briefing/route.ts          Optional server-only OpenAI boundary
components/epos/
  epos-experience.tsx            Interactive workspace and learning UI
  world-scene.tsx                R3F low-poly world and selectable agents
lib/simulation/
  types.ts                       Framework-free domain types
  red-cliffs.ts                  Structured scenario data and what-if presets
  waterloo.ts                    Structured Waterloo data and what-if presets
  surabaya.ts                    Structured Surabaya data and what-if presets
  jerusalem.ts                   Structured Jerusalem scenario data and presets
  montgisard.ts                  Structured Montgisard scenario data and presets
  engine.ts                      Pure deterministic simulation functions
stores/
  epos-store.ts                  Zustand UI/simulation state
```

The simulation data and engine are deliberately independent of React. Add a new scenario by supplying the same `ScenarioDefinition` shape, then mount it through the store or a future scenario catalog.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Optional OpenAI briefings

The app works without an API key. To enable a contextual server-side model response, create `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.6
```

`OPENAI_MODEL` is configurable because model access depends on the account and environment. The route gives the model only the selected agent’s available knowledge plus current world state; it instructs the model to separate historical anchors, modeled inferences, and speculation. It never exposes the key to the browser.

Codex is useful for authoring and maintaining scenario packs, simulation rules, and evaluation fixtures; it is not presented as an autonomous historical authority in the runtime experience.

## Historical-method note

The Red Cliffs, Waterloo, Surabaya, Jerusalem, and Montgisard timelines include historical anchors alongside explicit inference and speculation labels. The Surabaya model keeps the circumstances of Brigadier Mallaby's death explicitly contested, while the Montgisard model explicitly leaves the exact site, force sizes, losses, and tactical detail open to question. Numerical values, agent dialogue, and counterfactual outcomes are transparent teaching-model inputs—not claims of settled historical fact. Learners should compare the model’s causal chain with primary and secondary sources.

## Verification

```bash
npm run lint
npx tsc --noEmit
npm run build
```
