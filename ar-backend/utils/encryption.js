/**
 * AES-256-GCM encryption utility for storing user API keys.
 *
 * Requires ENCRYPTION_KEY env var — a 64-character hex string (32 bytes).
 * Generate with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Encrypted format: "<iv_hex>:<ciphertext_hex>:<authTag_hex>"
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

if (!process.env.ENCRYPTION_KEY) {
    throw new Error(
        'ENCRYPTION_KEY environment variable is not set. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
}

const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

if (KEY.length !== 32) {
    throw new Error(
        'ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
}

/**
 * Encrypts a plaintext string.
 * @param {string} text
 * @returns {string} "<iv_hex>:<ciphertext_hex>:<authTag_hex>"
 */
export function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`;
}

/**
 * Decrypts a string produced by encrypt().
 * @param {string} data "<iv_hex>:<ciphertext_hex>:<authTag_hex>"
 * @returns {string} original plaintext
 */
export function decrypt(data) {
    const [ivHex, ciphertextHex, authTagHex] = data.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
}
