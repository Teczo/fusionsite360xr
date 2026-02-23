import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CLASSIFIER_PROMPT = `
You are an intent classifier for FusionXR.

You MUST choose one of the following intents ONLY:

- overdue_activities
- activities_this_week
- cost_by_phase
- cascading_delay
- monthly_incidents
- unknown

You must return STRICT JSON in this format:

{
  "intent": "<one_of_the_above>",
  "parameters": {
    // optional parameters depending on intent
  }
}

Rules:
- Do NOT invent new intent names.
- If unsure, return "unknown".
- Extract ObjectId if present (24 hex characters) as "activityId".
- Extract delayDays if present (number of days mentioned).
- Extract phase number if mentioned, formatted as "Phase N" (e.g. "Phase 1").
- Never include explanations.
- Output JSON only.
`;

export async function classifyIntent(question) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: CLASSIFIER_PROMPT },
        { role: 'user', content: question },
      ],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error('[Intent Classifier Error]', err);
    return null;
  }
}
