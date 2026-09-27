// lib/crypto.js — AES-256-GCM Encryption for sensitive credentials (SEC-022)
'use strict';
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM
const TAG_LENGTH = 16;

function getKey() {
  const secret = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!secret) {
    // If not configured, derive from JWT_SECRET or throw in production
    const fallback = process.env.JWT_SECRET;
    if (!fallback) {
      throw new Error('FATAL: CREDENTIALS_ENCRYPTION_KEY or JWT_SECRET is required for credential encryption');
    }
    return crypto.createHash('sha256').update(fallback).digest();
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Output format: base64(iv + authTag + ciphertext)
 * @param {string} text
 * @returns {string}
 */
function encrypt(text) {
  if (!text) return '';
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * @param {string} encryptedBase64
 * @returns {string}
 */
function decrypt(encryptedBase64) {
  if (!encryptedBase64) return '';
  try {
    const key = getKey();
    const data = Buffer.from(encryptedBase64, 'base64');
    if (data.length < IV_LENGTH + TAG_LENGTH) return '';

    const iv = data.subarray(0, IV_LENGTH);
    const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return '';
  }
}

module.exports = {
  encrypt,
  decrypt,
};
