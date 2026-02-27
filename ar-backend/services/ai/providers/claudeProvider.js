import Anthropic from '@anthropic-ai/sdk';

/**
 * Creates a Claude (Anthropic) LLM provider.
 *
 * @param {{ apiKey: string, model: string|null }} options
 * @returns {{ name: string, classifyIntent: Function, generateExplanation: Function }}
 */
export function createClaudeProvider({ apiKey, model }) {
    const client = new Anthropic({ apiKey });
    const resolvedModel = model || 'claude-sonnet-4-20250514';

    return {
        name: 'claude',

        /**
         * Uses Claude tool use to classify the user's question into a structured intent.
         *
         * @param {string} question
         * @param {Array} tools  Universal tool definitions
         * @param {string} systemPrompt
         * @returns {{ toolName: string, args: object } | { toolName: null, fallbackText: string }}
         */
        async classifyIntent(question, tools, systemPrompt) {
            const claudeTools = tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.parameters,
            }));

            const response = await client.messages.create({
                model: resolvedModel,
                max_tokens: 1024,
                system: systemPrompt,
                tools: claudeTools,
                tool_choice: { type: 'auto' },
                messages: [{ role: 'user', content: question }],
            });

            const toolUseBlock = response.content.find((block) => block.type === 'tool_use');
            if (toolUseBlock) {
                return { toolName: toolUseBlock.name, args: toolUseBlock.input };
            }

            const textBlock = response.content.find((block) => block.type === 'text');
            return { toolName: null, fallbackText: textBlock?.text ?? '' };
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
                const response = await client.messages.create({
                    model: resolvedModel,
                    max_tokens: 1500,
                    temperature: 0,
                    system: 'You are a construction project AI assistant for FusionXR. Explain data clearly and concisely. Only reference facts present in the provided data. Do not invent or assume information.',
                    messages: [
                        {
                            role: 'user',
                            content: `Question: ${question}\n\nIntent: ${intent}\n\nStructured Data:\n${JSON.stringify(structuredData, null, 2)}`,
                        },
                    ],
                });
                return response.content[0]?.text || null;
            } catch (err) {
                console.error('[claudeProvider] generateExplanation error:', err);
                return null;
            }
        },
    };
}
