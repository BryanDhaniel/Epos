import type { ScenarioDefinition, WhatIfModifier } from "./types";

/**
 * A source-aware, civilian-centered interpretation of the Siege of Jerusalem
 * in 1187. Historical anchors include Saladin's siege beginning on 20
 * September, Balian of Ibelin's defense, the shift of Ayyubid siege works to
 * the northern wall, negotiations, and the surrender on 2 October.
 *
 * The siege followed the Battle of Hattin and a period of rapid conquest, so
 * Jerusalem contained residents and refugees with unequal resources and very
 * different prospects. Ransom terms, departures, and later accounts must be
 * handled with care: sources vary in their details and rarely preserve the
 * voices of ordinary people. Resource values, dialogue, composite roles, and
 * counterfactual consequences below are explicit educational models, not a
 * reconstruction of an individual person's experience.
 */
export const JERUSALEM_SCENARIO = {
  id: "jerusalem-1187",
  title: "Siege of Jerusalem",
  subtitle: "A living simulation of defense, negotiation, water access, and civilian departure",
  era: "20 September–2 October 1187 · Jerusalem",
  historicalNote:
    "This scenario treats the broad chronology of the 1187 siege as a historical anchor. Saladin's army besieged Jerusalem, Balian of Ibelin led its defense, and the city surrendered on 2 October under negotiated terms. Numerical resources, route capacities, dialogue, and composite civilian perspectives are educational inferences; they do not settle disputed details or speak for every resident.",
  presentation: {
    scene: "jerusalem",
    metricLabels: {
      morale: "Community resilience",
      supplies: "Water and provisions",
      mobility: "Safe-route access",
      cohesion: "Negotiation confidence",
    },
    causalThread: {
      title: "Refuge → pressure → wall breach → negotiated departure",
      description:
        "Safe-route access is {groundMobility}/100. Follow how crowding, water, wall pressure, and negotiation change what civilians and leaders can actually do.",
    },
    mission: {
      title: "Examine a siege through care and negotiation",
      description:
        "Compare a commander's view with a household's needs, trace water and refuge access, then investigate why surrender terms did not create equal safety for everyone.",
      steps: ["Trace water and refuge access", "Follow the northern siege works", "Assess negotiated departure"],
    },
    whatIfPromptHint: "Try: What if the modeled parley route had opened earlier?",
  },
  maxTicks: 8,
  locations: [
    {
      id: "siege-camp",
      name: "Ayyubid siege camp",
      kind: "camp",
      position: { x: -8, y: 0, z: -1 },
      description:
        "A modeled camp outside Jerusalem representing the Ayyubid army's command, supply, and assembly space during the September 1187 siege.",
    },
    {
      id: "western-approach",
      name: "Western approach",
      kind: "field",
      position: { x: -6.4, y: 0, z: -0.5 },
      description:
        "A stylized western approach used to show the first pressure against the city's defenses before the siege works shifted north.",
    },
    {
      id: "jaffa-gate",
      name: "Jaffa Gate sector",
      kind: "fortress",
      position: { x: -4.8, y: 0, z: -0.5 },
      description:
        "A modeled western gate sector. It represents the initial wall pressure and is not a detailed reconstruction of every medieval structure around the gate.",
    },
    {
      id: "gate-court",
      name: "Gate court",
      kind: "fortress",
      position: { x: -3.05, y: 0, z: -0.5 },
      description:
        "A modeled inner court where defenders, residents, and messages converge when an outer approach becomes unsafe.",
    },
    {
      id: "citadel-quarter",
      name: "Citadel quarter",
      kind: "fortress",
      position: { x: -2.7, y: 0, z: -2 },
      description:
        "A stylized fortified quarter representing defensive coordination and later political transition without asserting one exact command room.",
    },
    {
      id: "cistern-court",
      name: "Cistern court",
      kind: "fortress",
      position: { x: 0.8, y: 0, z: 1.05 },
      description:
        "A modeled civic water point for exploring how storage, queues, safety, and transport affect access during a crowded siege.",
    },
    {
      id: "community-refuge",
      name: "Community refuge",
      kind: "village",
      position: { x: 2.3, y: 0, z: -1.55 },
      description:
        "A modeled neighborhood refuge for residents and people displaced by earlier conquests; it makes shelter, care, and family information visible in the simulation.",
    },
    {
      id: "northern-wall",
      name: "Northern wall",
      kind: "fortress",
      position: { x: 1.1, y: 0, z: 3.5 },
      description:
        "A stylized northern wall sector, where Saladin's siege works were redirected after the initial western pressure did not secure the city.",
    },
    {
      id: "northern-siege-works",
      name: "Northern siege works",
      kind: "field",
      position: { x: 1.1, y: 0, z: 5.7 },
      description:
        "A modeled construction and assault area showing the movement of Ayyubid siege equipment and labor toward the northern wall.",
    },
    {
      id: "parley-ground",
      name: "Parley ground",
      kind: "road",
      position: { x: -6.1, y: 0, z: -0.5 },
      description:
        "A modeled meeting ground outside the city used to visualize negotiations rather than claim the precise location of every exchange between leaders.",
    },
    {
      id: "departure-road",
      name: "Departure road",
      kind: "road",
      position: { x: -9.7, y: 0, z: -5.6 },
      description:
        "A modeled route representing the controlled departures and uncertain journeys that followed the negotiated surrender.",
    },
  ],
  agents: [
    {
      id: "saladin",
      name: "Saladin",
      title: "Ayyubid sultan",
      role: "ruler",
      factionId: "wei",
      biography:
        "Salah al-Din Yusuf ibn Ayyub led the Ayyubid campaign that reached Jerusalem after Hattin. He directed the 1187 siege and accepted a negotiated surrender rather than a final storming of the city.",
      personality: { traits: ["strategic", "patient", "political"], leadership: 93, caution: 67, adaptability: 81 },
      currentLocationId: "siege-camp",
      initialObjective: "Secure Jerusalem while weighing siege pressure, negotiation, religious sites, and the risks faced by people inside the city.",
      emotionalState: { primary: "resolute", intensity: 75 },
      inventory: ["campaign map", "envoy notes", "supply reports"],
      trust: { "ayyubid-siege-column": 78, "ayyubid-siege-works": 75, "balian-of-ibelin": 48 },
      initialKnowledge: [
        {
          id: "saladin-city-pressure",
          statement:
            "Jerusalem is a heavily symbolic city, but symbols do not remove the practical costs of a prolonged siege for soldiers, residents, and refugees.",
          confidence: 83,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "saladin-hattin-memory",
          summary: "The victory at Hattin reshaped the campaign, but capturing Jerusalem still requires logistics, wall pressure, and political judgment.",
          tick: 0,
          importance: 95,
          kind: "battle",
        },
      ],
    },
    {
      id: "balian-of-ibelin",
      name: "Balian of Ibelin",
      title: "Leader of Jerusalem's defense",
      role: "commander",
      factionId: "sun-liu",
      biography:
        "A noble of the Kingdom of Jerusalem who organized the defense of the city in 1187 and negotiated its surrender with Saladin. The simulation models public decisions, not his private thoughts.",
      personality: { traits: ["pragmatic", "protective", "resolute"], leadership: 85, caution: 74, adaptability: 77 },
      currentLocationId: "citadel-quarter",
      initialObjective: "Organize limited defenders, preserve access to water and refuge, and keep negotiation options visible as wall pressure grows.",
      emotionalState: { primary: "wary", intensity: 76 },
      inventory: ["wall reports", "city map", "parley notes"],
      trust: { "jerusalem-defenders": 76, "heraclius-of-jerusalem": 71, "city-care-network": 48 },
      initialKnowledge: [
        {
          id: "balian-defense-limit",
          statement:
            "The city has many people to protect but limited trained defenders, so every wall report must be weighed against water, shelter, and the chance of negotiated terms.",
          confidence: 87,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "balian-refugee-memory",
          summary: "Jerusalem's population has grown under pressure after the campaign, making ordinary shelter and provisions central to the defense problem.",
          tick: 0,
          importance: 93,
          kind: "shortage",
        },
      ],
    },
    {
      id: "heraclius-of-jerusalem",
      name: "Heraclius of Jerusalem",
      title: "Latin Patriarch of Jerusalem",
      role: "diplomat",
      factionId: "sun-liu",
      biography:
        "Latin Patriarch of Jerusalem during the siege. He was involved with Balian in the defense, negotiation, and efforts to raise funds for people unable to pay the departure ransom.",
      personality: { traits: ["deliberate", "pastoral", "tenacious"], leadership: 70, caution: 78, adaptability: 66 },
      currentLocationId: "citadel-quarter",
      initialObjective: "Support care and negotiation, distinguish confirmed terms from rumor, and identify what help is available to people without wealth or protectors.",
      emotionalState: { primary: "anxious", intensity: 70 },
      inventory: ["account roll", "message seals", "alms tally"],
      trust: { "balian-of-ibelin": 74, "city-care-network": 65, "household-refuge-network": 57 },
      initialKnowledge: [
        {
          id: "heraclius-ransom-limit",
          statement:
            "Terms written for a household may still be impossible for people without money, kin networks, or a reliable way to reach an exit.",
          confidence: 86,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "heraclius-care-memory",
          summary: "Relief and negotiation are connected: a promise of departure matters only if people can understand its terms and reach the route.",
          tick: 0,
          importance: 88,
          kind: "conversation",
        },
      ],
    },
    {
      id: "ayyubid-siege-column",
      name: "Ayyubid siege column",
      title: "Modeled field formation",
      role: "soldier",
      renderKind: "unit",
      factionId: "wei",
      biography:
        "A composite formation showing Ayyubid movement from camp to the wall approaches. It does not stand for every contingent in Saladin's army.",
      personality: { traits: ["disciplined", "mobile", "alert"], leadership: 58, caution: 54, adaptability: 71 },
      currentLocationId: "siege-camp",
      initialObjective: "Advance only along assigned approaches, preserve access to supplies, and report changes at the walls rather than assume a route is open.",
      emotionalState: { primary: "resolute", intensity: 72 },
      inventory: ["formation banner", "water skins", "field tools"],
      trust: { saladin: 81, "ayyubid-siege-works": 63 },
      initialKnowledge: [
        {
          id: "siege-column-route-knowledge",
          statement:
            "An approach is useful only if people, equipment, water, and messages can move through it without collapsing the supply line behind them.",
          confidence: 79,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "siege-column-campaign-memory",
          summary: "The army has advanced through a rapidly changing campaign and must maintain order as it begins a new siege.",
          tick: 0,
          importance: 80,
          kind: "battle",
        },
      ],
    },
    {
      id: "ayyubid-siege-works",
      name: "Ayyubid siege works team",
      title: "Modeled engineering and labor formation",
      role: "officer",
      renderKind: "unit",
      factionId: "wei",
      biography:
        "A composite formation for the engineers, laborers, escorts, and materials involved in Ayyubid siege works. It is not a claim about one named military unit.",
      personality: { traits: ["methodical", "resourceful", "enduring"], leadership: 61, caution: 63, adaptability: 76 },
      currentLocationId: "siege-camp",
      initialObjective: "Build and reposition equipment where the ground, supplies, and command reports make the work feasible.",
      emotionalState: { primary: "calm", intensity: 62 },
      inventory: ["timber", "rope", "tool chest"],
      trust: { saladin: 76, "ayyubid-siege-column": 65 },
      initialKnowledge: [
        {
          id: "siege-works-repositioning",
          statement:
            "Siege equipment is not fixed once built. Its effect depends on ground, range, protection, and whether the defenders can redirect their own resources.",
          confidence: 84,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "siege-works-memory",
          summary: "Construction must keep pace with supply, weather, ground conditions, and the changing point of pressure on the walls.",
          tick: 0,
          importance: 82,
          kind: "observation",
        },
      ],
    },
    {
      id: "jerusalem-defenders",
      name: "Jerusalem defenders",
      title: "Modeled defensive formation",
      role: "soldier",
      renderKind: "unit",
      factionId: "sun-liu",
      biography:
        "A composite formation representing the limited defenders who held sections of Jerusalem's walls. It does not turn the city's residents into a uniform military group.",
      personality: { traits: ["watchful", "strained", "steadfast"], leadership: 56, caution: 72, adaptability: 58 },
      currentLocationId: "jaffa-gate",
      initialObjective: "Keep watch over the western sector, relay verified reports, and move resources when the pressure shifts toward the north.",
      emotionalState: { primary: "wary", intensity: 75 },
      inventory: ["wall tools", "signal flag", "water ration"],
      trust: { "balian-of-ibelin": 78, "heraclius-of-jerusalem": 53 },
      initialKnowledge: [
        {
          id: "defenders-multiple-sectors",
          statement:
            "A report from one gate cannot describe the whole wall; shifting an exhausted group may relieve one approach while exposing another.",
          confidence: 82,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "defenders-urban-memory",
          summary: "Defense takes place beside homes, courtyards, water points, and crowded routes, not on an empty field.",
          tick: 0,
          importance: 85,
          kind: "observation",
        },
      ],
    },
    {
      id: "city-care-network",
      name: "City care network",
      title: "Composite caregiver role",
      role: "medic",
      factionId: "neutral",
      biography:
        "A composite educational role representing people who coordinated care, water, shelter, and news in a city under siege. It is not a portrayal of one organization or person.",
      personality: { traits: ["empathetic", "practical", "steady"], leadership: 58, caution: 84, adaptability: 78 },
      currentLocationId: "community-refuge",
      initialObjective: "Track immediate needs, keep water and shelter information current, and never describe a dangerous route as permanently safe.",
      emotionalState: { primary: "anxious", intensity: 66 },
      inventory: ["water vessels", "linen", "family register"],
      trust: { "household-refuge-network": 75, "heraclius-of-jerusalem": 63, "city-water-steward": 77 },
      initialKnowledge: [
        {
          id: "care-network-route-knowledge",
          statement:
            "A refuge is only useful when people can reach it, receive an update there, and find water or help after they arrive.",
          confidence: 88,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "care-network-crowding-memory",
          summary: "The population is under pressure from prior displacement, and ordinary care systems have little spare capacity when routes close.",
          tick: 0,
          importance: 91,
          kind: "shortage",
        },
      ],
    },
    {
      id: "city-water-steward",
      name: "City water steward",
      title: "Composite water-access role",
      role: "civilian",
      factionId: "neutral",
      biography:
        "A composite role for people who maintained, carried, rationed, or relied on water in Jerusalem. It models access rather than claiming a named historical office.",
      personality: { traits: ["careful", "observant", "protective"], leadership: 46, caution: 89, adaptability: 70 },
      currentLocationId: "cistern-court",
      initialObjective: "Monitor water access, identify unsafe queues or routes, and separate observed conditions from rumors about shortages.",
      emotionalState: { primary: "wary", intensity: 63 },
      inventory: ["ration marks", "water jug", "route notes"],
      trust: { "city-care-network": 77, "household-refuge-network": 68 },
      initialKnowledge: [
        {
          id: "water-steward-access-knowledge",
          statement:
            "Stored water is not equal access: a person also needs a safe path, time to wait, strength to carry it, and somewhere to take it afterward.",
          confidence: 90,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "water-steward-memory",
          summary: "Water access is becoming a social and logistical issue as households, refugees, and defenders depend on the same city routes.",
          tick: 0,
          importance: 89,
          kind: "shortage",
        },
      ],
    },
    {
      id: "household-refuge-network",
      name: "Household and refuge network",
      title: "Composite resident perspective",
      role: "civilian",
      factionId: "neutral",
      biography:
        "A composite educational perspective for residents and refugees in Jerusalem. Different religious, social, and economic communities faced different rules and risks; this role is not a substitute for their separate histories.",
      personality: { traits: ["resourceful", "protective", "anxious"], leadership: 47, caution: 86, adaptability: 76 },
      currentLocationId: "community-refuge",
      initialObjective: "Keep households connected to shelter, water, and reliable news while making uncertainty visible instead of repeating rumor.",
      emotionalState: { primary: "anxious", intensity: 72 },
      inventory: ["food bundle", "family notes", "lamp"],
      trust: { "city-care-network": 76, "city-water-steward": 69, "heraclius-of-jerusalem": 48 },
      initialKnowledge: [
        {
          id: "household-network-knowledge",
          statement:
            "A negotiated term or a wall report can arrive too late for a household deciding whether to wait, seek water, or move toward a gate.",
          confidence: 83,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "household-network-memory",
          summary: "Families and neighbors are sharing food, water, and news, but every new arrival makes the refuge network more strained.",
          tick: 0,
          importance: 88,
          kind: "conversation",
        },
      ],
    },
  ],
  initialWorld: {
    day: 0,
    phase: "dawn",
    weather: {
      condition: "clear",
      windDirection: "variable",
      windStrength: 13,
      precipitation: 0,
      visibility: 80,
    },
    factions: {
      wei: {
        id: "wei",
        name: "Ayyubid army",
        color: "#4f7891",
        strategicGoal: "Secure Jerusalem while balancing siege pressure, political legitimacy, and the prospect of negotiated surrender.",
        resources: { food: 82, supplies: 79, morale: 84, readiness: 82, fleet: 8 },
      },
      "sun-liu": {
        id: "sun-liu",
        name: "Jerusalem defenders",
        color: "#b96a53",
        strategicGoal: "Defend a crowded city, preserve routes for residents, and seek terms that reduce harm when defense can no longer hold.",
        resources: { food: 46, supplies: 39, morale: 56, readiness: 44, fleet: 0 },
      },
      neutral: {
        id: "neutral",
        name: "Residents, refugees, and care networks",
        color: "#b58c57",
        strategicGoal: "Protect water, shelter, care, family connections, and trustworthy information through siege, negotiation, and departure.",
        resources: { food: 43, supplies: 36, morale: 47, readiness: 22, fleet: 0 },
      },
    },
    infrastructure: {
      "city-cistern-access": {
        id: "city-cistern-access",
        name: "Cistern access",
        status: "strained",
        capacity: 55,
        locationId: "cistern-court",
      },
      "community-refuge-access": {
        id: "community-refuge-access",
        name: "Community refuge access",
        status: "strained",
        capacity: 45,
        locationId: "community-refuge",
      },
      "western-wall-defense": {
        id: "western-wall-defense",
        name: "Western wall defense",
        status: "intact",
        capacity: 75,
        locationId: "jaffa-gate",
      },
      "northern-wall-defense": {
        id: "northern-wall-defense",
        name: "Northern wall defense",
        status: "intact",
        capacity: 71,
        locationId: "northern-wall",
      },
      "siege-supply-line": {
        id: "siege-supply-line",
        name: "Ayyubid siege supply line",
        status: "intact",
        capacity: 76,
        locationId: "siege-camp",
      },
      "northern-siege-work-capacity": {
        id: "northern-siege-work-capacity",
        name: "Northern siege-work capacity",
        status: "intact",
        capacity: 72,
        locationId: "northern-siege-works",
      },
      "parley-access": {
        id: "parley-access",
        name: "Parley access",
        status: "strained",
        capacity: 40,
        locationId: "parley-ground",
      },
      "departure-route": {
        id: "departure-route",
        name: "Departure route",
        status: "strained",
        capacity: 34,
        locationId: "departure-road",
      },
    },
    pressures: {
      diseaseRisk: 37,
      supplyStrain: 64,
      riverMobility: 44,
      diplomaticCohesion: 43,
      fireAttackEffectiveness: 14,
    },
  },
  timeline: [
    {
      id: "siege-begins-20-september",
      tick: 1,
      title: "20 September: Saladin's army begins the siege",
      description:
        "After the campaign that followed Hattin, Saladin's army reaches Jerusalem. Balian of Ibelin organizes a defense in a city already under severe pressure from displacement and limited resources.",
      kind: "strategy",
      evidence: "historical-fact",
      locationId: "siege-camp",
      participantIds: ["saladin", "balian-of-ibelin", "ayyubid-siege-column", "jerusalem-defenders", "city-care-network"],
      worldAction: "siege-arrival",
      messages: [
        {
          id: "balian-refuge-access-message",
          speakerId: "balian-of-ibelin",
          recipientId: "city-care-network",
          channel: "dispatch",
          text: "Tell us where water and shelter access is already failing. A wall report alone cannot show what people need inside the city.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "On 20 September, Saladin's army begins the siege of Jerusalem. The city is already crowded by people displaced during the campaign, so defense and daily care immediately become the same problem.",
        why:
          "A city's capacity is shaped before the first assault. Earlier displacement can turn food, water, shelter, and reliable news into critical constraints from day one.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-pressure", pressure: "supplyStrain", amount: 8 },
        { type: "adjust-pressure", pressure: "riverMobility", amount: -5 },
        { type: "set-infrastructure", infrastructureId: "community-refuge-access", status: "strained", capacity: 37 },
        { type: "set-infrastructure", infrastructureId: "parley-access", status: "strained", capacity: 31 },
        { type: "move-agent", agentId: "ayyubid-siege-column", locationId: "western-approach", status: "traveling" },
        { type: "move-agent", agentId: "ayyubid-siege-works", locationId: "western-approach", status: "traveling" },
        { type: "move-agent", agentId: "jerusalem-defenders", locationId: "jaffa-gate", status: "occupied" },
        {
          type: "set-agent-objective",
          agentId: "household-refuge-network",
          objective: "Share verified shelter and water information while making clear which routes have not been checked.",
        },
      ],
    },
    {
      id: "western-approach-tested",
      tick: 2,
      title: "The western approach is tested",
      description:
        "Ayyubid pressure focuses first on the western sector. Defenders hold, but every response uses people, water, supplies, and attention that cannot be everywhere at once.",
      kind: "battle",
      evidence: "historical-fact",
      locationId: "jaffa-gate",
      participantIds: ["saladin", "balian-of-ibelin", "ayyubid-siege-column", "jerusalem-defenders", "city-water-steward"],
      worldAction: "siege-arrival",
      messages: [
        {
          id: "defenders-western-report",
          speakerId: "jerusalem-defenders",
          recipientId: "balian-of-ibelin",
          channel: "signal",
          text: "The western sector is holding for the moment, but movement through the gate court is slowing and reports from other walls are arriving late.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "At the western approach, the walls hold for the moment. Holding is not the same as being secure: defenders, water carriers, and families now compete for the same inner routes.",
        why:
          "A local defense can succeed tactically while worsening the wider city's capacity. The cost is measured in attention, fatigue, congestion, and the loss of safe movement.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-resource", factionId: "sun-liu", resource: "supplies", amount: -6 },
        { type: "adjust-resource", factionId: "sun-liu", resource: "readiness", amount: -5 },
        { type: "adjust-resource", factionId: "neutral", resource: "morale", amount: -5 },
        { type: "adjust-pressure", pressure: "supplyStrain", amount: 6 },
        { type: "set-infrastructure", infrastructureId: "western-wall-defense", status: "strained", capacity: 61 },
        { type: "set-infrastructure", infrastructureId: "community-refuge-access", status: "strained", capacity: 31 },
        { type: "move-agent", agentId: "balian-of-ibelin", locationId: "jaffa-gate", status: "traveling" },
        { type: "move-agent", agentId: "city-care-network", locationId: "gate-court", status: "traveling" },
        {
          type: "share-knowledge",
          agentId: "saladin",
          knowledge: {
            id: "saladin-western-wall-report",
            statement:
              "The western sector remains defended, so continuing the same pressure carries costs while other wall sectors may offer different conditions.",
            confidence: 76,
            learnedAtTick: 2,
            sourceAgentId: "ayyubid-siege-column",
            evidence: "historical-inference",
          },
          memory: {
            id: "saladin-western-wall-memory",
            summary: "A field report confirms the western sector is defended and further pressure must be weighed against other options.",
            tick: 2,
            importance: 84,
            kind: "observation",
          },
        },
      ],
    },
    {
      id: "water-and-refuge-pressure",
      tick: 3,
      title: "Water, shelter, and information come under strain",
      description:
        "As the siege continues, crowded routes and changing security make access to water, care, and shelter more difficult. The numerical pressure in this model is an educational inference, not a population count.",
      kind: "logistics",
      evidence: "historical-inference",
      locationId: "cistern-court",
      participantIds: ["city-water-steward", "city-care-network", "household-refuge-network", "heraclius-of-jerusalem", "balian-of-ibelin"],
      worldAction: "water-scarcity",
      messages: [
        {
          id: "water-access-message",
          speakerId: "city-water-steward",
          recipientId: "household-refuge-network",
          channel: "spoken",
          text: "The cistern is still here, but access is changing. Tell families the route is checked only for this moment, not promised for the whole day.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "The crisis is not only at the walls. A water court becomes a crowded route, a refuge becomes a queue, and a message about safety can become outdated before it reaches the next household.",
        why:
          "Sieges disrupt systems together. Water access, shelter, care, and information can fail through congestion and fear even when a physical structure still stands.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-resource", factionId: "neutral", resource: "food", amount: -7 },
        { type: "adjust-resource", factionId: "neutral", resource: "supplies", amount: -8 },
        { type: "adjust-resource", factionId: "neutral", resource: "morale", amount: -7 },
        { type: "adjust-pressure", pressure: "diseaseRisk", amount: 8 },
        { type: "adjust-pressure", pressure: "supplyStrain", amount: 10 },
        { type: "adjust-pressure", pressure: "riverMobility", amount: -9 },
        { type: "set-infrastructure", infrastructureId: "city-cistern-access", status: "strained", capacity: 41 },
        { type: "set-infrastructure", infrastructureId: "community-refuge-access", status: "strained", capacity: 24 },
        { type: "move-agent", agentId: "heraclius-of-jerusalem", locationId: "cistern-court", status: "traveling" },
        {
          type: "share-knowledge",
          agentId: "balian-of-ibelin",
          knowledge: {
            id: "balian-care-pressure-report",
            statement:
              "Water and refuge access are under modeled pressure from crowding and route uncertainty, so military reports must be considered alongside care needs.",
            confidence: 81,
            learnedAtTick: 3,
            sourceAgentId: "city-care-network",
            evidence: "historical-inference",
          },
          memory: {
            id: "balian-care-pressure-memory",
            summary: "A care report makes clear that wall decisions are affecting water, refuge access, and family movement.",
            tick: 3,
            importance: 91,
            kind: "discovery",
          },
        },
      ],
    },
    {
      id: "siege-works-shift-north",
      tick: 4,
      title: "26 September: siege works shift toward the north",
      description:
        "After the western approach does not yield the city, Saladin redirects siege works toward the northern wall. The shift changes both the battlefield and the routes people inside can use.",
      kind: "strategy",
      evidence: "historical-fact",
      locationId: "northern-siege-works",
      participantIds: ["saladin", "ayyubid-siege-works", "ayyubid-siege-column", "balian-of-ibelin", "jerusalem-defenders"],
      worldAction: "siege-engine-build",
      messages: [
        {
          id: "saladin-northern-shift-message",
          speakerId: "saladin",
          recipientId: "ayyubid-siege-works",
          channel: "dispatch",
          text: "Move the works to the northern sector and report what the ground can bear. Do not let a change of target break the line that supplies it.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "The siege works move north. A strategic shift is also a geographic shock: defenders must redeploy, while residents learn that a route safe yesterday may now lie beside the new point of pressure.",
        why:
          "Changing the main approach forces an opponent to redistribute scarce people and supplies. It also changes the ordinary map of water, refuge, and communication inside the city.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-resource", factionId: "wei", resource: "supplies", amount: -8 },
        { type: "adjust-resource", factionId: "wei", resource: "readiness", amount: 5 },
        { type: "adjust-resource", factionId: "sun-liu", resource: "readiness", amount: -6 },
        { type: "adjust-pressure", pressure: "supplyStrain", amount: 4 },
        { type: "adjust-pressure", pressure: "riverMobility", amount: -7 },
        { type: "set-infrastructure", infrastructureId: "northern-siege-work-capacity", status: "intact", capacity: 84 },
        { type: "set-infrastructure", infrastructureId: "northern-wall-defense", status: "strained", capacity: 57 },
        { type: "move-agent", agentId: "saladin", locationId: "northern-siege-works", status: "traveling" },
        { type: "move-agent", agentId: "ayyubid-siege-column", locationId: "northern-siege-works", status: "traveling" },
        { type: "move-agent", agentId: "ayyubid-siege-works", locationId: "northern-siege-works", status: "traveling" },
        { type: "move-agent", agentId: "balian-of-ibelin", locationId: "northern-wall", status: "traveling" },
        { type: "move-agent", agentId: "jerusalem-defenders", locationId: "northern-wall", status: "traveling" },
      ],
    },
    {
      id: "northern-wall-under-assault",
      tick: 5,
      title: "The northern wall comes under sustained assault",
      description:
        "Ayyubid siege pressure intensifies at the northern wall. The defense remains organized, but each hour of wall pressure reduces the capacity to protect inner routes and care networks.",
      kind: "battle",
      evidence: "historical-fact",
      locationId: "northern-wall",
      participantIds: ["saladin", "balian-of-ibelin", "ayyubid-siege-column", "ayyubid-siege-works", "jerusalem-defenders", "city-care-network"],
      worldAction: "siege-assault",
      messages: [
        {
          id: "defenders-north-report",
          speakerId: "jerusalem-defenders",
          recipientId: "balian-of-ibelin",
          channel: "signal",
          text: "The northern wall is under sustained pressure. We can still respond here, but the gate court and refuge routes are receiving fewer people and fewer updates.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "At the northern wall, the assault gathers force. The immediate question is no longer only whether a wall section holds, but what becomes impossible elsewhere while everyone watches it.",
        why:
          "Urban defense creates trade-offs. Reinforcing one wall can reduce protection, care, and information in every other part of a city already living under siege.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-resource", factionId: "wei", resource: "supplies", amount: -9 },
        { type: "adjust-resource", factionId: "sun-liu", resource: "supplies", amount: -9 },
        { type: "adjust-resource", factionId: "sun-liu", resource: "readiness", amount: -12 },
        { type: "adjust-resource", factionId: "neutral", resource: "morale", amount: -10 },
        { type: "adjust-pressure", pressure: "diseaseRisk", amount: 6 },
        { type: "adjust-pressure", pressure: "supplyStrain", amount: 9 },
        { type: "set-infrastructure", infrastructureId: "northern-wall-defense", status: "damaged", capacity: 29 },
        { type: "set-infrastructure", infrastructureId: "city-cistern-access", status: "strained", capacity: 31 },
        { type: "set-infrastructure", infrastructureId: "community-refuge-access", status: "damaged", capacity: 16 },
        { type: "move-agent", agentId: "ayyubid-siege-column", locationId: "northern-wall", status: "traveling" },
        { type: "move-agent", agentId: "ayyubid-siege-works", locationId: "northern-wall", status: "occupied" },
        { type: "move-agent", agentId: "city-care-network", locationId: "community-refuge", status: "occupied" },
        {
          type: "set-agent-emotion",
          agentId: "balian-of-ibelin",
          emotion: { primary: "anxious", intensity: 89 },
        },
      ],
    },
    {
      id: "parley-and-conditional-terms",
      tick: 6,
      title: "Negotiation turns wall pressure into conditional terms",
      description:
        "As the defense becomes untenable, Balian and Saladin negotiate surrender terms. The agreement offers departure through ransom and other arrangements, but it does not mean every person has equal means or safety.",
      kind: "diplomacy",
      evidence: "historical-fact",
      locationId: "parley-ground",
      participantIds: ["saladin", "balian-of-ibelin", "heraclius-of-jerusalem", "city-care-network", "household-refuge-network"],
      worldAction: "siege-parley",
      messages: [
        {
          id: "heraclius-terms-message",
          speakerId: "heraclius-of-jerusalem",
          recipientId: "city-care-network",
          channel: "dispatch",
          text: "A term on paper is not equal protection. Tell people only what is confirmed, and identify those without the money, kin, or strength to use the departure route.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "Negotiation begins as the wall can no longer carry every hope placed upon it. The terms create a path out for some people, but a path is not the same as equal access to safety.",
        why:
          "Surrenders are systems of power and resources. Ransom, information, family connections, and physical access determine how a formal agreement is experienced by different people.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-pressure", pressure: "diplomaticCohesion", amount: 15 },
        { type: "adjust-resource", factionId: "neutral", resource: "morale", amount: 3 },
        { type: "set-infrastructure", infrastructureId: "parley-access", status: "intact", capacity: 67 },
        { type: "set-infrastructure", infrastructureId: "departure-route", status: "strained", capacity: 49 },
        { type: "move-agent", agentId: "saladin", locationId: "parley-ground", status: "occupied" },
        { type: "move-agent", agentId: "balian-of-ibelin", locationId: "parley-ground", status: "occupied" },
        { type: "move-agent", agentId: "heraclius-of-jerusalem", locationId: "parley-ground", status: "traveling" },
        {
          type: "share-knowledge",
          agentId: "household-refuge-network",
          knowledge: {
            id: "household-conditional-terms",
            statement:
              "Negotiated departure terms are being discussed, but their practical meaning depends on what a household can pay, understand, carry, and safely reach.",
            confidence: 78,
            learnedAtTick: 6,
            sourceAgentId: "heraclius-of-jerusalem",
            evidence: "historical-inference",
          },
          memory: {
            id: "household-conditional-terms-memory",
            summary: "A dispatch warns that negotiated terms will not be equally usable by every household.",
            tick: 6,
            importance: 94,
            kind: "conversation",
          },
        },
      ],
    },
    {
      id: "jerusalem-surrenders-2-october",
      tick: 7,
      title: "2 October: Jerusalem surrenders",
      description:
        "Balian surrenders Jerusalem to Saladin. The negotiated arrangements avoid a final storming, but ransoms, departure rules, and unequal resources still shape who can leave and under what conditions.",
      kind: "diplomacy",
      evidence: "historical-fact",
      locationId: "gate-court",
      participantIds: ["saladin", "balian-of-ibelin", "heraclius-of-jerusalem", "ayyubid-siege-column", "jerusalem-defenders", "household-refuge-network"],
      worldAction: "siege-aftermath",
      messages: [
        {
          id: "household-departure-question",
          speakerId: "household-refuge-network",
          recipientId: "city-care-network",
          channel: "spoken",
          text: "We need the confirmed departure instructions, water for the road, and a way to identify people who cannot meet the terms alone.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "On 2 October, Jerusalem surrenders to Saladin. The city avoids a final storming, yet departure conditions still expose how wealth, family networks, and health can decide who is protected.",
        why:
          "A less destructive transfer of control can still produce hardship and unequal outcomes. Studying the terms helps learners distinguish formal safety from practical access to it.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-resource", factionId: "wei", resource: "morale", amount: 8 },
        { type: "adjust-resource", factionId: "sun-liu", resource: "readiness", amount: -18 },
        { type: "adjust-resource", factionId: "neutral", resource: "supplies", amount: -7 },
        { type: "adjust-pressure", pressure: "supplyStrain", amount: 5 },
        { type: "adjust-pressure", pressure: "riverMobility", amount: -7 },
        { type: "set-infrastructure", infrastructureId: "northern-wall-defense", status: "damaged", capacity: 14 },
        { type: "set-infrastructure", infrastructureId: "departure-route", status: "strained", capacity: 61 },
        { type: "move-agent", agentId: "saladin", locationId: "gate-court", status: "occupied" },
        { type: "move-agent", agentId: "balian-of-ibelin", locationId: "gate-court", status: "occupied" },
        { type: "move-agent", agentId: "ayyubid-siege-column", locationId: "gate-court", status: "traveling" },
        { type: "move-agent", agentId: "jerusalem-defenders", locationId: "citadel-quarter", status: "retreating" },
        {
          type: "set-agent-objective",
          agentId: "city-care-network",
          objective: "Help people interpret departure instructions, identify urgent needs, and avoid representing a negotiated surrender as equal safety for all.",
        },
      ],
    },
    {
      id: "departure-care-and-changed-city",
      tick: 8,
      title: "Departure, care, and a changed city",
      description:
        "After surrender, some people depart under negotiated arrangements while others remain or face different constraints. The city enters a new Ayyubid political order, but care, loss, and displacement remain unresolved.",
      kind: "social",
      evidence: "historical-fact",
      locationId: "departure-road",
      participantIds: ["heraclius-of-jerusalem", "city-care-network", "city-water-steward", "household-refuge-network", "saladin"],
      worldAction: "siege-aftermath",
      messages: [
        {
          id: "care-network-aftermath-message",
          speakerId: "city-care-network",
          recipientId: "city-water-steward",
          channel: "spoken",
          text: "Keep the record honest: some routes are open, some people have help, and many needs remain. Departure is not the same as recovery.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "The siege ends, but its human story continues along the departure road and inside the city. Care, displacement, memory, and unequal access to help outlast the last wall assault.",
        why:
          "Historical outcomes unfold after a surrender. Looking at departure and recovery prevents a map change or leadership change from being mistaken for an end to human consequences.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-resource", factionId: "neutral", resource: "food", amount: -8 },
        { type: "adjust-resource", factionId: "neutral", resource: "supplies", amount: -7 },
        { type: "adjust-resource", factionId: "neutral", resource: "morale", amount: -8 },
        { type: "adjust-pressure", pressure: "diseaseRisk", amount: 7 },
        { type: "adjust-pressure", pressure: "supplyStrain", amount: 6 },
        { type: "set-infrastructure", infrastructureId: "city-cistern-access", status: "strained", capacity: 37 },
        { type: "set-infrastructure", infrastructureId: "community-refuge-access", status: "damaged", capacity: 19 },
        { type: "move-agent", agentId: "heraclius-of-jerusalem", locationId: "departure-road", status: "traveling" },
        { type: "move-agent", agentId: "household-refuge-network", locationId: "departure-road", status: "traveling" },
        { type: "move-agent", agentId: "city-care-network", locationId: "departure-road", status: "traveling" },
        {
          type: "set-agent-objective",
          agentId: "city-water-steward",
          objective: "Document continuing water and care needs without treating survival, departure, and recovery as identical outcomes.",
        },
      ],
    },
  ],
} as const satisfies ScenarioDefinition;

