import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import UserAISettings from '../models/UserAISettings.js';

const router = express.Router();

const VALID_PROVIDERS = ['claude', 'openai', 'azure-openai'];

/**
 * GET /api/ai/settings
 * Returns the current user's AI provider preferences.
 * Never exposes the encrypted key — only a boolean hasApiKey.
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const settings = await UserAISettings.findOne({ userId: req.userId }).lean();

        if (!settings) {
            return res.json({
                provider: 'claude',
                model: null,
                useOwnKey: false,
                hasApiKey: false,
            });
        }

        return res.json({
            provider: settings.provider,
            model: settings.model,
            useOwnKey: settings.useOwnKey,
            hasApiKey: !!settings.encryptedApiKey,
        });
    } catch (err) {
        console.error('GET /ai/settings error:', err);
        res.status(500).json({ success: false, error: 'An internal error occurred. Please try again.' });
    }
});

/**
 * PUT /api/ai/settings
 * Creates or updates the current user's AI provider preferences.
 * Optionally stores an encrypted API key if apiKey is provided.
 */
router.put('/', authMiddleware, async (req, res) => {
    try {
        const { provider, model, useOwnKey, apiKey, azureEndpoint, azureDeploymentName } = req.body;

        if (!VALID_PROVIDERS.includes(provider)) {
            return res.status(400).json({
                success: false,
                error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`,
            });
        }

        if (provider === 'azure-openai' && useOwnKey === true) {
            if (!azureEndpoint || !azureDeploymentName) {
                return res.status(400).json({
                    success: false,
                    error: 'azureEndpoint and azureDeploymentName are required when using Azure OpenAI with your own key.',
                });
            }
        }

        const update = {
            provider,
            model: model || null,
            useOwnKey: !!useOwnKey,
            azureEndpoint: azureEndpoint || null,
            azureDeploymentName: azureDeploymentName || null,
        };

        let doc = await UserAISettings.findOneAndUpdate(
            { userId: req.userId },
            update,
            { upsert: true, new: true }
        );

        if (apiKey && typeof apiKey === 'string' && apiKey.length > 0) {
            doc.setApiKey(apiKey);
            await doc.save();
        } else if (!useOwnKey) {
            doc.setApiKey(null);
            await doc.save();
        }

        return res.json({ success: true, provider: doc.provider, model: doc.model });
    } catch (err) {
        console.error('PUT /ai/settings error:', err);
        res.status(500).json({ success: false, error: 'An internal error occurred. Please try again.' });
    }
});

/**
 * DELETE /api/ai/settings/key
 * Removes the stored API key and disables BYOK for the current user.
 */
router.delete('/key', authMiddleware, async (req, res) => {
    try {
        const doc = await UserAISettings.findOne({ userId: req.userId });

        if (!doc) {
            return res.json({ success: true });
        }

        doc.setApiKey(null);
        doc.useOwnKey = false;
        await doc.save();

        return res.json({ success: true, message: 'API key removed' });
    } catch (err) {
        console.error('DELETE /ai/settings/key error:', err);
        res.status(500).json({ success: false, error: 'An internal error occurred. Please try again.' });
    }
});

export default router;
