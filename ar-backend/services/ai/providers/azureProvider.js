import { AzureOpenAI } from 'openai';

/**
 * Creates an Azure OpenAI LLM provider.
 *
 * @param {{ apiKey: string, azureEndpoint: string, azureDeploymentName: string }} options
 * @returns {{ name: string, classifyIntent: Function, generateExplanation: Function }}
 */
export function createAzureProvider({ apiKey, azureEndpoint, azureDeploymentName }) {
    const client = new AzureOpenAI({
        apiKey,
        endpoint: azureEndpoint,
        deployment: azureDeploymentName,
        apiVersion: '2024-10-21',
    });

    return {
        name: 'azure-openai',

        /**
         * Uses Azure OpenAI function calling to classify the user's question into a structured intent.
         *
         * @param {string} question
         * @param {Array} tools  Universal tool definitions
         * @param {string} systemPrompt
         * @returns {{ toolName: string, args: object } | { toolName: null, fallbackText: string }}
         */
        async classifyIntent(question, tools, systemPrompt) {
            const openaiTools = tools.map((tool) => ({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                },
            }));

            const response = await client.chat.completions.create({
                model: azureDeploymentName,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: question },
                ],
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
                    model: azureDeploymentName,
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
                console.error('[azureProvider] generateExplanation error:', err);
                return null;
            }
        },
    };
}
