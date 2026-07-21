import type { ScenarioDefinition, WhatIfModifier } from "./types";

/**
 * A source-aware educational model of the Battle of Montgisard on 25 November
 * 1177. The broad sequence—Saladin's advance into the Kingdom of Jerusalem,
 * Baldwin IV's release from the Ascalon area, the joining of a Templar
 * contingent, the surprise encounter, and the Ayyubid withdrawal—is used as a
 * historical anchor. The precise battlefield, troop totals, losses, dialogue,
 * command attribution, and all numerical values remain debated or are modeled
 * here for learning rather than presented as settled fact.
 *
 * Montgisard is represented as a broad, stylized Shephelah landscape near the
 * Ramla / Tel Gezer corridor. It is not a claim that the scene reconstructs an
 * exact archaeological location. Civilian, care, and route roles are
 * composites: they make disruption to homes, water, food, and information
 * visible without pretending to recover individual voices from sparse sources.
 */
export const MONTGISARD_SCENARIO = {
  id: "montgisard-1177",
  title: "Battle of Montgisard",
  subtitle: "Battle of Montgisard · a living simulation of routes, surprise, uncertainty, and the human cost of a field campaign",
  era: "25 November 1177 · Shephelah field near Ramla / Tel Gezer",
  historicalNote:
    "The Battle of Montgisard took place on 25 November 1177, when forces of the Kingdom of Jerusalem led by Baldwin IV defeated Saladin's Ayyubid army. Contemporary and later accounts differ about the exact site, force sizes, losses, and who directed each tactical moment. This scenario uses the broad campaign sequence as historical fact, while route capacities, dialogue, composite civilian roles, and counterfactual outcomes are clearly marked as educational inferences or speculation.",
  presentation: {
    scene: "montgisard",
    metricLabels: {
      morale: "Formation confidence",
      supplies: "Water and provisions",
      mobility: "Route access",
      cohesion: "Command contact",
    },
    causalThread: {
      title: "Routes → dispersed movement → surprise → withdrawal",
      description:
        "Route access is {groundMobility}/100. Follow how uncertain reports, water, movement across open ground, and separated groups alter the choices visible to both armies and nearby communities.",
    },
    mission: {
      title: "Examine how movement shapes a battle",
      description:
        "Trace the road from Ascalon, compare reports from the field and roadside farmstead, then distinguish documented outcomes from modeled explanations of surprise and withdrawal.",
      steps: ["Map the competing routes", "Compare field reports", "Trace the aftermath beyond the charge"],
    },
    whatIfPromptHint: "Try: What if the modeled Ayyubid column had remained more concentrated?",
  },
  maxTicks: 8,
  locations: [
    {
      id: "ascalon-road-approach",
      name: "Ascalon road approach",
      kind: "road",
      position: { x: -12, y: 0, z: -5 },
      description:
        "A modeled route north from the Ascalon area. It represents the difficult movement by which Baldwin's force re-entered the field; it is not a precise reconstruction of a single medieval road.",
    },
    {
      id: "frankish-rally",
      name: "Frankish rally point",
      kind: "camp",
      position: { x: -7, y: 0, z: -2.4 },
      description:
        "A stylized assembly point where the model brings together Baldwin's force, companions, and the contingent arriving from the Gaza direction.",
    },
    {
      id: "frankish-cavalry-line",
      name: "Frankish field line",
      kind: "field",
      position: { x: -3.3, y: 0, z: -0.7 },
      description:
        "A modeled starting line for the smaller Frankish force as it moves across the field. It does not assign a fixed formation or exact troop count to the historical army.",
    },
    {
      id: "montgisard-field",
      name: "Montgisard field",
      kind: "field",
      position: { x: 0.6, y: 0, z: 0.45 },
      description:
        "A broad, stylized field for the encounter traditionally called Montgisard. The location is intentionally approximate because the exact battlefield remains disputed.",
    },
    {
      id: "montgisard-tell",
      name: "Montgisard tell",
      kind: "ridge",
      position: { x: 3.9, y: 0, z: 4.8 },
      description:
        "A modeled rise used to make sightlines and uneven ground visible. It represents terrain questions in the campaign rather than a precise identification of the historic site.",
    },
    {
      id: "ayyubid-deployment",
      name: "Ayyubid field deployment",
      kind: "field",
      position: { x: 5.4, y: 0, z: 0.8 },
      description:
        "A modeled field position for Saladin's army as it faces the approaching Frankish force. Accounts differ on how quickly and in what order formations assembled.",
    },
    {
      id: "ayyubid-baggage-column",
      name: "Ayyubid baggage column",
      kind: "camp",
      position: { x: 8, y: 0, z: -2 },
      description:
        "A modeled route for baggage, water, messages, and people moving behind the main field force. It visualizes logistical vulnerability without making a claim about one exact train.",
    },
    {
      id: "wadi-crossing",
      name: "Wadi crossing",
      kind: "river",
      position: { x: 6.3, y: 0, z: -4 },
      description:
        "A stylized seasonal-water crossing used to show how terrain can slow movement, fragment reports, and complicate withdrawal across the wider field.",
    },
    {
      id: "ramla-road",
      name: "Ramla road corridor",
      kind: "road",
      position: { x: 11.7, y: 0, z: 3.8 },
      description:
        "A modeled corridor toward Ramla and the inland routes. It frames the campaign's movement through inhabited agricultural country rather than an empty battlefield.",
    },
    {
      id: "southern-withdrawal-road",
      name: "Southern withdrawal road",
      kind: "road",
      position: { x: 12.2, y: 0, z: -7.2 },
      description:
        "A modeled southward route for the Ayyubid withdrawal after the battle. It represents a difficult retreat, not a complete map of every survivor or movement.",
    },
    {
      id: "roadside-farmstead",
      name: "Roadside farmstead",
      kind: "farm",
      position: { x: -0.8, y: 0, z: 4.1 },
      description:
        "A composite rural household and cultivated land near the campaign corridor, included to make harvest, shelter, livestock, and local safety part of the historical question.",
    },
    {
      id: "water-point",
      name: "Shared water point",
      kind: "river",
      position: { x: -5.2, y: 0, z: 3.2 },
      description:
        "A modeled shared water source where soldiers and local households compete for access, information, and safe passage during rapid movement through the area.",
    },
  ],
  agents: [
    {
      id: "baldwin-iv",
      name: "Baldwin IV of Jerusalem",
      title: "King of Jerusalem",
      role: "ruler",
      factionId: "sun-liu",
      biography:
        "King of Jerusalem from 1174. Baldwin lived with leprosy and participated in the 1177 campaign; this model foregrounds his political and military agency without reducing him to his illness.",
      personality: { traits: ["resolute", "observant", "adaptable"], leadership: 88, caution: 67, adaptability: 80 },
      currentLocationId: "ascalon-road-approach",
      initialObjective: "Reconnect the scattered defense, verify which routes are open, and prevent a small force from mistaking rumor for a secure plan.",
      emotionalState: { primary: "resolute", intensity: 79 },
      inventory: ["route sketch", "sealed dispatches", "field water"],
      trust: { "raynald-of-chatillon": 58, "templar-contingent": 69, "frankish-field-force": 76 },
      initialKnowledge: [
        {
          id: "baldwin-route-constraint",
          statement:
            "The force cannot assume a clear road simply because a messenger used it earlier; contact, water, and terrain must be checked as conditions change.",
          confidence: 85,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "baldwin-kingdom-under-pressure",
          summary: "The kingdom's defenses are thin because major forces are elsewhere, leaving communities along the southern routes exposed to a fast-moving campaign.",
          tick: 0,
          importance: 92,
          kind: "battle",
        },
      ],
    },
    {
      id: "saladin",
      name: "Saladin",
      title: "Ayyubid sultan",
      role: "ruler",
      factionId: "wei",
      biography:
        "Salah al-Din Yusuf ibn Ayyub led the Ayyubid campaign into the Kingdom of Jerusalem in 1177. He commanded a much larger field force, but the exact size and deployment of that force are contested in the sources.",
      personality: { traits: ["strategic", "decisive", "pragmatic"], leadership: 93, caution: 57, adaptability: 82 },
      currentLocationId: "ayyubid-deployment",
      initialObjective: "Move through the campaign corridor while preserving communication, water access, and the ability to concentrate the field force when conditions change.",
      emotionalState: { primary: "confident", intensity: 76 },
      inventory: ["campaign map", "envoy reports", "water schedule"],
      trust: { "ayyubid-field-column": 78, "ayyubid-route-network": 66 },
      initialKnowledge: [
        {
          id: "saladin-open-country-knowledge",
          statement:
            "A large army moving through cultivated country relies on routes, water, forage, and messages; a wide advance can create blind spots as well as reach.",
          confidence: 84,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "saladin-southern-campaign-memory",
          summary: "The 1177 campaign has opened a route into the kingdom while many opposing forces are elsewhere, but a quick advance still depends on keeping the column connected.",
          tick: 0,
          importance: 91,
          kind: "battle",
        },
      ],
    },
    {
      id: "raynald-of-chatillon",
      name: "Raynald of Châtillon",
      title: "Frankish noble and field leader",
      role: "commander",
      factionId: "sun-liu",
      biography:
        "A noble of the Kingdom of Jerusalem who rode with Baldwin IV in the 1177 campaign. Accounts differ over the degree to which he directed the battle, so the model treats tactical attribution as an inference rather than a settled command record.",
      personality: { traits: ["forceful", "alert", "risk-tolerant"], leadership: 76, caution: 38, adaptability: 67 },
      currentLocationId: "ascalon-road-approach",
      initialObjective: "Help the small force move decisively without turning a route report or a momentary opening into an assumption about the whole field.",
      emotionalState: { primary: "resolute", intensity: 81 },
      inventory: ["signal pennant", "mounted escort", "route notes"],
      trust: { "baldwin-iv": 63, "frankish-field-force": 70, "templar-contingent": 56 },
      initialKnowledge: [
        {
          id: "raynald-command-uncertainty",
          statement:
            "The model cannot settle which individual issued every order in the fighting; it can show how a small command group must make choices with incomplete reports.",
          confidence: 93,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "raynald-road-memory",
          summary: "Rapid movement has made scouts, water stops, and messengers more important than any single written plan.",
          tick: 0,
          importance: 77,
          kind: "observation",
        },
      ],
    },
    {
      id: "templar-contingent",
      name: "Templar contingent",
      title: "Modeled mounted contingent",
      role: "soldier",
      renderKind: "unit",
      factionId: "sun-liu",
      biography:
        "A composite formation representing the Templar contingent described in accounts of the campaign traveling from the Gaza direction to join Baldwin's force. It does not assign a definitive number to the group.",
      personality: { traits: ["disciplined", "mobile", "guarded"], leadership: 63, caution: 61, adaptability: 75 },
      currentLocationId: "ascalon-road-approach",
      initialObjective: "Reach the rally point, exchange verified route information, and avoid treating a fast ride as proof that the road remains safe for everyone.",
      emotionalState: { primary: "wary", intensity: 70 },
      inventory: ["formation standard", "spare water", "courier seal"],
      trust: { "baldwin-iv": 70, "frankish-field-force": 61 },
      initialKnowledge: [
        {
          id: "templar-contact-report",
          statement:
            "A joining force can improve readiness, but it also needs time to share maps, water, fatigue, and assumptions with the people already moving.",
          confidence: 81,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "templar-ride-memory",
          summary: "The route from the Gaza direction has changed from hour to hour as military groups and local households move through it.",
          tick: 0,
          importance: 74,
          kind: "observation",
        },
      ],
    },
    {
      id: "frankish-field-force",
      name: "Frankish field force",
      title: "Modeled field formation",
      role: "soldier",
      renderKind: "unit",
      factionId: "sun-liu",
      biography:
        "A composite formation for the smaller force that gathered around Baldwin IV. It does not erase differences among mounted troops, infantry, local levies, or noncombatants moving through the same area.",
      personality: { traits: ["strained", "watchful", "steadfast"], leadership: 57, caution: 68, adaptability: 65 },
      currentLocationId: "ascalon-road-approach",
      initialObjective: "Stay connected to the command group, conserve water, and move only when the next segment of the road has been checked.",
      emotionalState: { primary: "wary", intensity: 74 },
      inventory: ["field tools", "water skins", "signal cloth"],
      trust: { "baldwin-iv": 78, "raynald-of-chatillon": 58, "templar-contingent": 62 },
      initialKnowledge: [
        {
          id: "frankish-small-force-knowledge",
          statement:
            "Being outnumbered does not make every action impossible, but it makes information, timing, ground, and withdrawal routes especially consequential.",
          confidence: 86,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "frankish-thin-defense-memory",
          summary: "The campaign begins with limited defenders available in the south, leaving every movement decision connected to the safety of nearby communities.",
          tick: 0,
          importance: 88,
          kind: "battle",
        },
      ],
    },
    {
      id: "ayyubid-field-column",
      name: "Ayyubid field column",
      title: "Modeled field formation",
      role: "soldier",
      renderKind: "unit",
      factionId: "wei",
      biography:
        "A composite formation representing the main Ayyubid field force. It is deliberately not given a definitive troop total because medieval source figures for Montgisard vary widely.",
      personality: { traits: ["mobile", "organized", "confident"], leadership: 68, caution: 52, adaptability: 73 },
      currentLocationId: "ayyubid-deployment",
      initialObjective: "Maintain contact with baggage, scouts, water, and neighboring formations while moving through a broad and changing campaign corridor.",
      emotionalState: { primary: "confident", intensity: 77 },
      inventory: ["formation banner", "field water", "route markers"],
      trust: { saladin: 84, "ayyubid-route-network": 66 },
      initialKnowledge: [
        {
          id: "ayyubid-column-knowledge",
          statement:
            "A long column can cover more ground, but its separate parts may receive different reports and need time to assemble when conditions change.",
          confidence: 80,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "ayyubid-advance-memory",
          summary: "The force has advanced through agricultural settlements and roads where provisioning, movement, and civilian safety now overlap.",
          tick: 0,
          importance: 84,
          kind: "observation",
        },
      ],
    },
    {
      id: "ayyubid-route-network",
      name: "Ayyubid route and supply network",
      title: "Composite scout, baggage, and messenger role",
      role: "messenger",
      factionId: "wei",
      biography:
        "A composite role for scouts, baggage handlers, water carriers, and messengers moving through the Ayyubid campaign. It keeps logistics visible without claiming a modern chain of command.",
      personality: { traits: ["practical", "alert", "resourceful"], leadership: 54, caution: 75, adaptability: 72 },
      currentLocationId: "ayyubid-baggage-column",
      initialObjective: "Keep messages, water, and supplies moving while marking which reports are confirmed and which route segments are uncertain.",
      emotionalState: { primary: "calm", intensity: 62 },
      inventory: ["water containers", "baggage list", "message tokens"],
      trust: { saladin: 70, "ayyubid-field-column": 68 },
      initialKnowledge: [
        {
          id: "ayyubid-route-network-knowledge",
          statement:
            "An unverified report can cause a formation to wait, turn, or spread at the wrong moment; logistics is also an information problem.",
          confidence: 83,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "ayyubid-water-memory",
          summary: "Water stops, baggage movement, and road conditions have become critical to the tempo of the campaign.",
          tick: 0,
          importance: 79,
          kind: "shortage",
        },
      ],
    },
    {
      id: "coastal-community-network",
      name: "Coastal community network",
      title: "Composite local household role",
      role: "civilian",
      factionId: "neutral",
      biography:
        "A composite role representing households, growers, herders, and travelers near the campaign routes. It avoids assigning a single political identity or a single experience to local communities.",
      personality: { traits: ["protective", "practical", "anxious"], leadership: 49, caution: 85, adaptability: 72 },
      currentLocationId: "roadside-farmstead",
      initialObjective: "Share only verified safety information, protect water and food stores, and trace where displaced people can find temporary shelter.",
      emotionalState: { primary: "anxious", intensity: 71 },
      inventory: ["grain measure", "water jars", "family notes"],
      trust: { "field-care-network": 76, "frankish-field-force": 33, "ayyubid-route-network": 27 },
      initialKnowledge: [
        {
          id: "community-route-knowledge",
          statement:
            "An army's route is also a household's route to water, fields, relatives, and market. News about one does not automatically tell people what is safe for the other.",
          confidence: 88,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "community-harvest-memory",
          summary: "Military movement has interrupted work, travel, and access to stored food; families are deciding what can be carried, hidden, or shared.",
          tick: 0,
          importance: 90,
          kind: "shortage",
        },
      ],
    },
    {
      id: "field-care-network",
      name: "Field care network",
      title: "Composite caregiver and water role",
      role: "medic",
      factionId: "neutral",
      biography:
        "A composite educational role for people who organize water, first aid, messages, and shelter along a disrupted route. It does not portray a single named medieval service.",
      personality: { traits: ["steady", "empathetic", "observant"], leadership: 56, caution: 82, adaptability: 79 },
      currentLocationId: "water-point",
      initialObjective: "Keep track of immediate needs, mark changing access to water, and distinguish a temporary opening from a reliable safe route.",
      emotionalState: { primary: "wary", intensity: 65 },
      inventory: ["water vessels", "linen", "route ledger"],
      trust: { "coastal-community-network": 79, "frankish-field-force": 41, "ayyubid-route-network": 34 },
      initialKnowledge: [
        {
          id: "care-network-water-knowledge",
          statement:
            "Water, care, and information move at different speeds. A road open to mounted troops may still be unsafe or unusable for a family, an injured person, or a loaded cart.",
          confidence: 91,
          learnedAtTick: 0,
          evidence: "historical-inference",
        },
      ],
      initialMemory: [
        {
          id: "care-network-route-memory",
          summary: "As groups move through the corridor, people at the water point are receiving conflicting reports about roads, shelters, and people who need help.",
          tick: 0,
          importance: 87,
          kind: "conversation",
        },
      ],
    },
  ],
  initialWorld: {
    day: 1,
    phase: "morning",
    weather: {
      condition: "clear",
      windDirection: "west",
      windStrength: 24,
      precipitation: 0,
      visibility: 80,
    },
    factions: {
      wei: {
        id: "wei",
        name: "Ayyubid field army",
        color: "#a95f36",
        strategicGoal: "Maintain campaign momentum while preserving a connected field force and viable routes.",
        resources: { food: 78, supplies: 82, morale: 75, readiness: 82, fleet: 0 },
      },
      "sun-liu": {
        id: "sun-liu",
        name: "Kingdom of Jerusalem field force",
        color: "#d8c47e",
        strategicGoal: "Reconnect the available defense, protect routes, and prevent the field force from being isolated.",
        resources: { food: 52, supplies: 48, morale: 61, readiness: 54, fleet: 0 },
      },
      neutral: {
        id: "neutral",
        name: "Local communities and care networks",
        color: "#82a896",
        strategicGoal: "Preserve water, food, shelter, and reliable information while armed groups move through the corridor.",
        resources: { food: 63, supplies: 59, morale: 58, readiness: 48, fleet: 0 },
      },
    },
    infrastructure: {
      "ascalon-road-access": {
        id: "ascalon-road-access",
        name: "Ascalon road access",
        status: "strained",
        capacity: 48,
        locationId: "ascalon-road-approach",
      },
      "frankish-command-contact": {
        id: "frankish-command-contact",
        name: "Frankish command contact",
        status: "strained",
        capacity: 43,
        locationId: "frankish-rally",
      },
      "field-water-access": {
        id: "field-water-access",
        name: "Shared field water access",
        status: "strained",
        capacity: 55,
        locationId: "water-point",
      },
      "wadi-crossing-access": {
        id: "wadi-crossing-access",
        name: "Wadi crossing access",
        status: "intact",
        capacity: 66,
        locationId: "wadi-crossing",
      },
      "baggage-route-contact": {
        id: "baggage-route-contact",
        name: "Baggage-route contact",
        status: "intact",
        capacity: 71,
        locationId: "ayyubid-baggage-column",
      },
      "farmstead-shelter": {
        id: "farmstead-shelter",
        name: "Farmstead shelter access",
        status: "strained",
        capacity: 44,
        locationId: "roadside-farmstead",
      },
      "southern-withdrawal-route": {
        id: "southern-withdrawal-route",
        name: "Southern withdrawal route",
        status: "intact",
        capacity: 70,
        locationId: "southern-withdrawal-road",
      },
    },
    pressures: {
      diseaseRisk: 19,
      supplyStrain: 38,
      riverMobility: 68,
      diplomaticCohesion: 45,
      fireAttackEffectiveness: 18,
    },
  },
  timeline: [
    {
      id: "ayyubid-campaign-enters-corridor",
      tick: 1,
      title: "A large Ayyubid force enters the southern corridor",
      description:
        "In late 1177, Saladin's army advances into the Kingdom of Jerusalem while many Frankish forces are elsewhere. The model begins with a broad campaign corridor rather than an empty route: farms, water points, messengers, and households are already under pressure.",
      kind: "strategy",
      evidence: "historical-fact",
      locationId: "ayyubid-deployment",
      participantIds: ["saladin", "ayyubid-field-column", "ayyubid-route-network", "coastal-community-network", "field-care-network"],
      worldAction: "montgisard-march",
      messages: [
        {
          id: "community-first-route-report",
          speakerId: "coastal-community-network",
          recipientId: "field-care-network",
          channel: "spoken",
          text: "Mark what is verified: the road is busy, water is being taken, and families need more than a rumor about which direction the army is moving.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "The campaign enters the southern corridor. Long before the field armies meet, ordinary routes become contested: a road is a military line, a market path, a water route, and a family's way to find shelter.",
        why:
          "Military movement changes civilian choices immediately. Seeing farms, water, and messengers on the same map helps explain why a battle cannot be understood only as two commanders facing each other.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-resource", factionId: "neutral", resource: "food", amount: -5 },
        { type: "adjust-resource", factionId: "neutral", resource: "supplies", amount: -5 },
        { type: "adjust-resource", factionId: "neutral", resource: "morale", amount: -4 },
        { type: "adjust-pressure", pressure: "supplyStrain", amount: 8 },
        { type: "adjust-pressure", pressure: "riverMobility", amount: -5 },
        { type: "set-infrastructure", infrastructureId: "farmstead-shelter", status: "strained", capacity: 35 },
        { type: "move-agent", agentId: "ayyubid-field-column", locationId: "ramla-road", status: "traveling" },
        { type: "move-agent", agentId: "ayyubid-route-network", locationId: "ayyubid-baggage-column", status: "traveling" },
      ],
    },
    {
      id: "baldwin-force-contained-near-ascalon",
      tick: 2,
      title: "Baldwin's force is constrained near Ascalon",
      description:
        "Accounts describe Baldwin IV moving to Ascalon with a limited force and facing a serious constraint there as Saladin's campaign passes through the region. This scene models the problem as an access and communication crisis, not a claim about one exact line of encirclement.",
      kind: "strategy",
      evidence: "historical-fact",
      locationId: "ascalon-road-approach",
      participantIds: ["baldwin-iv", "raynald-of-chatillon", "frankish-field-force", "templar-contingent", "field-care-network"],
      worldAction: "montgisard-scouting",
      messages: [
        {
          id: "baldwin-check-road-message",
          speakerId: "baldwin-iv",
          recipientId: "frankish-field-force",
          channel: "dispatch",
          text: "Do not turn a gap in the road into a promise. Check water, messengers, and the next turn before the force moves as one.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "Baldwin's smaller force is constrained near Ascalon. The question is not simply whether to fight; it is whether a route can be used before reports become stale and supplies run out.",
        why:
          "A smaller force often experiences geography as a limit on information and timing. A path that works for one rider may fail for a whole group, injured people, or carts carrying water.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-resource", factionId: "sun-liu", resource: "supplies", amount: -5 },
        { type: "adjust-resource", factionId: "sun-liu", resource: "morale", amount: -4 },
        { type: "adjust-pressure", pressure: "supplyStrain", amount: 4 },
        { type: "set-infrastructure", infrastructureId: "ascalon-road-access", status: "strained", capacity: 32 },
        { type: "set-infrastructure", infrastructureId: "frankish-command-contact", status: "strained", capacity: 31 },
        { type: "move-agent", agentId: "baldwin-iv", locationId: "frankish-rally", status: "traveling" },
        { type: "move-agent", agentId: "raynald-of-chatillon", locationId: "frankish-rally", status: "traveling" },
        { type: "move-agent", agentId: "frankish-field-force", locationId: "frankish-rally", status: "traveling" },
      ],
    },
    {
      id: "templar-contingent-joins-rally",
      tick: 3,
      title: "A Templar contingent joins the rally",
      description:
        "Sources describe a Templar contingent joining Baldwin's force from the Gaza direction. Its arrival improves the model's readiness, but it also requires the groups to share route knowledge, water, and a common plan before moving on.",
      kind: "logistics",
      evidence: "historical-fact",
      locationId: "frankish-rally",
      participantIds: ["baldwin-iv", "raynald-of-chatillon", "templar-contingent", "frankish-field-force", "field-care-network"],
      worldAction: "montgisard-rally",
      messages: [
        {
          id: "templar-rally-message",
          speakerId: "templar-contingent",
          recipientId: "baldwin-iv",
          channel: "spoken",
          text: "We can add riders, but first we need a shared report: which water point is usable, where the column was last seen, and who has not returned from the road.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "The contingent joins the rally. Reinforcement is not a magic number: newcomers bring strength, fatigue, different maps, and new questions about who has seen what.",
        why:
          "Coordination takes time. This scene turns the arrival of allies into an information problem as well as a military one, making the later timing of the encounter easier to investigate.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-resource", factionId: "sun-liu", resource: "readiness", amount: 13 },
        { type: "adjust-resource", factionId: "sun-liu", resource: "morale", amount: 7 },
        { type: "adjust-resource", factionId: "sun-liu", resource: "supplies", amount: -3 },
        { type: "adjust-pressure", pressure: "diplomaticCohesion", amount: 7 },
        { type: "set-infrastructure", infrastructureId: "frankish-command-contact", status: "intact", capacity: 62 },
        { type: "move-agent", agentId: "templar-contingent", locationId: "frankish-rally", status: "occupied" },
        {
          type: "share-knowledge",
          agentId: "baldwin-iv",
          knowledge: {
            id: "baldwin-templar-route-report",
            statement:
              "The arriving contingent confirms movement along the road but cannot guarantee that every route segment, water point, or civilian shelter remains secure.",
            confidence: 79,
            learnedAtTick: 3,
            sourceAgentId: "templar-contingent",
            evidence: "historical-inference",
          },
          memory: {
            id: "baldwin-rally-memory",
            summary: "The rally improves readiness while making it clear that a shared field picture still has gaps.",
            tick: 3,
            importance: 88,
            kind: "conversation",
          },
        },
      ],
    },
    {
      id: "campaign-routes-stretch-across-field",
      tick: 4,
      title: "Routes, baggage, and reports stretch across the field",
      description:
        "As the campaign moves through the corridor, the model shows the Ayyubid force, baggage, messages, and nearby communities spread across several routes. This is a causal interpretation of the campaign, not a claim that every unit was arranged exactly this way.",
      kind: "logistics",
      evidence: "historical-inference",
      locationId: "ayyubid-baggage-column",
      participantIds: ["saladin", "ayyubid-field-column", "ayyubid-route-network", "coastal-community-network", "field-care-network"],
      worldAction: "montgisard-scouting",
      messages: [
        {
          id: "route-network-caution-message",
          speakerId: "ayyubid-route-network",
          recipientId: "saladin",
          channel: "dispatch",
          text: "The road is carrying baggage, water, and separate reports. We can cover distance, but a sudden turn will take time to reach every group.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "The campaign stretches across roads, water points, baggage routes, and fields. That reach can create opportunity, but it can also make messages arrive at different times and make a sudden concentration harder.",
        why:
          "Surprise is not only about a hidden enemy. It can emerge when people, equipment, water, and information are moving at different speeds across the same landscape.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-resource", factionId: "wei", resource: "supplies", amount: -6 },
        { type: "adjust-resource", factionId: "neutral", resource: "food", amount: -7 },
        { type: "adjust-resource", factionId: "neutral", resource: "morale", amount: -6 },
        { type: "adjust-pressure", pressure: "supplyStrain", amount: 8 },
        { type: "adjust-pressure", pressure: "riverMobility", amount: -8 },
        { type: "set-infrastructure", infrastructureId: "baggage-route-contact", status: "strained", capacity: 44 },
        { type: "set-infrastructure", infrastructureId: "field-water-access", status: "strained", capacity: 39 },
        { type: "set-infrastructure", infrastructureId: "farmstead-shelter", status: "damaged", capacity: 25 },
        { type: "move-agent", agentId: "ayyubid-field-column", locationId: "ayyubid-deployment", status: "traveling" },
        { type: "move-agent", agentId: "ayyubid-route-network", locationId: "wadi-crossing", status: "traveling" },
        { type: "move-agent", agentId: "coastal-community-network", locationId: "water-point", status: "traveling" },
      ],
    },
    {
      id: "frankish-force-reaches-field-line",
      tick: 5,
      title: "The Frankish force reaches the field line",
      description:
        "Baldwin's force moves from the rally toward the contested field. Sources agree on the broad surprise encounter but differ over tactical detail, so this model shows a deliberate rally and approach rather than claiming a single unquestioned battle plan.",
      kind: "strategy",
      evidence: "historical-fact",
      locationId: "frankish-cavalry-line",
      participantIds: ["baldwin-iv", "raynald-of-chatillon", "templar-contingent", "frankish-field-force", "field-care-network"],
      worldAction: "montgisard-march",
      messages: [
        {
          id: "raynald-field-line-message",
          speakerId: "raynald-of-chatillon",
          recipientId: "baldwin-iv",
          channel: "spoken",
          text: "We have an opening, not certainty. Keep the force together and make room for a return route if the field looks different once we reach it.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "The smaller force reaches the field line. A source may call this a bold advance; on the ground it is also a decision to move with imperfect knowledge, limited water, and civilians still caught along nearby roads.",
        why:
          "Leadership under uncertainty is not simply confidence. It includes deciding what information is good enough to act on, while preserving routes for people who may need to move after the decision.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-resource", factionId: "sun-liu", resource: "supplies", amount: -6 },
        { type: "adjust-resource", factionId: "sun-liu", resource: "readiness", amount: 4 },
        { type: "adjust-pressure", pressure: "diplomaticCohesion", amount: 4 },
        { type: "set-infrastructure", infrastructureId: "ascalon-road-access", status: "damaged", capacity: 22 },
        { type: "move-agent", agentId: "baldwin-iv", locationId: "frankish-cavalry-line", status: "traveling" },
        { type: "move-agent", agentId: "raynald-of-chatillon", locationId: "frankish-cavalry-line", status: "traveling" },
        { type: "move-agent", agentId: "templar-contingent", locationId: "frankish-cavalry-line", status: "traveling" },
        { type: "move-agent", agentId: "frankish-field-force", locationId: "frankish-cavalry-line", status: "traveling" },
      ],
    },
    {
      id: "battle-of-montgisard",
      tick: 6,
      title: "25 November: Battle at Montgisard",
      description:
        "The Frankish force strikes Saladin's army near the field traditionally identified as Montgisard. It wins despite being smaller, but exact troop numbers, casualty figures, and each tactical movement remain debated; the scene avoids turning those uncertainties into spectacle.",
      kind: "battle",
      evidence: "historical-fact",
      locationId: "montgisard-field",
      participantIds: ["baldwin-iv", "saladin", "raynald-of-chatillon", "templar-contingent", "frankish-field-force", "ayyubid-field-column", "ayyubid-route-network", "field-care-network"],
      worldAction: "montgisard-charge",
      messages: [
        {
          id: "field-care-safety-message",
          speakerId: "field-care-network",
          recipientId: "coastal-community-network",
          channel: "spoken",
          text: "Do not follow the movement toward the field. Keep the water point marked, gather confirmed names, and leave room for people returning with no clear route.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "On 25 November, the armies meet near Montgisard. The Frankish force wins a striking victory, but the field is not a simple lesson in heroism: surprise, routes, timing, cohesion, and incomplete reports all shape the outcome.",
        why:
          "A smaller force can sometimes gain leverage when an opponent is dispersed or unable to concentrate quickly. This is a historical explanation to test, not a claim that a single cause determines every battle.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-resource", factionId: "wei", resource: "readiness", amount: -24 },
        { type: "adjust-resource", factionId: "wei", resource: "morale", amount: -20 },
        { type: "adjust-resource", factionId: "wei", resource: "supplies", amount: -12 },
        { type: "adjust-resource", factionId: "sun-liu", resource: "readiness", amount: -12 },
        { type: "adjust-resource", factionId: "sun-liu", resource: "morale", amount: 14 },
        { type: "adjust-resource", factionId: "neutral", resource: "morale", amount: -8 },
        { type: "adjust-pressure", pressure: "diseaseRisk", amount: 8 },
        { type: "adjust-pressure", pressure: "supplyStrain", amount: 7 },
        { type: "adjust-pressure", pressure: "riverMobility", amount: -12 },
        { type: "set-infrastructure", infrastructureId: "field-water-access", status: "damaged", capacity: 22 },
        { type: "set-infrastructure", infrastructureId: "wadi-crossing-access", status: "strained", capacity: 37 },
        { type: "move-agent", agentId: "baldwin-iv", locationId: "montgisard-field", status: "occupied" },
        { type: "move-agent", agentId: "raynald-of-chatillon", locationId: "frankish-cavalry-line", status: "occupied" },
        { type: "move-agent", agentId: "templar-contingent", locationId: "frankish-cavalry-line", status: "occupied" },
        { type: "move-agent", agentId: "frankish-field-force", locationId: "frankish-cavalry-line", status: "occupied" },
        { type: "move-agent", agentId: "saladin", locationId: "ayyubid-deployment", status: "occupied" },
        { type: "move-agent", agentId: "ayyubid-field-column", locationId: "ayyubid-deployment", status: "occupied" },
      ],
    },
    {
      id: "ayyubid-withdrawal-south",
      tick: 7,
      title: "Ayyubid forces withdraw south",
      description:
        "Saladin's army withdraws after its defeat. The historical result is clear, but the exact scale of loss and every route of retreat are not. The model follows a southward route to examine how fatigue, water, damaged crossings, and fragmented information affect people after a battle.",
      kind: "retreat",
      evidence: "historical-fact",
      locationId: "southern-withdrawal-road",
      participantIds: ["saladin", "ayyubid-field-column", "ayyubid-route-network", "field-care-network", "coastal-community-network"],
      worldAction: "montgisard-withdrawal",
      messages: [
        {
          id: "ayyubid-withdrawal-message",
          speakerId: "ayyubid-route-network",
          recipientId: "saladin",
          channel: "dispatch",
          text: "The southern route is moving, but water and reports are uneven. We need to mark each crossing as it is checked rather than promise the whole road.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "The Ayyubid force withdraws south. Withdrawal is not the absence of a story: it is a new logistics problem involving water, wounded people, baggage, fear, and roads that are no longer predictable.",
        why:
          "Studying withdrawal shows that an outcome continues after the charge. The same terrain that shapes an encounter also shapes who can leave, receive care, or recover information afterward.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-resource", factionId: "wei", resource: "supplies", amount: -8 },
        { type: "adjust-resource", factionId: "wei", resource: "morale", amount: -8 },
        { type: "adjust-resource", factionId: "neutral", resource: "supplies", amount: -7 },
        { type: "adjust-pressure", pressure: "diseaseRisk", amount: 7 },
        { type: "adjust-pressure", pressure: "supplyStrain", amount: 6 },
        { type: "set-infrastructure", infrastructureId: "baggage-route-contact", status: "damaged", capacity: 24 },
        { type: "set-infrastructure", infrastructureId: "southern-withdrawal-route", status: "strained", capacity: 41 },
        { type: "move-agent", agentId: "saladin", locationId: "southern-withdrawal-road", status: "retreating" },
        { type: "move-agent", agentId: "ayyubid-field-column", locationId: "southern-withdrawal-road", status: "retreating" },
        { type: "move-agent", agentId: "ayyubid-route-network", locationId: "southern-withdrawal-road", status: "retreating" },
      ],
    },
    {
      id: "route-recovery-and-memory",
      tick: 8,
      title: "Routes reopen unevenly after the field battle",
      description:
        "The battle ends, but local disruption does not disappear with the armies. Households, care networks, and returning soldiers confront damaged water access, missing information, interrupted food stores, and a landscape changed by rapid movement.",
      kind: "social",
      evidence: "historical-inference",
      locationId: "roadside-farmstead",
      participantIds: ["baldwin-iv", "frankish-field-force", "coastal-community-network", "field-care-network", "ayyubid-route-network"],
      messages: [
        {
          id: "community-aftermath-message",
          speakerId: "coastal-community-network",
          recipientId: "field-care-network",
          channel: "spoken",
          text: "Record what is known and what is not. A victory report does not tell a household whether its water, food, relatives, or road access has returned.",
          evidence: "historical-inference",
        },
      ],
      narration: {
        story:
          "Montgisard becomes a remembered victory, but the land around it still has to absorb the campaign. Water points, farmsteads, and roads recover unevenly, and different people experience the aftermath differently.",
        why:
          "A historical battle is both a military event and a social disruption. Ending with recovery helps learners resist treating a battlefield result as the full meaning of what happened.",
        whyEvidence: "historical-inference",
      },
      effects: [
        { type: "adjust-resource", factionId: "neutral", resource: "food", amount: -5 },
        { type: "adjust-resource", factionId: "neutral", resource: "morale", amount: -4 },
        { type: "adjust-pressure", pressure: "diseaseRisk", amount: 4 },
        { type: "adjust-pressure", pressure: "supplyStrain", amount: 4 },
        { type: "set-infrastructure", infrastructureId: "field-water-access", status: "strained", capacity: 34 },
        { type: "set-infrastructure", infrastructureId: "farmstead-shelter", status: "damaged", capacity: 29 },
        { type: "set-infrastructure", infrastructureId: "ascalon-road-access", status: "strained", capacity: 38 },
        { type: "move-agent", agentId: "coastal-community-network", locationId: "roadside-farmstead", status: "occupied" },
        { type: "move-agent", agentId: "field-care-network", locationId: "water-point", status: "traveling" },
        {
          type: "set-agent-objective",
          agentId: "field-care-network",
          objective: "Document continuing water, care, and route needs without treating a battlefield victory as the end of civilian hardship.",
        },
      ],
    },
  ],
} as const satisfies ScenarioDefinition;

