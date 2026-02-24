import crypto from 'node:crypto';
import { env } from '../../config/env.config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

// Ensure key is 32 bytes
const ENCRYPTION_KEY = Buffer.from(env.ENCRYPTION_KEY, 'utf-8').slice(0, 32);

/**
 * Encrypts a string using AES-256-GCM
 * @param text The plain text string to encrypt
 * @returns A base64 string combining IV + Auth Tag + Ciphertext
 */
export function encrypt(text: string): string {
    if (!text) return text;

    // Generate a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get the auth tag
    const authTag = cipher.getAuthTag();

    // Combine IV, Auth Tag, and Encrypted Text into a single string
    // Format: iv:authTag:encryptedText (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypts a string previously encrypted with encrypt()
 * @param encryptedData The formatted base64 string (iv:authTag:ciphertext)
 * @returns The original plain text string
 */
export function decrypt(encryptedData: string): string {
    if (!encryptedData) return encryptedData;

    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) throw new Error('Invalid encryption format');

        const iv = Buffer.from(parts[0], 'base64');
        const authTag = Buffer.from(parts[1], 'base64');
        const encryptedText = Buffer.from(parts[2], 'base64');

        // Create decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);

        // Decrypt the text
        let decrypted = decipher.update(encryptedText, undefined, 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Failed to decrypt data');
    }
}
