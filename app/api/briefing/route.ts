type BriefingRequest = {
  question: string;
  tick: number;
  selectedAgent: {
    name: string;
    role: string;
    objective: string;
    knowledge: string[];
  };
  world: {
    weather: {
      condition: string;
      windDirection: string;
      windStrength: number;
    };
    pressures: {
      diseaseRisk: number;
      supplyStrain: number;
      riverMobility: number;
      diplomaticCohesion: number;
    };
    modifiers: string[];
  };
};

function isBriefingRequest(value: unknown): value is BriefingRequest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BriefingRequest>;
  return (
    typeof candidate.question === "string" &&
    candidate.question.trim().length > 0 &&
    candidate.question.length <= 400 &&
    typeof candidate.tick === "number" &&
    !!candidate.selectedAgent &&
    typeof candidate.selectedAgent.name === "string" &&
    Array.isArray(candidate.selectedAgent.knowledge) &&
    !!candidate.world &&
    !!candidate.world.weather &&
    !!candidate.world.pressures &&
    Array.isArray(candidate.world.modifiers)
  );
}

function localBriefing(context: BriefingRequest) {
  const knownReport = context.selectedAgent.knowledge[0];
  const counterfactual = context.world.modifiers.length
    ? ` This run includes the speculative premise: ${context.world.modifiers.join(", ")}.`
    : " This is the baseline teaching model.";

  return `${context.selectedAgent.name} cannot know the whole campaign. Based on the reports available at this moment, ${knownReport ?? "there is no verified new report yet"}. Conditions are ${context.world.weather.condition}, with ${context.world.weather.windStrength}/100 ${context.world.weather.windDirection} wind; supply strain is ${context.world.pressures.supplyStrain}/100 and operational mobility is ${context.world.pressures.riverMobility}/100.${counterfactual} A useful next question is: who could independently confirm this report?`;
}

function outputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  const candidate = payload as { output_text?: unknown };
  return typeof candidate.output_text === "string" && candidate.output_text.trim()
    ? candidate.output_text.trim()
    : undefined;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The briefing request must be valid JSON." }, { status: 400 });
  }

  if (!isBriefingRequest(body)) {
    return Response.json({ error: "The briefing request is incomplete or too long." }, { status: 400 });
  }

  const fallback = localBriefing(body);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json({ answer: fallback, source: "local-context" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-5.6",
        temperature: 0.35,
        max_output_tokens: 220,
        instructions:
          "You are Epos, a careful historical-simulation briefing assistant. Use only the supplied simulation context. Never claim an agent knows information not in their knowledge list. Clearly separate historical anchors, modeled inferences, and speculative counterfactual effects. Answer in no more than 110 words, in accessible educational language, and end with one useful follow-up question.",
        input: JSON.stringify(body),
      }),
    });

    if (!response.ok) {
      return Response.json({ answer: fallback, source: "local-context" });
    }

    const answer = outputText(await response.json());
    return Response.json({ answer: answer ?? fallback, source: answer ? "openai" : "local-context" });
  } catch {
    return Response.json({ answer: fallback, source: "local-context" });
  }
}
