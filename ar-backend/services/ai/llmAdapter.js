import UserAISettings from '../../models/UserAISettings.js';
import { createClaudeProvider } from './providers/claudeProvider.js';
import { createOpenAIProvider } from './providers/openaiProvider.js';
import { createAzureProvider } from './providers/azureProvider.js';

const PLATFORM_KEYS = {
    claude: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    'azure-openai': process.env.AZURE_OPENAI_API_KEY,
};

const DEFAULT_MODELS = {
    claude: 'claude-sonnet-4-20250514',
    openai: 'gpt-4o-mini',
    'azure-openai': 'gpt-4o-mini',
};

const PROVIDER_FACTORY = {
    claude: createClaudeProvider,
    openai: createOpenAIProvider,
    'azure-openai': createAzureProvider,
};

/**
 * Resolves and returns the appropriate LLM provider for a given user.
 * Falls back to Claude with the platform key if the user has no saved settings.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {Promise<{ name: string, classifyIntent: Function, generateExplanation: Function }>}
 */
export async function getProvider(userId) {
    // 1. Load settings (lean for read, full doc only if decryption needed)
    const settingsLean = await UserAISettings.findOne({ userId }).lean();

    const settings = settingsLean ?? { provider: 'claude', model: null, useOwnKey: false };

    // 2. Resolve provider name
    const providerName = settings.provider || 'claude';

    // 3. Resolve model
    const model = settings.model || DEFAULT_MODELS[providerName];

    // 4. Resolve API key
    let apiKey;
    if (settings.useOwnKey && settings.encryptedApiKey) {
        // Need full Mongoose doc so instance methods (getApiKey) are available
        const doc = await UserAISettings.findOne({ userId });
        apiKey = doc.getApiKey();
    } else {
        apiKey = PLATFORM_KEYS[providerName];
    }

    if (!apiKey) {
        throw new Error(`No API key configured for provider: ${providerName}`);
    }

    // 5. Look up factory
    const factory = PROVIDER_FACTORY[providerName];
    if (!factory) {
        throw new Error(`Unknown provider: ${providerName}`);
    }

    // 6. Create and return provider instance
    return factory({
        apiKey,
        model,
        azureEndpoint: settings.azureEndpoint,
        azureDeploymentName: settings.azureDeploymentName,
    });
}