export const JERUSALEM_WHAT_IF_PRESETS = [
  {
    id: "cistern-access-prepared-earlier",
    type: "infrastructure",
    label: "Cistern access is prepared earlier",
    description:
      "Increase the modeled capacity of the water-access route to examine how better preparation could change care and congestion. This is speculative, not a claim that it would have made the city safe.",
    source: "user",
    startsAtTick: 0,
    infrastructureId: "city-cistern-access",
    status: "intact",
    capacity: 76,
  },
  {
    id: "parley-route-opened-earlier",
    type: "infrastructure",
    label: "Parley route opens earlier",
    description:
      "Make the modeled parley route available sooner to explore how a more reliable channel could change when leaders and care networks receive confirmed information. This counterfactual is speculative.",
    source: "user",
    startsAtTick: 0,
    infrastructureId: "parley-access",
    status: "intact",
    capacity: 78,
  },
  {
    id: "northern-siege-work-delayed",
    type: "resource",
    label: "Northern siege work is delayed",
    description:
      "Reduce Ayyubid modeled supplies to explore how slower movement of equipment could change timing and pressure at the northern wall. This counterfactual is speculative.",
    source: "user",
    startsAtTick: 0,
    factionId: "wei",
    resource: "supplies",
    amount: -17,
  },
] as const satisfies readonly WhatIfModifier[];