export const MONTGISARD_WHAT_IF_PRESETS = [
  {
    id: "frankish-command-contact-earlier",
    type: "infrastructure",
    label: "Frankish command contact is restored earlier",
    description:
      "Increase the modeled ability of Baldwin's force to exchange route reports before the field encounter. This is speculative and does not claim that better messages would determine the battle.",
    source: "user",
    startsAtTick: 0,
    infrastructureId: "frankish-command-contact",
    status: "intact",
    capacity: 82,
  },
  {
    id: "ayyubid-column-stays-more-concentrated",
    type: "resource",
    label: "Ayyubid field column remains more concentrated",
    description:
      "Increase modeled Ayyubid readiness to explore how a more connected column could change timing and decision-making. It is a counterfactual, not a claim that one change would reverse the result.",
    source: "user",
    startsAtTick: 0,
    factionId: "wei",
    resource: "readiness",
    amount: 13,
  },
  {
    id: "farmstead-shelter-prepared-earlier",
    type: "infrastructure",
    label: "Farmstead shelter is prepared earlier",
    description:
      "Increase the modeled rural shelter capacity to explore how earlier community preparation could change information, water, and short-term safety during the campaign. This is explicitly speculative.",
    source: "user",
    startsAtTick: 0,
    infrastructureId: "farmstead-shelter",
    status: "intact",
    capacity: 74,
  },
] as const satisfies readonly WhatIfModifier[];
