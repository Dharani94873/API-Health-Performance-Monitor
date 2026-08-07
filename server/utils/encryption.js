/**
 * Encryption utility for sensitive API credentials
 * Uses AES-256-GCM (authenticated encryption)
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Get encryption key from env, padded/truncated to 32 bytes
 */
const getKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('FATAL: ENCRYPTION_KEY environment variable is not set. Refusing to encrypt with fallback key.');
  }
  return Buffer.from(key.padEnd(KEY_LENGTH, '0').slice(0, KEY_LENGTH));
};

/**
 * Encrypt a plaintext string
 * @param {string} text
 * @returns {string} iv:authTag:encrypted (hex)
 */
const encrypt = (text) => {
  if (!text) return null;
  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (err) {
    console.error('Encryption error:', err.message);
    return null;
  }
};

/**
 * Decrypt an encrypted string
 * @param {string} encryptedText iv:authTag:encrypted (hex)
 * @returns {string} plaintext
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  try {
    const [ivHex, authTagHex, encryptedHex] = encryptedText.split(':');
    if (!ivHex || !authTagHex || !encryptedHex) return null;
    const key = getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('Decryption error:', err.message);
    return null;
  }
};

module.exports = { encrypt, decrypt };
