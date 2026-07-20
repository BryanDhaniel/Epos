import type { ScenarioDefinition, WhatIfModifier } from "./types";

/**
 * A source-aware, civilian-centered interpretation of the Battle of Surabaya.
 *
 * Historical anchors: British-Indian troops arrived through Tanjung Perak on
 * 25 October 1945; a ceasefire was negotiated on 29 October; Brigadier Mallaby
 * died near Jembatan Merah / the Internatio Building on 30 October; an ultimatum
 * preceded the large assault of 10 November; fighting and displacement lasted
 * for weeks. The exact circumstances of Mallaby's death remain contested.
 *
 * Numerical resources, composite characters, dialogue, route capacity, and all
 * counterfactual consequences are explicit educational modeling choices, not
 * claims about an individual's inner thoughts or a settled historical record.
 */
export const SURABAYA_SCENARIO = {
  id: "surabaya-1945",
  title: "Battle of Surabaya",
  subtitle: "A living simulation of communication, diplomacy, civilian safety, and historical uncertainty",
  era: "25 October–November 1945 · Surabaya, Indonesia",
  historicalNote:
    "This scenario treats dates, locations, and the broad sequence of events as historical anchors. It distinguishes evidence from inference, preserves uncertainty around Brigadier Mallaby's death, and models civilian safety, communication, and diplomacy without presenting violence as spectacle.",
  presentation: {
    scene: "surabaya",
    metricLabels: {
      morale: "Public confidence",
      supplies: "Medical and relief capacity",
      mobility: "Safe-route access",
      cohesion: "Negotiation confidence",
    },
    causalThread: {
      title: "Rumour → mistrust → ultimatum → displacement",
      description:
        "Safe-route access is {groundMobility}/100. Track how reports, radio messages, and blocked streets shape whether civilians can reach shelter and care.",
    },
    mission: {
      title: "Trace a communication breakdown",
      description:
        "Compare what different people know, test how a ceasefire message travels, and identify the choices that protect civilians during a city-wide crisis.",
      steps: ["Compare accounts", "Map a safe route", "Test a communication counterfactual"],
    },
    whatIfPromptHint: "Try: What if the ceasefire had a verified communication channel?",
  },
  maxTicks: 8,
  locations: [
    {
      id: "tanjung-perak",
      name: "Tanjung Perak harbour",
      kind: "harbor",
      position: { x: 7, y: 0, z: -6 },
      description:
        "The northern port through which Allied British-Indian forces entered Surabaya in late October 1945.",
    },
    {
      id: "jembatan-merah",
      name: "Jembatan Merah",
      kind: "road",
      position: { x: 0, y: 0, z: 0 },
      description:
        "The Red Bridge area, a vital urban crossing and the area associated with the final movements of Brigadier Mallaby on 30 October.",
    },
    {
      id: "gedung-internatio",
      name: "Internatio Building",
      kind: "fortress",
      position: { x: 1.6, y: 0, z: 1.5 },
      description:
        "A landmark near Jembatan Merah used here to locate the contested events surrounding Mallaby's death without depicting a definitive cause.",
    },
    {
      id: "radio-station",
      name: "Radio station",
      kind: "fortress",
      position: { x: -5.7, y: 0, z: 2.4 },
      description:
        "A modeled broadcasting point representing the radio networks through which news, appeals, and mobilization messages moved across the city.",
    },
    {
      id: "tkr-command",
      name: "Republican defense command post",
      kind: "camp",
      position: { x: -4.8, y: 0, z: -2.6 },
      description:
        "A modeled command post for TKR and local-defense coordination; it does not claim to reproduce one precise historic headquarters.",
    },
    {
      id: "aid-post",
      name: "Civilian aid post",
      kind: "camp",
      position: { x: -1.7, y: 0, z: -4.3 },
      description:
        "A modeled aid point for first aid, family tracing, water, and shelter information amid rapidly changing street conditions.",
    },
    {
      id: "kampung-refuge",
      name: "Kampung refuge",
      kind: "village",
      position: { x: -7.5, y: 0, z: 5.2 },
      description:
        "A modeled neighborhood refuge showing that homes, families, and informal care networks were part of the city-wide crisis.",
    },
    {
      id: "south-evacuation-road",
      name: "Southern evacuation road",
      kind: "road",
      position: { x: -9.8, y: 0, z: -7.2 },
      description:
        "A modeled southbound route used to teach how changing road safety affects evacuation, aid, and family separation.",
    },
  ],
  agents: [
    {
      id: "mallaby",
      name: "A. W. S. Mallaby",
      title: "Brigadier, British Indian Army",
      role: "commander",
      factionId: "wei",
      biography:
        "Brigadier A. W. S. Mallaby commanded the British-Indian brigade in Surabaya. He was killed on 30 October 1945 near Jembatan Merah; the precise circumstances remain contested.",
      personality: { traits: ["direct", "pragmatic", "duty-bound"], leadership: 84, caution: 58, adaptability: 67 },
      currentLocationId: "tanjung-perak",
      initialObjective: "Coordinate the arrival, protect vulnerable groups, and keep communication with the city open.",
      emotionalState: { primary: "wary", intensity: 62 },
      inventory: ["field map", "orders", "liaison notes"],
      trust: { "allied-liaison": 71, "gubernur-suryo": 47, moetopo: 31 },
      initialKnowledge: [
        {
          id: "mallaby-port-briefing",
          statement:
            "The port is an entry point, not a complete picture of conditions in Surabaya; reports from the streets will arrive late and may conflict.",
          confidence: 86,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "mallaby-arrival-memory",
          summary: "Arrival plans depend on local liaison, road access, and messages that can be understood by several groups with different goals.",
          tick: 0,
          importance: 88,
          kind: "conversation",
        },
      ],
    },
    {
      id: "mansergh",
      name: "E. C. Mansergh",
      title: "Major-General, modeled later command role",
      role: "commander",
      factionId: "wei",
      biography:
        "Major-General E. C. Mansergh took command in the escalation after Mallaby's death. His presence in early timeline views is a modeling device so learners can trace the later command decision chain.",
      personality: { traits: ["methodical", "formal", "resolute"], leadership: 81, caution: 68, adaptability: 58 },
      currentLocationId: "tanjung-perak",
      initialObjective: "Assess reports, preserve routes for civilians and personnel, and avoid treating incomplete intelligence as certainty.",
      emotionalState: { primary: "wary", intensity: 54 },
      inventory: ["operational reports", "signal log", "city map"],
      trust: { "allied-liaison": 74, mallaby: 66 },
      initialKnowledge: [
        {
          id: "mansergh-command-boundary",
          statement:
            "This simulation cannot infer intentions from a city-wide crisis; its command choices are modeled from public chronology and must be read alongside other perspectives.",
          confidence: 94,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "mansergh-later-role-memory",
          summary: "The later command role is included to trace how changing leadership and escalating orders alter options in the city.",
          tick: 0,
          importance: 76,
          kind: "observation",
        },
      ],
    },
    {
      id: "allied-liaison",
      name: "Allied liaison officer",
      title: "Composite British-Indian liaison role",
      role: "diplomat",
      factionId: "wei",
      biography:
        "A composite role representing interpreters, officers, and messengers who carried orders and negotiated access. It is not a portrayal of one named historical person.",
      personality: { traits: ["careful", "observant", "procedural"], leadership: 57, caution: 84, adaptability: 76 },
      currentLocationId: "tanjung-perak",
      initialObjective: "Verify each message before relaying it and identify which routes remain safe for dialogue and relief.",
      emotionalState: { primary: "calm", intensity: 55 },
      inventory: ["translated notices", "route sketch", "signal lamp"],
      trust: { mallaby: 72, mansergh: 73, "gubernur-suryo": 45 },
      initialKnowledge: [
        {
          id: "liaison-language-limit",
          statement:
            "A notice can change meaning as it moves between languages, radio broadcasts, rumors, and crowded streets.",
          confidence: 89,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "liaison-port-route-memory",
          summary: "The route from the harbour to the city center depends on checkpoints, road conditions, and local consent.",
          tick: 0,
          importance: 79,
          kind: "observation",
        },
      ],
    },
    {
      id: "allied-field-column",
      name: "Allied field column",
      title: "Composite British-Indian formation",
      role: "soldier",
      renderKind: "unit",
      factionId: "wei",
      biography:
        "A modeled formation representing personnel moving from the harbour during the escalation. It is an educational visual aid, not an attribution to a named regiment or a claim that every unit used this route.",
      personality: { traits: ["disciplined", "cautious", "tired"], leadership: 52, caution: 69, adaptability: 58 },
      currentLocationId: "tanjung-perak",
      initialObjective: "Hold at the harbour until a route is confirmed, then move only with an updated picture of civilian and street conditions.",
      emotionalState: { primary: "wary", intensity: 59 },
      inventory: ["field packs", "route orders", "first-aid supplies"],
      trust: { mansergh: 68, "allied-liaison": 61 },
      initialKnowledge: [
        {
          id: "allied-column-route-limit",
          statement:
            "A formation leaving the harbour can see its immediate road, but cannot know which intersections or homes are safe beyond the reports it receives.",
          confidence: 86,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "allied-column-harbour-memory",
          summary: "The formation is held near the harbour while liaison reports and route conditions remain incomplete.",
          tick: 0,
          importance: 78,
          kind: "observation",
        },
      ],
    },
    {
      id: "bung-tomo",
      name: "Bung Tomo",
      title: "Radio broadcaster and mobilizer",
      role: "messenger",
      factionId: "sun-liu",
      biography:
        "Sutomo, widely known as Bung Tomo, became an influential voice in Surabaya through radio broadcasts during the Indonesian Revolution.",
      personality: { traits: ["persuasive", "energetic", "committed"], leadership: 79, caution: 42, adaptability: 83 },
      currentLocationId: "radio-station",
      initialObjective: "Share urgent information while separating confirmed reports from claims that still need verification.",
      emotionalState: { primary: "resolute", intensity: 81 },
      inventory: ["microphone", "broadcast notes", "listener reports"],
      trust: { "gubernur-suryo": 61, moetopo: 66, "tkr-liaison": 71 },
      initialKnowledge: [
        {
          id: "bung-tomo-radio-reach",
          statement:
            "Radio can connect neighborhoods quickly, but a broadcast cannot guarantee that every listener receives the same detail or can act safely on it.",
          confidence: 86,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "bung-tomo-listener-memory",
          summary: "Listeners send reports of blocked roads, separated families, and conflicting instructions from different parts of the city.",
          tick: 0,
          importance: 82,
          kind: "conversation",
        },
      ],
    },
    {
      id: "gubernur-suryo",
      name: "R. T. A. Suryo",
      title: "Governor of East Java",
      role: "diplomat",
      factionId: "sun-liu",
      biography:
        "R. T. A. Suryo was Governor of East Java during the early Indonesian Revolution and was involved in the political effort to contain escalating conflict in Surabaya.",
      personality: { traits: ["measured", "civic-minded", "persistent"], leadership: 80, caution: 81, adaptability: 71 },
      currentLocationId: "tkr-command",
      initialObjective: "Keep channels for de-escalation open and make civilian safety part of every negotiation.",
      emotionalState: { primary: "wary", intensity: 68 },
      inventory: ["meeting notes", "city notices", "contact list"],
      trust: { "bung-tomo": 59, moetopo: 57, "allied-liaison": 44 },
      initialKnowledge: [
        {
          id: "suryo-deescalation-limit",
          statement:
            "A ceasefire agreement can reduce immediate danger, but it will fail if isolated groups do not receive, trust, or understand the same message.",
          confidence: 92,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "suryo-city-appeal-memory",
          summary: "Civic leaders have to balance political demands with the immediate safety of people moving through contested streets.",
          tick: 0,
          importance: 87,
          kind: "promise",
        },
      ],
    },
    {
      id: "moetopo",
      name: "Moestopo",
      title: "Republican defense leader",
      role: "commander",
      factionId: "sun-liu",
      biography:
        "Dr. Moestopo was a Republican military leader associated with the defense of Surabaya. This model does not attribute every local order or formation to him personally.",
      personality: { traits: ["resourceful", "protective", "decisive"], leadership: 82, caution: 54, adaptability: 84 },
      currentLocationId: "tkr-command",
      initialObjective: "Coordinate local defense while maintaining clear routes for medical care, families, and verified information.",
      emotionalState: { primary: "resolute", intensity: 77 },
      inventory: ["street map", "courier roster", "first-aid requests"],
      trust: { "tkr-liaison": 77, "gubernur-suryo": 58, "bung-tomo": 64 },
      initialKnowledge: [
        {
          id: "moetopo-street-knowledge",
          statement:
            "No single command post can see every street; local reports are necessary, but each must be checked before changing a wider plan.",
          confidence: 88,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "moetopo-civilian-route-memory",
          summary: "Requests for water, medicine, and safe family movement arrive alongside reports about defensive positions.",
          tick: 0,
          importance: 91,
          kind: "shortage",
        },
      ],
    },
    {
      id: "tkr-liaison",
      name: "TKR and pemuda liaison formation",
      title: "Composite local-defense role",
      role: "soldier",
      renderKind: "unit",
      factionId: "sun-liu",
      biography:
        "A composite formation representing TKR personnel and local-defense groups. It makes movement and uncertainty visible without claiming that one unit represented all Surabaya defenders.",
      personality: { traits: ["alert", "communal", "fatigued"], leadership: 55, caution: 61, adaptability: 74 },
      currentLocationId: "tkr-command",
      initialObjective: "Keep a verified link between neighborhood reports, the command post, and the civilian aid route.",
      emotionalState: { primary: "wary", intensity: 65 },
      inventory: ["route chalk", "field radios", "water carriers"],
      trust: { moetopo: 78, "bung-tomo": 68, "civilian-medic": 61 },
      initialKnowledge: [
        {
          id: "tkr-liaison-local-limit",
          statement:
            "Local defenders can report their immediate street, but cannot reliably know every decision made elsewhere in the city.",
          confidence: 91,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "tkr-liaison-route-memory",
          summary: "The formation has been asked to keep a path open between the command post, aid post, and nearby neighborhoods.",
          tick: 0,
          importance: 84,
          kind: "promise",
        },
      ],
    },
    {
      id: "civilian-medic",
      name: "Civilian medic",
      title: "Composite relief-worker role",
      role: "medic",
      factionId: "neutral",
      biography:
        "A composite role representing medics, volunteers, and community caregivers. It foregrounds needs that command histories often leave at the edge of the frame.",
      personality: { traits: ["empathetic", "steady", "practical"], leadership: 62, caution: 88, adaptability: 77 },
      currentLocationId: "aid-post",
      initialObjective: "Keep care, water, and family information available without sending people through unverified danger.",
      emotionalState: { primary: "anxious", intensity: 63 },
      inventory: ["bandages", "water list", "family notes"],
      trust: { "kampung-family-representative": 79, "tkr-liaison": 59, "gubernur-suryo": 46 },
      initialKnowledge: [
        {
          id: "medic-safety-knowledge",
          statement:
            "An aid post needs more than medicine: families need safe routes, trustworthy information, and time to decide where to go.",
          confidence: 93,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "medic-capacity-memory",
          summary: "The aid post already has limited water, bedding, and transport before the largest fighting begins.",
          tick: 0,
          importance: 86,
          kind: "shortage",
        },
      ],
    },
    {
      id: "kampung-family-representative",
      name: "Kampung family representative",
      title: "Composite civilian perspective",
      role: "civilian",
      factionId: "neutral",
      biography:
        "A composite resident representing families deciding when to shelter, move, seek relatives, or remain near home. It is deliberately not a claim about one person's experience.",
      personality: { traits: ["protective", "observant", "resilient"], leadership: 48, caution: 90, adaptability: 68 },
      currentLocationId: "kampung-refuge",
      initialObjective: "Find reliable information and a safer route for families, elders, and children.",
      emotionalState: { primary: "anxious", intensity: 71 },
      inventory: ["family list", "rice bundle", "home key"],
      trust: { "civilian-medic": 81, "tkr-liaison": 49, "gubernur-suryo": 39 },
      initialKnowledge: [
        {
          id: "family-route-knowledge",
          statement:
            "A road that was safe in the morning may not be safe after a new rumor, checkpoint, or burst of fighting.",
          confidence: 84,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "family-home-memory",
          summary: "Neighbors share food and news, but no one can promise that a route or a home will remain safe through the day.",
          tick: 0,
          importance: 89,
          kind: "observation",
        },
      ],
    },
  ],
  initialWorld: {
    day: 0,
    phase: "dawn",
    weather: {
      condition: "overcast",
      windDirection: "northwest",
      windStrength: 18,
      precipitation: 36,
      visibility: 69,
    },
    factions: {
      wei: {
        id: "wei",
        name: "Allied British-Indian forces and NICA administration",
        color: "#506f94",
        strategicGoal:
          "Secure operational access while managing surrender, relief, and administrative demands; this modeled bloc does not imply identical political aims among all of its members.",
        resources: { food: 72, supplies: 76, morale: 66, readiness: 71, fleet: 64 },
      },
      "sun-liu": {
        id: "sun-liu",
        name: "Indonesian Republican forces and local defense",
        color: "#b95245",
        strategicGoal:
          "Protect the Republican position, maintain neighborhood coordination, and keep care and communication routes available amid escalating pressure.",
        resources: { food: 61, supplies: 54, morale: 73, readiness: 67, fleet: 31 },
      },
      neutral: {
        id: "neutral",
        name: "Civilians and medics",
        color: "#b48d52",
        strategicGoal:
          "Protect people, family connections, shelter, water, and access to care without assuming that any route will remain safe.",
        resources: { food: 58, supplies: 44, morale: 57, readiness: 36, fleet: 18 },
      },
    },
    infrastructure: {
      "tanjung-perak-docks": {
        id: "tanjung-perak-docks",
        name: "Tanjung Perak docks",
        status: "intact",
        capacity: 76,
        locationId: "tanjung-perak",
      },
      "jembatan-merah-crossing": {
        id: "jembatan-merah-crossing",
        name: "Jembatan Merah crossing",
        status: "strained",
        capacity: 48,
        locationId: "jembatan-merah",
      },
      "internatio-access": {
        id: "internatio-access",
        name: "Internatio access route",
        status: "strained",
        capacity: 43,
        locationId: "gedung-internatio",
      },
      "radio-network": {
        id: "radio-network",
        name: "City radio network",
        status: "strained",
        capacity: 54,
        locationId: "radio-station",
      },
      "aid-post-route": {
        id: "aid-post-route",
        name: "Aid-post approach",
        status: "intact",
        capacity: 62,
        locationId: "aid-post",
      },
      "south-evacuation-route": {
        id: "south-evacuation-route",
        name: "Southern evacuation route",
        status: "intact",
        capacity: 66,
        locationId: "south-evacuation-road",
      },
    },
    pressures: {
      diseaseRisk: 43,
      supplyStrain: 48,
      riverMobility: 61,
      diplomaticCohesion: 46,
      fireAttackEffectiveness: 0,
    },
  },
  timeline: [
    {
      id: "allied-arrival-25-october",
      tick: 1,
      title: "25 October: Allied forces arrive at Tanjung Perak",
      description:
        "British-Indian troops enter Surabaya through the port, beginning a tense encounter among military, political, and civilian systems already under strain.",
      kind: "diplomacy",
      evidence: "historical-fact",
      locationId: "tanjung-perak",
      participantIds: ["mallaby", "allied-liaison", "allied-field-column", "gubernur-suryo", "civilian-medic"],
      messages: [
        {
          id: "liaison-arrival-message",
          speakerId: "allied-liaison",
          recipientId: "gubernur-suryo",
          channel: "dispatch",
          text: "We need a verified contact point. Reports from the dock cannot tell us which streets are safe or what people have already heard.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "At Tanjung Perak, ships, lorries, messages, and anxious residents converge. An arrival at the harbor is not a simple beginning: each order will now have to cross a city where trust is already fragile.",
        why:
          "Ports connect people and supplies, but they do not create shared understanding. A new force entering a politically charged city changes what civilians, local leaders, and commanders believe is at stake.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "set-infrastructure", infrastructureId: "tanjung-perak-docks", status: "strained", capacity: 58 },
        { type: "adjust-pressure", pressure: "supplyStrain", amount: 5 },
        { type: "adjust-pressure", pressure: "diplomaticCohesion", amount: -4 },
        { type: "move-agent", agentId: "mallaby", locationId: "gedung-internatio", status: "traveling" },
        { type: "move-agent", agentId: "allied-liaison", locationId: "jembatan-merah", status: "traveling" },
        {
          type: "set-agent-objective",
          agentId: "gubernur-suryo",
          objective: "Establish a direct contact channel before rumor turns into a substitute for negotiation.",
        },
      ],
    },
    {
      id: "reports-and-radio-spread",
      tick: 2,
      title: "Reports and radio messages spread unevenly",
      description:
        "As tension grows, people encounter conflicting reports about orders, intentions, and which streets can still be used safely.",
      kind: "social",
      evidence: "historical-inference",
      locationId: "radio-station",
      participantIds: ["bung-tomo", "tkr-liaison", "allied-liaison", "kampung-family-representative"],
      worldAction: "radio-broadcast",
      messages: [
        {
          id: "bung-tomo-verification-message",
          speakerId: "bung-tomo",
          recipientId: "kampung-family-representative",
          channel: "signal",
          text: "Share what you have seen, but mark what you do not know. A rumor can send a family into a more dangerous street.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "A voice carries from the radio room; another message is relayed by bicycle; a third reaches a neighborhood only as a rumor. The city is connected, but not synchronized.",
        why:
          "Communication is infrastructure. When reports travel at different speeds and with different meanings, even a sincere order can be acted on as something else.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "set-infrastructure", infrastructureId: "radio-network", status: "strained", capacity: 41 },
        { type: "adjust-pressure", pressure: "diplomaticCohesion", amount: -7 },
        { type: "adjust-pressure", pressure: "supplyStrain", amount: 4 },
        { type: "move-agent", agentId: "tkr-liaison", locationId: "jembatan-merah", status: "traveling" },
        {
          type: "move-agent",
          agentId: "kampung-family-representative",
          locationId: "aid-post",
          status: "traveling",
        },
        {
          type: "share-knowledge",
          agentId: "civilian-medic",
          knowledge: {
            id: "medic-unverified-route-report",
            statement: "Families are receiving conflicting accounts of which streets remain open, so the aid post cannot promise a route without confirmation.",
            confidence: 72,
            learnedAtTick: 2,
            sourceAgentId: "kampung-family-representative",
            evidence: "historical-inference",
          },
          memory: {
            id: "medic-route-report-memory",
            summary: "A family representative reports that street-safety information is conflicting and changes quickly.",
            tick: 2,
            importance: 83,
            kind: "conversation",
          },
        },
      ],
    },
    {
      id: "ceasefire-29-october",
      tick: 3,
      title: "29 October: a ceasefire is negotiated",
      description:
        "Indonesian and Allied representatives negotiate a ceasefire as fighting and isolation leave groups across the city uncertain about the agreement's reach.",
      kind: "diplomacy",
      evidence: "historical-fact",
      locationId: "jembatan-merah",
      participantIds: ["mallaby", "gubernur-suryo", "allied-liaison", "moetopo", "tkr-liaison"],
      worldAction: "ceasefire",
      messages: [
        {
          id: "suryo-ceasefire-message",
          speakerId: "gubernur-suryo",
          recipientId: "mallaby",
          channel: "spoken",
          text: "An agreement matters only if every isolated group can hear it, understand it, and reach a safe point of contact.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "For a moment, the city has a path away from immediate escalation. The agreement is not an ending; it is a message that still has to survive streets, languages, fear, and armed checkpoints.",
        why:
          "Ceasefires are practical systems, not only signatures. They need trusted messengers, clear terms, and enough safety for people to act on the information they receive.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-pressure", pressure: "diplomaticCohesion", amount: 14 },
        { type: "adjust-resource", factionId: "neutral", resource: "morale", amount: 6 },
        { type: "set-infrastructure", infrastructureId: "jembatan-merah-crossing", status: "strained", capacity: 58 },
        { type: "move-agent", agentId: "mallaby", locationId: "jembatan-merah", status: "occupied" },
        { type: "move-agent", agentId: "gubernur-suryo", locationId: "jembatan-merah", status: "occupied" },
        { type: "move-agent", agentId: "moetopo", locationId: "jembatan-merah", status: "traveling" },
        {
          type: "share-knowledge",
          agentId: "tkr-liaison",
          knowledge: {
            id: "tkr-ceasefire-knowledge",
            statement: "A ceasefire has been negotiated, but the liaison formation has not confirmed that every isolated group has received the terms.",
            confidence: 78,
            learnedAtTick: 3,
            sourceAgentId: "gubernur-suryo",
            evidence: "historical-fact",
          },
          memory: {
            id: "tkr-ceasefire-memory",
            summary: "The formation is asked to relay the ceasefire and to report where contact is still impossible.",
            tick: 3,
            importance: 95,
            kind: "promise",
          },
        },
      ],
    },
    {
      id: "mallaby-death-contested",
      tick: 4,
      title: "30 October: Mallaby dies near Jembatan Merah",
      description:
        "Brigadier Mallaby is killed near the Internatio Building / Jembatan Merah area while ceasefire news is being relayed. His death is documented; the precise sequence and cause remain contested in historical accounts.",
      kind: "social",
      evidence: "historical-fact",
      locationId: "gedung-internatio",
      participantIds: ["mallaby", "allied-liaison", "gubernur-suryo", "tkr-liaison", "civilian-medic"],
      messages: [
        {
          id: "liaison-contested-report",
          speakerId: "allied-liaison",
          recipientId: "mansergh",
          channel: "dispatch",
          text: "We can confirm a grave loss near Internatio. We cannot yet treat any single account of the final moments as complete.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "Near Jembatan Merah, the ceasefire breaks against fear and confusion. The record confirms Mallaby's death; it does not give this simulation permission to invent one settled story of how it happened.",
        why:
          "Historical uncertainty is itself evidence. When sources conflict, responsible investigation compares accounts, asks what each witness could have known, and avoids turning an unresolved death into a convenient certainty.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-pressure", pressure: "diplomaticCohesion", amount: -23 },
        { type: "adjust-resource", factionId: "wei", resource: "morale", amount: -13 },
        { type: "adjust-resource", factionId: "sun-liu", resource: "morale", amount: -5 },
        { type: "set-infrastructure", infrastructureId: "internatio-access", status: "damaged", capacity: 20 },
        { type: "set-infrastructure", infrastructureId: "jembatan-merah-crossing", status: "damaged", capacity: 24 },
        // The model does not keep a posthumous avatar in the city. The timeline
        // preserves the historical uncertainty in narration and evidence labels.
        { type: "set-agent-visibility", agentId: "mallaby", visible: false },
        { type: "move-agent", agentId: "allied-liaison", locationId: "tanjung-perak", status: "retreating" },
        {
          type: "move-agent",
          agentId: "civilian-medic",
          locationId: "kampung-refuge",
          status: "traveling",
        },
        {
          type: "set-agent-objective",
          agentId: "mansergh",
          objective: "Separate confirmed reports from claims, assess civilian risk, and decide how command will respond to the loss.",
        },
        {
          type: "set-agent-emotion",
          agentId: "gubernur-suryo",
          emotion: { primary: "anxious", intensity: 88 },
        },
      ],
    },
    {
      id: "ultimatum-9-november",
      tick: 5,
      title: "9 November: an ultimatum is issued",
      description:
        "After days of escalating tension, an ultimatum is broadcast ahead of a threatened major operation. Its practical effect is shaped by who receives it, trusts it, and has a safe option available.",
      kind: "strategy",
      evidence: "historical-fact",
      locationId: "radio-station",
      participantIds: ["mansergh", "allied-liaison", "bung-tomo", "gubernur-suryo", "kampung-family-representative"],
      worldAction: "radio-broadcast",
      messages: [
        {
          id: "medic-ultimatum-question",
          speakerId: "civilian-medic",
          recipientId: "kampung-family-representative",
          channel: "spoken",
          text: "Before anyone moves, we need to know which road is open, where children can shelter, and who can help people who cannot travel quickly.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "An ultimatum reaches the city through notices, broadcasts, and hearsay. For families deciding whether to flee, the words matter—but so do the roads, food, medicines, and people waiting at the other end.",
        why:
          "Orders are never experienced only as text. Their consequences depend on unequal access to transport, information, care, and protection, which is why civilian safety must be analyzed alongside command decisions.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-pressure", pressure: "diplomaticCohesion", amount: -14 },
        { type: "adjust-pressure", pressure: "supplyStrain", amount: 10 },
        { type: "adjust-resource", factionId: "neutral", resource: "morale", amount: -9 },
        { type: "set-infrastructure", infrastructureId: "radio-network", status: "strained", capacity: 36 },
        { type: "move-agent", agentId: "mansergh", locationId: "gedung-internatio", status: "occupied" },
        { type: "move-agent", agentId: "moetopo", locationId: "tkr-command", status: "traveling" },
        { type: "move-agent", agentId: "tkr-liaison", locationId: "tkr-command", status: "traveling" },
        { type: "move-agent", agentId: "bung-tomo", locationId: "radio-station", status: "occupied" },
        {
          type: "move-agent",
          agentId: "kampung-family-representative",
          locationId: "south-evacuation-road",
          status: "traveling",
        },
      ],
    },
    {
      id: "assault-10-november",
      tick: 6,
      title: "10 November: a major assault begins",
      description:
        "A major Allied assault begins in Surabaya. A modeled harbour column moves toward Jembatan Merah as blocked streets, local defense, and displacement reshape what each group can safely do.",
      kind: "battle",
      evidence: "historical-fact",
      locationId: "jembatan-merah",
      participantIds: ["mansergh", "allied-field-column", "moetopo", "tkr-liaison", "civilian-medic", "kampung-family-representative"],
      worldAction: "urban-assault",
      messages: [
        {
          id: "allied-column-blocked-approach-message",
          speakerId: "allied-field-column",
          recipientId: "mansergh",
          channel: "dispatch",
          text: "The approach is obstructed and the reports ahead do not agree. We need to treat every crossing as uncertain, not as an empty route.",
          evidence: "historical-inference",
        },
        {
          id: "tkr-aid-route-message",
          speakerId: "tkr-liaison",
          recipientId: "civilian-medic",
          channel: "dispatch",
          text: "The direct crossing is no longer reliable. Do not send families toward it until a route has been checked again.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "A modeled harbour column moves toward Jembatan Merah while local defenders close unsafe crossings and aid workers recheck escape routes. The city is no longer a backdrop to strategy: streets become barriers and homes become shelters.",
        why:
          "Urban fighting magnifies civilian risk because routes, care, food, and information are all disrupted at once. The educational focus here is on consequences and decisions, not on spectacle.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-resource", factionId: "wei", resource: "supplies", amount: -10 },
        { type: "adjust-resource", factionId: "sun-liu", resource: "readiness", amount: -12 },
        { type: "adjust-resource", factionId: "neutral", resource: "food", amount: -13 },
        { type: "adjust-resource", factionId: "neutral", resource: "supplies", amount: -14 },
        { type: "adjust-pressure", pressure: "diseaseRisk", amount: 15 },
        { type: "adjust-pressure", pressure: "supplyStrain", amount: 16 },
        { type: "adjust-pressure", pressure: "riverMobility", amount: -24 },
        { type: "set-infrastructure", infrastructureId: "aid-post-route", status: "damaged", capacity: 26 },
        { type: "set-infrastructure", infrastructureId: "south-evacuation-route", status: "strained", capacity: 39 },
        { type: "move-agent", agentId: "mansergh", locationId: "jembatan-merah", status: "traveling" },
        { type: "move-agent", agentId: "allied-field-column", locationId: "jembatan-merah", status: "traveling" },
        { type: "move-agent", agentId: "moetopo", locationId: "jembatan-merah", status: "traveling" },
        { type: "move-agent", agentId: "tkr-liaison", locationId: "jembatan-merah", status: "traveling" },
        { type: "move-agent", agentId: "civilian-medic", locationId: "aid-post", status: "occupied" },
      ],
    },
    {
      id: "aid-and-evacuation-priority",
      tick: 7,
      title: "Aid, shelter, and evacuation become urgent",
      description:
        "As the city remains dangerous, community care and route verification become as important as military movement. The specific corridor in this model is an educational inference, not a claimed formal agreement.",
      kind: "social",
      evidence: "historical-inference",
      locationId: "aid-post",
      participantIds: ["civilian-medic", "kampung-family-representative", "tkr-liaison", "gubernur-suryo", "bung-tomo"],
      worldAction: "aid-corridor",
      messages: [
        {
          id: "medic-aid-corridor-message",
          speakerId: "civilian-medic",
          recipientId: "gubernur-suryo",
          channel: "dispatch",
          text: "We can only describe the southern route as checked for this moment. Families need updates, water, and someone to receive them at the far end.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "At the aid post, a safe route is not a line on a map. It is people checking intersections, sharing water, carrying messages, and admitting when they no longer know what lies ahead.",
        why:
          "Humanitarian response depends on information and trust as much as supplies. Treating a route as permanently safe can be dangerous; treating it as a constantly verified commitment is more honest and protective.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-resource", factionId: "neutral", resource: "supplies", amount: -6 },
        { type: "adjust-resource", factionId: "neutral", resource: "morale", amount: 4 },
        { type: "adjust-pressure", pressure: "diseaseRisk", amount: -4 },
        { type: "adjust-pressure", pressure: "riverMobility", amount: 9 },
        { type: "set-infrastructure", infrastructureId: "south-evacuation-route", status: "strained", capacity: 51 },
        { type: "move-agent", agentId: "tkr-liaison", locationId: "south-evacuation-road", status: "traveling" },
        {
          type: "move-agent",
          agentId: "kampung-family-representative",
          locationId: "kampung-refuge",
          status: "traveling",
        },
        {
          type: "share-knowledge",
          agentId: "bung-tomo",
          knowledge: {
            id: "bung-tomo-aid-route-knowledge",
            statement: "The southern route has been checked only for the present moment; broadcasts must state its limits and direct families to aid workers for current guidance.",
            confidence: 81,
            learnedAtTick: 7,
            sourceAgentId: "civilian-medic",
            evidence: "historical-inference",
          },
          memory: {
            id: "bung-tomo-aid-route-memory",
            summary: "A medic asks that broadcasts avoid promising permanent safety and instead direct families toward verified help.",
            tick: 7,
            importance: 90,
            kind: "conversation",
          },
        },
      ],
    },
    {
      id: "weeks-of-fighting-and-displacement",
      tick: 8,
      title: "Fighting and displacement continue for weeks",
      description:
        "The large assault does not make the city immediately safe. Fighting, damaged routes, displacement, and the search for relatives and care continue through the following weeks.",
      kind: "retreat",
      evidence: "historical-fact",
      locationId: "kampung-refuge",
      participantIds: ["civilian-medic", "kampung-family-representative", "gubernur-suryo", "tkr-liaison", "allied-liaison"],
      messages: [
        {
          id: "family-aftermath-message",
          speakerId: "kampung-family-representative",
          recipientId: "civilian-medic",
          channel: "spoken",
          text: "The fighting may move away from one street, but families still need news, medicine, food, and a way to find one another.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "Weeks later, Surabaya's story remains one of disrupted homes, separated families, exhausted caregivers, and political consequences that cannot be reduced to a single battlefield outcome.",
        why:
          "A historical simulation should not end when a command decision is made. Its most important questions may be about recovery, displacement, memory, and whose experience was left out of the official record.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-resource", factionId: "neutral", resource: "food", amount: -10 },
        { type: "adjust-resource", factionId: "neutral", resource: "morale", amount: -8 },
        { type: "adjust-pressure", pressure: "diseaseRisk", amount: 8 },
        { type: "adjust-pressure", pressure: "supplyStrain", amount: 8 },
        { type: "set-infrastructure", infrastructureId: "aid-post-route", status: "damaged", capacity: 19 },
        { type: "set-infrastructure", infrastructureId: "south-evacuation-route", status: "damaged", capacity: 31 },
        { type: "move-agent", agentId: "allied-liaison", locationId: "tanjung-perak", status: "retreating" },
        { type: "move-agent", agentId: "civilian-medic", locationId: "kampung-refuge", status: "occupied" },
        {
          type: "set-agent-objective",
          agentId: "kampung-family-representative",
          objective: "Reconnect families with care, food, and reliable information while documenting what remains uncertain.",
        },
      ],
    },
  ],
} as const satisfies ScenarioDefinition;

export const SURABAYA_WHAT_IF_PRESETS = [
  {
    id: "verified-ceasefire-channel",
    type: "infrastructure",
    label: "Ceasefire uses a verified communication channel",
    description:
      "Model a more reliable radio-and-messenger network so learners can test whether a clear, trusted ceasefire relay changes later choices. This is speculative, not a claim about what would have happened.",
    source: "user",
    startsAtTick: 0,
    infrastructureId: "radio-network",
    status: "intact",
    capacity: 86,
  },
  {
    id: "southern-aid-route-prepared",
    type: "infrastructure",
    label: "Southern aid route is prepared earlier",
    description:
      "Give the modeled evacuation route more capacity before the major assault, testing how earlier water, guides, and route checks could affect civilian movement.",
    source: "user",
    startsAtTick: 0,
    infrastructureId: "south-evacuation-route",
    status: "intact",
    capacity: 91,
  },
  {
    id: "ultimatum-paused-for-talks",
    type: "event",
    label: "Ultimatum is paused for renewed talks",
    description:
      "Disable the modeled 10 November assault event to explore a speculative pause for negotiation, while keeping the existing tensions, uncertainty, and civilian needs visible.",
    source: "user",
    startsAtTick: 0,
    eventId: "assault-10-november",
    mode: "disable",
  },
] as const satisfies readonly WhatIfModifier[];
