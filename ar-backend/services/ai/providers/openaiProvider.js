import OpenAI from 'openai';

/**
 * Creates an OpenAI LLM provider.
 *
 * @param {{ apiKey: string, model: string|null }} options
 * @returns {{ name: string, classifyIntent: Function, generateExplanation: Function }}
 */
export function createOpenAIProvider({ apiKey, model }) {
    const client = new OpenAI({ apiKey });
    const resolvedModel = model || 'gpt-4o-mini';

    return {
        name: 'openai',

        /**
         * Uses OpenAI function calling to classify the user's question into a structured intent.
         *
         * @param {string|Array} questionOrMessages  Plain question string or pre-built messages array
         * @param {Array} tools  Universal tool definitions
         * @param {string} systemPrompt
         * @returns {{ toolName: string, args: object } | { toolName: null, fallbackText: string }}
         */
        async classifyIntent(questionOrMessages, tools, systemPrompt) {
            const openaiTools = tools.map((tool) => ({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                },
            }));

            // Accept either a plain question string or a pre-built messages array
            const userMessages = typeof questionOrMessages === 'string'
                ? [{ role: 'user', content: questionOrMessages }]
                : questionOrMessages;

            // Prepend system message
            const messages = [
                { role: 'system', content: systemPrompt },
                ...userMessages,
            ];

            const response = await client.chat.completions.create({
                model: resolvedModel,
                messages,
                tools: openaiTools,
                tool_choice: 'auto',
            });

            const toolCalls = response.choices[0].message.tool_calls;
            if (toolCalls && toolCalls.length > 0) {
                const call = toolCalls[0];
                return {
                    toolName: call.function.name,
                    args: JSON.parse(call.function.arguments),
                };
            }

            return {
                toolName: null,
                fallbackText: response.choices[0].message.content,
            };
        },

        /**
         * Generates a human-readable explanation of the structured data result.
         *
         * @param {string} intent
         * @param {*} structuredData
         * @param {string} question
         * @returns {string|null}
         */
        async generateExplanation(intent, structuredData, question) {
            try {
                const response = await client.chat.completions.create({
                    model: resolvedModel,
                    temperature: 0,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a construction project AI assistant for FusionXR. Explain data clearly and concisely. Only reference facts present in the provided data. Do not invent or assume information.',
                        },
                        {
                            role: 'user',
                            content: `Question: ${question}\n\nIntent: ${intent}\n\nStructured Data:\n${JSON.stringify(structuredData, null, 2)}\n\nOnly state facts from the data above.`,
                        },
                    ],
                });
                return response.choices[0].message.content || null;
            } catch (err) {
                console.error('[openaiProvider] generateExplanation error:', err);
                return null;
            }
        },
    };
}
