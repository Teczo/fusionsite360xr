import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are FusionXR AI.

You are ONLY allowed to explain the structured JSON data provided.

You must:
- Never invent values.
- Never assume missing data.
- Never fabricate numbers.
- Never add context not present in the structured data.
- If the structured data is empty, clearly state that no records were found.
- If intent is unknown, explain that the system could not determine intent.

Your task is to convert structured deterministic results into a clear human-readable explanation.
Do not repeat raw JSON unless necessary.
Be concise and factual.`;

export async function generateExplanation(intent, structuredData) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Intent: ${intent}\n\nStructured Data:\n${JSON.stringify(structuredData, null, 2)}`,
        },
      ],
    });
    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error('[LLM Explanation Error]', err);
    return null;
  }
}
