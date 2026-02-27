import mongoose from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption.js';

const userAISettingsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true,
    },
    provider: {
        type: String,
        enum: ['claude', 'openai', 'azure-openai'],
        default: 'claude',
    },
    model: {
        type: String,
        default: null,
    },
    useOwnKey: {
        type: Boolean,
        default: false,
    },
    encryptedApiKey: {
        type: String,
        default: null,
    },
    azureEndpoint: {
        type: String,
        default: null,
    },
    azureDeploymentName: {
        type: String,
        default: null,
    },
    monthlyTokensUsed: {
        type: Number,
        default: 0,
    },
    lastResetDate: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

/**
 * Returns the decrypted API key, or null if none is stored.
 */
userAISettingsSchema.methods.getApiKey = function () {
    if (!this.encryptedApiKey) return null;
    return decrypt(this.encryptedApiKey);
};

/**
 * Encrypts and stores the given API key, or clears it if null/undefined.
 * @param {string|null|undefined} key
 */
userAISettingsSchema.methods.setApiKey = function (key) {
    if (key == null) {
        this.encryptedApiKey = null;
    } else {
        this.encryptedApiKey = encrypt(key);
    }
};

export default mongoose.model('UserAISettings', userAISettingsSchema);
